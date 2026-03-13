-- Make original_caregiver_id nullable to support non-callout vacant shifts
-- (e.g. manually removed caregivers, new unassigned shifts)
ALTER TABLE auto_coverage_sessions ALTER COLUMN original_caregiver_id DROP NOT NULL;
