-- ============================================================================
-- 047: Auto Coverage Sessions + Auto Scheduler Toggle
-- Tracks each auto-scheduler run when the Auto Scheduler toggle is ON.
-- ============================================================================

-- New table: auto_coverage_sessions
CREATE TABLE IF NOT EXISTS auto_coverage_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  event_id                 UUID NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
  original_caregiver_id    UUID NOT NULL REFERENCES employees(id),
  original_call_id         TEXT,
  original_caregiver_phone TEXT,
  status                   TEXT NOT NULL DEFAULT 'outreach'
    CHECK (status IN ('outreach', 'filled', 'expired', 'cancelled')),
  assigned_caregiver_id    UUID REFERENCES employees(id),
  deadline_at              TIMESTAMPTZ NOT NULL,
  callback_call_id         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_coverage_active
  ON auto_coverage_sessions (status, deadline_at)
  WHERE status = 'outreach';

CREATE INDEX IF NOT EXISTS idx_auto_coverage_event
  ON auto_coverage_sessions (event_id);

-- RLS: service_role only (same pattern as retell_sync_log)
ALTER TABLE auto_coverage_sessions ENABLE ROW LEVEL SECURITY;

-- Enable realtime for UI updates
ALTER PUBLICATION supabase_realtime ADD TABLE auto_coverage_sessions;

-- New column on coordinator_config
ALTER TABLE coordinator_config
  ADD COLUMN IF NOT EXISTS auto_scheduler_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN coordinator_config.auto_scheduler_enabled
  IS 'When ON, callouts are auto-approved, outreach is auto-dispatched, and assignments are automatic.';
