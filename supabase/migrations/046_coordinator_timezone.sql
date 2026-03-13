-- ============================================================================
-- 046: Add timezone to coordinator_config
-- Ensures the AI coordinator returns dates in the agency's local timezone
-- ============================================================================

ALTER TABLE coordinator_config
  ADD COLUMN IF NOT EXISTS agency_timezone TEXT NOT NULL DEFAULT 'America/New_York';

COMMENT ON COLUMN coordinator_config.agency_timezone
  IS 'IANA timezone identifier (e.g. America/New_York). Used by the current-date tool to return accurate local dates.';
