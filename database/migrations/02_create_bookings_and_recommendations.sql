-- ==============================================================================
-- LocalLens Migration 02: Bookings, Recommendations & Guest Privacy Policies
-- Database: PostgreSQL + PostGIS
-- ==============================================================================

-- 1. Create Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    provider_id VARCHAR(100) NOT NULL,
    experience_id VARCHAR(100) NOT NULL,
    traveler_id VARCHAR(100),
    guest_name VARCHAR(150) NOT NULL,
    guest_email VARCHAR(150),
    guest_phone VARCHAR(50),
    guest_avatar VARCHAR(500),
    experience_name VARCHAR(255) NOT NULL,
    meeting_point VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    city VARCHAR(100) DEFAULT 'Mumbai',
    booking_date DATE NOT NULL,
    booking_time VARCHAR(50) NOT NULL,
    slots INT NOT NULL DEFAULT 1,
    total_amount_inr NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Confirmed', -- 'Confirmed', 'Pending', 'Checked-in', 'Cancelled', 'Driver En Route', 'Driver Arrived'
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Paid',
    special_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for Performance & Spatial Searches
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_coordinates ON public.bookings(latitude, longitude);

-- 3. Row Level Security Policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Providers can only view their own bookings
CREATE POLICY "Providers can view own bookings"
    ON public.bookings
    FOR SELECT
    USING (
        provider_id = auth.uid()::text 
        OR provider_id = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR auth.role() = 'service_role'
    );

-- Policy: Providers can update status of their own bookings
CREATE POLICY "Providers can update own bookings"
    ON public.bookings
    FOR UPDATE
    USING (
        provider_id = auth.uid()::text 
        OR provider_id = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR auth.role() = 'service_role'
    );

-- 4. Enable Supabase Realtime for Bookings Table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
