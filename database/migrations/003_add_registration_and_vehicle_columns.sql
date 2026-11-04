-- ==============================================================================
-- LocalLens Database Migration 003
-- Purpose: Add missing registration status, vehicle color, city & DL fields to `riders` table
-- ==============================================================================

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS is_registration_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vehicle_color            TEXT DEFAULT 'White',
  ADD COLUMN IF NOT EXISTS city                     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS license_number           TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS license_verification_status TEXT DEFAULT 'not_uploaded',
  ADD COLUMN IF NOT EXISTS license_verification_method TEXT DEFAULT 'ai_multimodal',
  ADD COLUMN IF NOT EXISTS license_verified_at      TIMESTAMPTZ;

-- Comments explaining added columns
COMMENT ON COLUMN public.riders.is_registration_completed IS 'Flag indicating whether driver completed 2-step registration & DL verification';
COMMENT ON COLUMN public.riders.vehicle_color IS 'Color of driver vehicle';
COMMENT ON COLUMN public.riders.city IS 'Operating city of driver';
COMMENT ON COLUMN public.riders.license_number IS 'Driving licence number';
