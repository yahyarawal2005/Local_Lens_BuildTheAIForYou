-- ==============================================================================
-- LocalLens Database Migration 002
-- Purpose: Add extended Driving Licence AI verification fields to `riders` table
-- ==============================================================================

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS license_holder_name       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS license_date_of_birth     DATE,
  ADD COLUMN IF NOT EXISTS license_issue_date        DATE,
  ADD COLUMN IF NOT EXISTS license_valid_until       DATE,
  ADD COLUMN IF NOT EXISTS license_vehicle_classes   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS license_confidence_score  NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS license_verification_reason TEXT DEFAULT '';

-- Add comment explaining fields
COMMENT ON COLUMN public.riders.license_holder_name IS 'Extracted name on Driving Licence';
COMMENT ON COLUMN public.riders.license_date_of_birth IS 'Extracted date of birth of licence holder';
COMMENT ON COLUMN public.riders.license_issue_date IS 'Licence issue date';
COMMENT ON COLUMN public.riders.license_valid_until IS 'Licence expiry or valid until date';
COMMENT ON COLUMN public.riders.license_vehicle_classes IS 'List of vehicle classes authorized on licence (e.g., LMV, MCWG)';
COMMENT ON COLUMN public.riders.license_confidence_score IS 'AI & deterministic verification confidence score (0-100%)';
COMMENT ON COLUMN public.riders.license_verification_reason IS 'Summary explanation for VERIFIED, REVIEW, or REJECTED status';
