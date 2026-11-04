-- Migration 03: Add language preference column to profiles table
-- Supports: 'en' (English), 'hi' (Hindi), 'mr' (Marathi), 'bn' (Bengali)

ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';

-- Add check constraint for supported languages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_language_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_language_check 
    CHECK (language IN ('en', 'hi', 'mr', 'bn'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.language IS 'User preferred UI language: en (English), hi (Hindi), mr (Marathi), bn (Bengali)';
