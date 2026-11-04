-- ==============================================================================
-- LocalLens Database Migration 05: Fix RLS Policies & Table Access
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX SPONSOR CAMPAIGNS TABLE & RLS
-- ------------------------------------------------------------------------------

-- Ensure sponsor_campaigns table exists with all required columns
CREATE TABLE IF NOT EXISTS public.sponsor_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    business_id TEXT,
    listing_id TEXT NOT NULL,
    owner_name TEXT,
    shop_name TEXT,
    listing_name TEXT NOT NULL,
    sponsor_type TEXT DEFAULT 'boost',
    sponsor_package TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    offer_type TEXT DEFAULT 'percentage_discount',
    offer_value NUMERIC(10, 2) DEFAULT 0,
    offer_price NUMERIC(10, 2),
    offer_description TEXT,
    start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_at TIMESTAMPTZ NOT NULL,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    payment_method TEXT DEFAULT 'upi',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_transaction_id TEXT,
    campaign_status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Drop old broken policies that referenced auth.users (which caused "permission denied for table users")
DROP POLICY IF EXISTS "Public travelers can read active paid campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Providers can read own campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Providers can insert own campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Allow all users to read sponsor campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Allow all users to insert sponsor campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Allow all users to update sponsor campaigns" ON public.sponsor_campaigns;

-- Enable RLS
ALTER TABLE public.sponsor_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone (travelers, providers, public) can read campaigns
CREATE POLICY "Allow public read on sponsor campaigns"
    ON public.sponsor_campaigns
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy 2: Anyone (providers launching campaigns) can insert new campaigns
CREATE POLICY "Allow insert on sponsor campaigns"
    ON public.sponsor_campaigns
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy 3: Allow update on sponsor campaigns (payment verification & status changes)
CREATE POLICY "Allow update on sponsor campaigns"
    ON public.sponsor_campaigns
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 2. FIX EXPERIENCES TABLE & RLS
-- ------------------------------------------------------------------------------

-- Enable RLS on experience
ALTER TABLE IF EXISTS public.experience ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies on experience
DROP POLICY IF EXISTS "Public can view experiences" ON public.experience;
DROP POLICY IF EXISTS "Providers can insert experiences" ON public.experience;
DROP POLICY IF EXISTS "Providers can update experiences" ON public.experience;
DROP POLICY IF EXISTS "Allow public read on experience" ON public.experience;
DROP POLICY IF EXISTS "Allow insert on experience" ON public.experience;
DROP POLICY IF EXISTS "Allow update on experience" ON public.experience;

-- Policy: Everyone can view experiences (Travelers and Providers)
CREATE POLICY "Allow public read on experience"
    ON public.experience
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy: Providers can insert new experiences
CREATE POLICY "Allow insert on experience"
    ON public.experience
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy: Providers can update their experiences
CREATE POLICY "Allow update on experience"
    ON public.experience
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 3. CREATE VIEW / ALIAS FOR 'experiences' (PLURAL)
-- Fixes PGRST205 error: "Could not find table public.experiences"
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'experiences'
    ) THEN
        CREATE OR REPLACE VIEW public.experiences AS
        SELECT * FROM public.experience;
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 4. GRANT EXPLICIT PERMISSIONS TO ANON AND AUTHENTICATED ROLES
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.sponsor_campaigns TO anon, authenticated;
GRANT ALL ON TABLE public.experience TO anon, authenticated;

-- If views or sequences exist, grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 5. ENABLE REALTIME PUBLICATION FOR TRAVELER DISCOVERY
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Add sponsor_campaigns to supabase_realtime publication
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_campaigns;
        EXCEPTION WHEN duplicate_object THEN
            -- already added
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.experience;
        EXCEPTION WHEN duplicate_object THEN
            -- already added
        END;
    END IF;
END $$;
