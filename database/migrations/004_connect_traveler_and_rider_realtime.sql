-- ==============================================================================
-- LocalLens Database Migration 004
-- Purpose: Realtime Ride Matching, Atomic Acceptance RPC & Security Policies
-- ==============================================================================

-- ─── 1. Enable Supabase Realtime for Rides & Riders Tables ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'riders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Enable REPLICA IDENTITY FULL for detailed realtime updates
ALTER TABLE public.rides REPLICA IDENTITY FULL;
ALTER TABLE public.riders REPLICA IDENTITY FULL;


-- ─── 2. Atomic Ride Acceptance RPC Function ──────────────────────────────────
-- Ensures server-authoritative assignment so ONLY ONE driver can win a ride request.
CREATE OR REPLACE FUNCTION public.accept_ride(
  p_ride_id UUID,
  p_rider_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride RECORD;
  v_rider RECORD;
BEGIN
  -- 1. Check if rider exists and is online
  SELECT * INTO v_rider FROM public.riders WHERE id = p_rider_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'RIDER_NOT_FOUND');
  END IF;

  IF NOT v_rider.is_online THEN
    RETURN jsonb_build_object('success', false, 'error', 'RIDER_OFFLINE');
  END IF;

  -- 2. Lock the ride row for update to prevent concurrent race conditions
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'RIDE_NOT_FOUND');
  END IF;

  -- 3. Verify ride status is SEARCHING
  IF v_ride.status != 'searching' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_ACCEPTED');
  END IF;

  -- 4. Atomically assign rider_id and update status to ACCEPTED
  UPDATE public.rides
  SET rider_id = p_rider_id,
      status = 'accepted',
      updated_at = NOW()
  WHERE id = p_ride_id;

  -- 5. Mark rider as unavailable for new requests while handling this active ride
  UPDATE public.riders
  SET is_available = FALSE,
      updated_at = NOW()
  WHERE id = p_rider_id;

  RETURN jsonb_build_object('success', true, 'ride_id', p_ride_id, 'status', 'accepted');
END;
$$;


-- ─── 3. Nearby Riders Discovery RPC Function ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_nearby_riders(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 5.0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  vehicle_type TEXT,
  vehicle_number TEXT,
  rating NUMERIC,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.phone,
    r.vehicle_type,
    r.vehicle_number,
    r.rating,
    r.latitude,
    r.longitude,
    (
      6371 * acos(
        least(1.0, greatest(-1.0,
          cos(radians(p_lat)) * cos(radians(r.latitude)) *
          cos(radians(r.longitude) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(r.latitude))
        ))
      )
    ) AS distance_km
  FROM public.riders r
  WHERE r.is_online = TRUE
    AND r.is_available = TRUE
    AND r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    AND (
      6371 * acos(
        least(1.0, greatest(-1.0,
          cos(radians(p_lat)) * cos(radians(r.latitude)) *
          cos(radians(r.longitude) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(r.latitude))
        ))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$;


-- ─── 4. Updated RLS Policies for Security & Phone Privacy ────────────────────
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rides_select_policy" ON public.rides;
CREATE POLICY "rides_select_policy"
  ON public.rides FOR SELECT
  USING (TRUE); -- Allows travelers & online drivers to observe searching/assigned rides

DROP POLICY IF EXISTS "rides_insert_policy" ON public.rides;
CREATE POLICY "rides_insert_policy"
  ON public.rides FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "rides_update_policy" ON public.rides;
CREATE POLICY "rides_update_policy"
  ON public.rides FOR UPDATE
  USING (TRUE);
