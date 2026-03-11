-- ==========================================
-- Migration 040: AI Coverage Coordinator Config
-- ==========================================
-- Singleton-per-agency coordinator configuration table
-- and operational tables for coverage tracking.

-- ─── coordinator_config ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coordinator_config (
  agency_id UUID PRIMARY KEY REFERENCES agencies(id) ON DELETE CASCADE,

  -- Step 1: Line & Routing
  coverage_line        TEXT NOT NULL DEFAULT '',
  human_backup_number  TEXT NOT NULL DEFAULT '',
  intro_script         TEXT NOT NULL DEFAULT 'You''ve reached the scheduling line. How can I help you today?',
  operating_mode       TEXT NOT NULL DEFAULT '24/7' CHECK (operating_mode IN ('24/7', 'business-hours', 'after-hours')),

  -- Step 2: Call Types (8 booleans)
  handle_caregiver_call_out      BOOLEAN NOT NULL DEFAULT true,
  handle_schedule_change         BOOLEAN NOT NULL DEFAULT true,
  handle_reschedule_request      BOOLEAN NOT NULL DEFAULT true,
  handle_missed_visit            BOOLEAN NOT NULL DEFAULT true,
  handle_shift_coverage_issue    BOOLEAN NOT NULL DEFAULT true,
  handle_availability_update     BOOLEAN NOT NULL DEFAULT true,
  handle_open_shift_question     BOOLEAN NOT NULL DEFAULT true,
  handle_same_day_coverage       BOOLEAN NOT NULL DEFAULT true,

  -- Step 3: Call-Out Intake (9 booleans + 2 after-intake)
  collect_caregiver_name         BOOLEAN NOT NULL DEFAULT true,
  collect_caregiver_id           BOOLEAN NOT NULL DEFAULT true,
  collect_client_name            BOOLEAN NOT NULL DEFAULT true,
  collect_shift_date             BOOLEAN NOT NULL DEFAULT true,
  collect_shift_time             BOOLEAN NOT NULL DEFAULT true,
  collect_reason                 BOOLEAN NOT NULL DEFAULT true,
  collect_urgency                BOOLEAN NOT NULL DEFAULT true,
  collect_same_day_flag          BOOLEAN NOT NULL DEFAULT true,
  collect_notes                  BOOLEAN NOT NULL DEFAULT true,
  after_notify_scheduler         BOOLEAN NOT NULL DEFAULT true,
  after_create_task              BOOLEAN NOT NULL DEFAULT true,

  -- Step 4: Coverage Workflow
  auto_fill_shifts               BOOLEAN NOT NULL DEFAULT true,
  ai_review_caregivers           BOOLEAN NOT NULL DEFAULT true,
  ai_find_best_match             BOOLEAN NOT NULL DEFAULT true,
  ai_contact_automatically       BOOLEAN NOT NULL DEFAULT true,
  ai_collect_confirmation        BOOLEAN NOT NULL DEFAULT true,
  ai_rank_matches                BOOLEAN NOT NULL DEFAULT true,
  ai_notify_scheduler            BOOLEAN NOT NULL DEFAULT true,
  assignment_mode                TEXT NOT NULL DEFAULT 'approval' CHECK (assignment_mode IN ('suggest', 'approval', 'auto-assign')),

  -- Step 5: Escalations
  escalate_medical_emergency     BOOLEAN NOT NULL DEFAULT true,
  escalate_abuse_report          BOOLEAN NOT NULL DEFAULT true,
  escalate_billing_dispute       BOOLEAN NOT NULL DEFAULT true,
  escalate_complaint             BOOLEAN NOT NULL DEFAULT true,
  escalate_high_risk             BOOLEAN NOT NULL DEFAULT true,

  -- Step 5: Notifications
  notify_scheduler               BOOLEAN NOT NULL DEFAULT true,
  notify_coordinator             BOOLEAN NOT NULL DEFAULT true,
  notify_admin                   BOOLEAN NOT NULL DEFAULT false,
  delivery_sms                   BOOLEAN NOT NULL DEFAULT true,
  delivery_email                 BOOLEAN NOT NULL DEFAULT true,

  -- Retell state (same pattern as receptionist)
  retell_llm_id          TEXT,
  retell_agent_id        TEXT,
  retell_phone_number_id TEXT,
  retell_sync_status     TEXT NOT NULL DEFAULT 'pending' CHECK (retell_sync_status IN ('pending', 'synced', 'error')),
  retell_sync_error      TEXT,
  last_synced_at         TIMESTAMPTZ,

  -- Meta
  is_active    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE coordinator_config IS 'AI Coverage Coordinator configuration — one row per agency';

-- Auto-update updated_at
CREATE TRIGGER set_coordinator_config_updated_at
  BEFORE UPDATE ON coordinator_config
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── coverage_requests (operational — future dashboard) ─────────
CREATE TABLE IF NOT EXISTS coverage_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  caregiver_name    TEXT,
  caregiver_id_str  TEXT,
  client_name       TEXT,
  shift_date        DATE,
  shift_time        TEXT,
  reason            TEXT,
  urgency           TEXT,
  is_same_day       BOOLEAN DEFAULT false,
  notes             TEXT,

  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'filled', 'cancelled')),
  retell_call_id    TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coverage_requests_agency
  ON coverage_requests (agency_id, created_at DESC);

COMMENT ON TABLE coverage_requests IS 'Call-out / coverage request events captured by the coordinator';

-- ─── coverage_tasks (operational — future dashboard) ────────────
CREATE TABLE IF NOT EXISTS coverage_tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id             UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  coverage_request_id   UUID REFERENCES coverage_requests(id) ON DELETE CASCADE,
  assigned_caregiver_id UUID,

  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'outreach', 'filled', 'failed')),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coverage_tasks_agency
  ON coverage_tasks (agency_id, created_at DESC);

CREATE TRIGGER set_coverage_tasks_updated_at
  BEFORE UPDATE ON coverage_tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE coverage_tasks IS 'Tracks coverage-filling attempts for each coverage request';

-- ─── RLS ──────────────────────────────────────────────────────────
ALTER TABLE coordinator_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_tasks ENABLE ROW LEVEL SECURITY;

-- coordinator_config: owner/admin can read and write
CREATE POLICY coordinator_config_select ON coordinator_config
  FOR SELECT TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

CREATE POLICY coordinator_config_insert ON coordinator_config
  FOR INSERT TO authenticated
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

CREATE POLICY coordinator_config_update ON coordinator_config
  FOR UPDATE TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]))
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

-- coverage_requests: owner/admin can read and write
CREATE POLICY coverage_requests_select ON coverage_requests
  FOR SELECT TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

CREATE POLICY coverage_requests_insert ON coverage_requests
  FOR INSERT TO authenticated
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

-- Service role needs full access for server-side inserts
CREATE POLICY coverage_requests_service_insert ON coverage_requests
  FOR INSERT TO service_role
  WITH CHECK (true);

-- coverage_tasks: owner/admin can read and write
CREATE POLICY coverage_tasks_select ON coverage_tasks
  FOR SELECT TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

CREATE POLICY coverage_tasks_insert ON coverage_tasks
  FOR INSERT TO authenticated
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

CREATE POLICY coverage_tasks_update ON coverage_tasks
  FOR UPDATE TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]))
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

-- Service role needs full access for server-side inserts/updates
CREATE POLICY coverage_tasks_service_insert ON coverage_tasks
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY coverage_tasks_service_update ON coverage_tasks
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);
