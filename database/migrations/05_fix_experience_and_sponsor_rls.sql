-- ==============================================================================
-- LocalLens: Migration 05 - Fix RLS Policies for 'experience' and 'sponsor_campaigns'
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/mvokdnefwukzouuttsvz/sql)
-- ==============================================================================

-- 1. FIX SPONSOR_CAMPAIGNS RLS POLICIES
-- Removes 'permission denied for table users' caused by querying auth.users inside RLS
ALTER TABLE public.sponsor_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public travelers can read active paid campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Providers can read own campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Providers can insert own campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Service role manages campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Public and providers can read campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Allow insert sponsor campaigns" ON public.sponsor_campaigns;
DROP POLICY IF EXISTS "Allow update sponsor campaigns" ON public.sponsor_campaigns;

CREATE POLICY "Public and providers can read campaigns"
    ON public.sponsor_campaigns
    FOR SELECT
    USING (true);

CREATE POLICY "Allow insert sponsor campaigns"
    ON public.sponsor_campaigns
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update sponsor campaigns"
    ON public.sponsor_campaigns
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 2. FIX EXPERIENCE TABLE RLS POLICIES
-- Allows reading and inserting experiences without 'new row violates row-level security policy'
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on experience" ON public.experience;
DROP POLICY IF EXISTS "Allow insert on experience" ON public.experience;
DROP POLICY IF EXISTS "Allow update on experience" ON public.experience;
DROP POLICY IF EXISTS "Public read experiences" ON public.experience;
DROP POLICY IF EXISTS "Providers insert experiences" ON public.experience;

CREATE POLICY "Allow select on experience"
    ON public.experience
    FOR SELECT
    USING (true);

CREATE POLICY "Allow insert on experience"
    ON public.experience
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update on experience"
    ON public.experience
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
