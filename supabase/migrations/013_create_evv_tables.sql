-- =============================================================================
-- EVV (Electronic Visit Verification) Module
-- =============================================================================
-- Comprehensive schema for tracking caregiver visits, clock-in/out times,
-- GPS verification, exceptions, manual corrections, and audit trails.
-- References existing employees (caregivers) and clients tables.
-- =============================================================================

-- =============================================================================
-- Lookup: Service Types
-- =============================================================================

CREATE TABLE IF NOT EXISTS evv_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_service_types_is_active ON evv_service_types (is_active);

COMMENT ON TABLE evv_service_types IS 'Lookup table for EVV service types (e.g., Personal Care, Companion, Respite).';

-- Seed data
INSERT INTO evv_service_types (name) VALUES
  ('Personal Care'),
  ('Companion'),
  ('Respite Care'),
  ('Skilled Nursing'),
  ('Medication Management')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- Lookup: Funding Sources
-- =============================================================================

CREATE TABLE IF NOT EXISTS evv_funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_funding_sources_is_active ON evv_funding_sources (is_active);

COMMENT ON TABLE evv_funding_sources IS 'Lookup table for EVV funding sources (e.g., Medicaid, HCBS, Private Pay).';

-- Seed data
INSERT INTO evv_funding_sources (name) VALUES
  ('Medicaid'),
  ('HCBS'),
  ('Private Pay'),
  ('Regional Center'),
  ('IDD')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- Core: EVV Visits
-- =============================================================================

CREATE TABLE IF NOT EXISTS evv_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES evv_service_types (id),
  funding_source_id UUID NOT NULL REFERENCES evv_funding_sources (id),
  
  -- Scheduled shift times (from scheduling module)
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  
  -- Actual clock-in/out (nullable if missed)
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  
  -- Time calculations
  break_minutes INT NOT NULL DEFAULT 0,
  overtime_minutes INT NOT NULL DEFAULT 0,
  
  -- GPS verification
  gps_status TEXT NOT NULL DEFAULT 'missing' CHECK (gps_status IN ('verified', 'outside', 'missing')),
  gps_distance_meters INT, -- Distance from client address
  
  -- Status tracking
  arrival_status TEXT NOT NULL DEFAULT 'on-time' CHECK (arrival_status IN ('on-time', 'late', 'no-show')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'exception')),
  timesheet_status TEXT NOT NULL DEFAULT 'pending' CHECK (timesheet_status IN ('pending', 'approved', 'flagged')),
  
  -- Care documentation
  care_notes_completed BOOLEAN NOT NULL DEFAULT false,
  care_notes_text TEXT,
  signature_captured BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_visits_employee_id ON evv_visits (employee_id);
