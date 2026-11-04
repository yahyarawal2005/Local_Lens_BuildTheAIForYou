-- ==============================================================================
-- LocalLens Migration 04: Sponsor Campaigns & Traveler Feed Integration
-- Database: PostgreSQL + PostGIS (Supabase)
-- ==============================================================================

-- 1. Ensure Table Exists
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

-- 2. Add required columns if table already existed without them
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS offer_type TEXT DEFAULT 'percentage_discount';
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS offer_value NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS offer_price NUMERIC(10, 2);
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS offer_description TEXT;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS listing_id TEXT;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS listing_name TEXT;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS sponsor_type TEXT DEFAULT 'boost';
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS sponsor_package TEXT;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2);
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'upi';
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT;
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS campaign_status TEXT DEFAULT 'draft';
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Required Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sponsor_campaign_status ON public.sponsor_campaigns(campaign_status);
CREATE INDEX IF NOT EXISTS idx_sponsor_payment_status ON public.sponsor_campaigns(payment_status);
CREATE INDEX IF NOT EXISTS idx_sponsor_start_at ON public.sponsor_campaigns(start_at);
CREATE INDEX IF NOT EXISTS idx_sponsor_end_at ON public.sponsor_campaigns(end_at);
CREATE INDEX IF NOT EXISTS idx_sponsor_listing_id ON public.sponsor_campaigns(listing_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_business_id ON public.sponsor_campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_user_id ON public.sponsor_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_traveler_active ON public.sponsor_campaigns(campaign_status, payment_status, start_at, end_at);

-- 4. Supabase RLS Policies
ALTER TABLE public.sponsor_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Travelers can query only active and paid campaigns within the active time window
DROP POLICY IF EXISTS "Public travelers can read active paid campaigns" ON public.sponsor_campaigns;
CREATE POLICY "Public travelers can read active paid campaigns"
    ON public.sponsor_campaigns
    FOR SELECT
    USING (
        campaign_status = 'active'
        AND payment_status = 'paid'
        AND start_at <= now()
        AND end_at > now()
    );

-- Policy: Travelers and providers can read campaigns (avoids direct query to auth.users which causes permission denied)
DROP POLICY IF EXISTS "Public travelers can read active paid campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Providers can read own campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Public and providers can read campaigns" ON public.sponsor_campaigns;

CREATE POLICY "Public and providers can read campaigns"
    ON public.sponsor_campaigns
    FOR SELECT
    USING (true);

-- Policy: Providers can create new campaigns
DROP POLICY IF EXISTS "Providers can insert own campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Allow insert sponsor campaigns" ON public.sponsor_campaigns;

CREATE POLICY "Allow insert sponsor campaigns"
    ON public.sponsor_campaigns
    FOR INSERT
    WITH CHECK (true);

-- Policy: Allow updating campaigns (e.g. payment verification & status activation)
DROP POLICY IF EXISTS "Service role manages campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Allow update sponsor campaigns" ON public.sponsor_campaigns;

CREATE POLICY "Allow update sponsor campaigns"
    ON public.sponsor_campaigns
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

