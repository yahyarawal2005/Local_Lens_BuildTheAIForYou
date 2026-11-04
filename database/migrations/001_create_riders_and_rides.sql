-- ==============================================================================
-- LocalLens Database Migration
-- Purpose: Separate tables for Riders (Drivers) and Rides (Bookings)
-- 1. `riders` table: Stores driver profile, vehicle details, live location & status
-- 2. `rides` table: Stores passenger ride requests, pickup/drop coordinates, fare & trip lifecycle
-- ==============================================================================

-- ─── 1. RIDERS TABLE (Driver Profiles & Live GPS) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.riders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  profile_image_url TEXT DEFAULT '',
  vehicle_type      TEXT NOT NULL DEFAULT 'Sedan',
  vehicle_number    TEXT NOT NULL DEFAULT '',
  vehicle_model     TEXT NOT NULL DEFAULT '',
  rating            NUMERIC(3,2) NOT NULL DEFAULT 4.90,
  total_rides       INTEGER NOT NULL DEFAULT 0,
  today_earnings    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  today_rides       INTEGER NOT NULL DEFAULT 0,
  is_online         BOOLEAN NOT NULL DEFAULT FALSE,
  is_available      BOOLEAN NOT NULL DEFAULT FALSE,
  latitude          DOUBLE PRECISION DEFAULT 19.0760,
  longitude         DOUBLE PRECISION DEFAULT 72.8777,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_riders_user_id ON public.riders(user_id);
CREATE INDEX IF NOT EXISTS idx_riders_online_available ON public.riders(is_online, is_available)
  WHERE is_online = TRUE AND is_available = TRUE;

-- Trigger to auto-update updated_at on riders
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_riders_updated_at ON public.riders;
CREATE TRIGGER trg_riders_updated_at
  BEFORE UPDATE ON public.riders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS) on riders
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for riders
DROP POLICY IF EXISTS "riders_select_policy" ON public.riders;
CREATE POLICY "riders_select_policy"
  ON public.riders FOR SELECT
  USING (TRUE); -- Allow reading driver profile & live location for ride matching

DROP POLICY IF EXISTS "riders_insert_policy" ON public.riders;
CREATE POLICY "riders_insert_policy"
  ON public.riders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "riders_update_policy" ON public.riders;
CREATE POLICY "riders_update_policy"
  ON public.riders FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);


-- ─── 2. RIDES TABLE (Ride Requests & Booking Lifecycle) ──────────────────────
CREATE TABLE IF NOT EXISTS public.rides (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  passenger_name      TEXT NOT NULL DEFAULT 'Traveler',
  passenger_rating    NUMERIC(3,2) DEFAULT 4.80,
  rider_id            UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  pickup_lat          DOUBLE PRECISION NOT NULL,
  pickup_lng          DOUBLE PRECISION NOT NULL,
  pickup_address      TEXT NOT NULL DEFAULT '',
  destination_lat     DOUBLE PRECISION NOT NULL,
  destination_lng     DOUBLE PRECISION NOT NULL,
  destination_address TEXT NOT NULL DEFAULT '',
  fare                NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  pickup_distance     NUMERIC(6,2) DEFAULT 0.00,
  trip_distance       NUMERIC(6,2) DEFAULT 0.00,
  eta_minutes         INTEGER DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'searching'
    CHECK (status IN ('searching','accepted','arrived','started','completed','cancelled','expired')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  duration_minutes    INTEGER
);

-- Indexes for fast ride lookups
CREATE INDEX IF NOT EXISTS idx_rides_rider_id ON public.rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_passenger_id ON public.rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);

-- Trigger to auto-update updated_at on rides
DROP TRIGGER IF EXISTS trg_rides_updated_at ON public.rides;
CREATE TRIGGER trg_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS) on rides
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rides
DROP POLICY IF EXISTS "rides_select_policy" ON public.rides;
CREATE POLICY "rides_select_policy"
  ON public.rides FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "rides_insert_policy" ON public.rides;
CREATE POLICY "rides_insert_policy"
  ON public.rides FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "rides_update_policy" ON public.rides;
CREATE POLICY "rides_update_policy"
  ON public.rides FOR UPDATE
  USING (TRUE);