CREATE INDEX IF NOT EXISTS idx_evv_visits_client_id ON evv_visits (client_id);
CREATE INDEX IF NOT EXISTS idx_evv_visits_scheduled_start ON evv_visits (scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_evv_visits_verification_status ON evv_visits (verification_status);
CREATE INDEX IF NOT EXISTS idx_evv_visits_timesheet_status ON evv_visits (timesheet_status);
CREATE INDEX IF NOT EXISTS idx_evv_visits_service_type_id ON evv_visits (service_type_id);
CREATE INDEX IF NOT EXISTS idx_evv_visits_funding_source_id ON evv_visits (funding_source_id);

COMMENT ON TABLE evv_visits IS 'Core EVV visit records linking employees (caregivers) to clients with clock times, GPS, and verification status.';
COMMENT ON COLUMN evv_visits.gps_status IS 'verified | outside | missing';
COMMENT ON COLUMN evv_visits.arrival_status IS 'on-time | late | no-show';
COMMENT ON COLUMN evv_visits.verification_status IS 'pending | verified | exception';
COMMENT ON COLUMN evv_visits.timesheet_status IS 'pending | approved | flagged';
COMMENT ON COLUMN evv_visits.signature_captured IS 'Client signature captured (EVV compliance field, not shown in UI yet)';

-- =============================================================================
-- GPS Captures: Clock-in/out locations
-- =============================================================================

CREATE TABLE IF NOT EXISTS evv_gps_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES evv_visits (id) ON DELETE CASCADE,
  capture_type TEXT NOT NULL CHECK (capture_type IN ('clock_in', 'clock_out')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_meters DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_gps_captures_visit_id ON evv_gps_captures (visit_id);
CREATE INDEX IF NOT EXISTS idx_evv_gps_captures_capture_type ON evv_gps_captures (capture_type);

COMMENT ON TABLE evv_gps_captures IS 'GPS coordinates captured at clock-in and clock-out (immutable, set by caregiver device).';

-- =============================================================================
-- Exceptions: Visit issues/violations
-- =============================================================================

CREATE TABLE IF NOT EXISTS evv_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES evv_visits (id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g. "Late Clock-In", "Geofence Breach", "No-Show"
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
  description TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES employees (id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_exceptions_visit_id ON evv_exceptions (visit_id);
CREATE INDEX IF NOT EXISTS idx_evv_exceptions_is_resolved ON evv_exceptions (is_resolved);
CREATE INDEX IF NOT EXISTS idx_evv_exceptions_severity ON evv_exceptions (severity);

COMMENT ON TABLE evv_exceptions IS 'Visit exceptions (late, no-show, geofence breach, missing signature, missing notes).';
COMMENT ON COLUMN evv_exceptions.severity IS 'warning | error | critical';

-- =============================================================================
-- Corrections: Manual clock-in/out edits by admin
-- =============================================================================

CREATE TABLE IF NOT EXISTS evv_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES evv_visits (id) ON DELETE CASCADE,
  field_corrected TEXT NOT NULL CHECK (field_corrected IN ('clock_in', 'clock_out')),
  original_value TIMESTAMPTZ, -- NULL if was missing
  new_value TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  corrected_by UUID NOT NULL REFERENCES employees (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_corrections_visit_id ON evv_corrections (visit_id);
CREATE INDEX IF NOT EXISTS idx_evv_corrections_created_at ON evv_corrections (created_at DESC);

COMMENT ON TABLE evv_corrections IS 'Audit trail of manual clock-in/out edits made by admin with reason.';

-- =============================================================================
-- Audit Log: Full activity trail per visit
-- =============================================================================

CREATE TABLE IF NOT EXISTS evv_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES evv_visits (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('create', 'clock_in', 'clock_out', 'edit', 'resolve', 'approve', 'flag', 'override')),
  label TEXT NOT NULL,
  detail TEXT,
  actor_id UUID REFERENCES employees (id), -- NULL for system events
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evv_audit_log_visit_id ON evv_audit_log (visit_id);
CREATE INDEX IF NOT EXISTS idx_evv_audit_log_created_at ON evv_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evv_audit_log_event_type ON evv_audit_log (event_type);

COMMENT ON TABLE evv_audit_log IS 'Full audit trail for every visit action (clock-in, corrections, resolutions, approvals).';

-- =============================================================================
-- Settings: Org-level EVV configuration (single row)
-- =============================================================================

CREATE TABLE IF NOT EXISTS evv_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_radius_meters INT NOT NULL DEFAULT 200,
  allow_early_clock_in BOOLEAN NOT NULL DEFAULT true,
  early_clock_in_minutes INT NOT NULL DEFAULT 10,
  grace_period_minutes INT NOT NULL DEFAULT 5,
  late_arrival_threshold_minutes INT NOT NULL DEFAULT 15,
  require_shift_to_exist BOOLEAN NOT NULL DEFAULT true,
  manual_edits_permission TEXT NOT NULL DEFAULT 'both' CHECK (manual_edits_permission IN ('admin', 'manager', 'both')),
  alert_late_clock_in BOOLEAN NOT NULL DEFAULT true,
  alert_no_show BOOLEAN NOT NULL DEFAULT true,
  alert_outside_zone BOOLEAN NOT NULL DEFAULT true,
  alert_missing_notes BOOLEAN NOT NULL DEFAULT true,
  billing_export_format TEXT NOT NULL DEFAULT 'medicaid' CHECK (billing_export_format IN ('medicaid', 'hcbs', 'regional-center', 'idd', 'custom')),
  audit_retention_years INT NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE evv_settings IS 'Org-level EVV configuration (single row).';

-- Insert default settings row
INSERT INTO evv_settings (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Triggers: Auto-update updated_at timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_evv_visits_updated_at
  BEFORE UPDATE ON evv_visits
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_evv_settings_updated_at
  BEFORE UPDATE ON evv_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE evv_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_gps_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_funding_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all EVV data
CREATE POLICY evv_visits_read ON evv_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY evv_gps_captures_read ON evv_gps_captures FOR SELECT TO authenticated USING (true);
CREATE POLICY evv_exceptions_read ON evv_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY evv_corrections_read ON evv_corrections FOR SELECT TO authenticated USING (true);
CREATE POLICY evv_audit_log_read ON evv_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY evv_service_types_read ON evv_service_types FOR SELECT TO authenticated USING (true);
CREATE POLICY evv_funding_sources_read ON evv_funding_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY evv_settings_read ON evv_settings FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert visits, GPS captures, exceptions, audit logs (for caregiver mobile app)
CREATE POLICY evv_visits_insert ON evv_visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY evv_gps_captures_insert ON evv_gps_captures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY evv_exceptions_insert ON evv_exceptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY evv_audit_log_insert ON evv_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update visits (clock times, status, notes -- mainly for CRM admin)
CREATE POLICY evv_visits_update ON evv_visits FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to update exceptions (resolve)
CREATE POLICY evv_exceptions_update ON evv_exceptions FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to insert corrections (manual edits)
CREATE POLICY evv_corrections_insert ON evv_corrections FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update settings
CREATE POLICY evv_settings_update ON evv_settings FOR UPDATE TO authenticated USING (true);

-- Note: For production, tighten RLS to check employee role (admin, manager) using auth.jwt() -> app_metadata.role
-- Current policies allow all authenticated users for development simplicity

COMMENT ON POLICY evv_visits_read ON evv_visits IS 'All authenticated users can read EVV visits.';
COMMENT ON POLICY evv_visits_insert ON evv_visits IS 'Authenticated users can create visits (caregiver mobile app or CRM).';
COMMENT ON POLICY evv_visits_update ON evv_visits IS 'Authenticated users can update visits (CRM admin edits status, times).';
COMMENT ON POLICY evv_corrections_insert ON evv_corrections IS 'Authenticated users can insert manual corrections (CRM admin).';
COMMENT ON POLICY evv_exceptions_update ON evv_exceptions IS 'Authenticated users can resolve exceptions (CRM admin).';
