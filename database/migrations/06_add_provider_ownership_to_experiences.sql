-- ==============================================================================
-- LocalLens Migration 06: Add Provider Ownership Columns & Indexes to 'experience'
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Add dedicated provider ownership columns
ALTER TABLE public.experience ADD COLUMN IF NOT EXISTS provider_id TEXT;
ALTER TABLE public.experience ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.experience ADD COLUMN IF NOT EXISTS provider_email TEXT;

-- 2. Performance Indexes for instant provider-specific queries
CREATE INDEX IF NOT EXISTS idx_experience_provider_id ON public.experience(provider_id);
CREATE INDEX IF NOT EXISTS idx_experience_user_id ON public.experience(user_id);
CREATE INDEX IF NOT EXISTS idx_experience_provider_email ON public.experience(provider_email);

-- 3. Recreate the experiences (plural) view so it includes the new columns
CREATE OR REPLACE VIEW public.experiences AS
SELECT * FROM public.experience;

-- 4. Grant full permissions to anon and authenticated roles
GRANT ALL ON TABLE public.experience TO anon, authenticated;
GRANT ALL ON TABLE public.experiences TO anon, authenticated;
