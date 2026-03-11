-- ==========================================
-- Migration 038: AI Receptionist Config
-- ==========================================
-- Singleton-per-agency receptionist configuration table
-- and Retell sync audit log.

-- ─── receptionist_config ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receptionist_config (
  -- PK = agency_id (singleton pattern, same as billing_provider_config)
  agency_id         UUID PRIMARY KEY REFERENCES agencies(id) ON DELETE CASCADE,

  -- Step 1: Phone & Setup
  agency_name       TEXT NOT NULL DEFAULT '',
  reception_line    TEXT NOT NULL DEFAULT '',
  escalation_number TEXT NOT NULL DEFAULT '',
  greeting_script   TEXT NOT NULL DEFAULT 'Thank you for calling, how can I help you today?',
  business_hours    TEXT NOT NULL DEFAULT '24/7' CHECK (business_hours IN ('24/7', 'custom')),
  weekday_start     TEXT DEFAULT '09:00',
  weekday_end       TEXT DEFAULT '17:00',
  weekend_start     TEXT DEFAULT '09:00',
  weekend_end       TEXT DEFAULT '17:00',

  -- Step 2: Route to Coordinator (8 booleans)
  route_caregiver_call_out    BOOLEAN NOT NULL DEFAULT true,
  route_schedule_change       BOOLEAN NOT NULL DEFAULT true,
  route_reschedule_request    BOOLEAN NOT NULL DEFAULT true,
  route_missed_visit          BOOLEAN NOT NULL DEFAULT true,
  route_missed_clocking       BOOLEAN NOT NULL DEFAULT true,
  route_shift_coverage_issue  BOOLEAN NOT NULL DEFAULT true,
  route_availability_update   BOOLEAN NOT NULL DEFAULT true,
  route_open_shift_question   BOOLEAN NOT NULL DEFAULT true,

  -- Step 2: Escalate to Human (4 booleans)
  escalate_billing_question      BOOLEAN NOT NULL DEFAULT true,
  escalate_billing_dispute       BOOLEAN NOT NULL DEFAULT true,
  escalate_complaint_escalation  BOOLEAN NOT NULL DEFAULT true,
  escalate_urgent_issue          BOOLEAN NOT NULL DEFAULT true,

  -- Step 3: Client Intake (10 booleans)
  intake_client_name             BOOLEAN NOT NULL DEFAULT true,
  intake_client_phone_number     BOOLEAN NOT NULL DEFAULT true,
  intake_client_email            BOOLEAN NOT NULL DEFAULT true,
  intake_client_address          BOOLEAN NOT NULL DEFAULT true,
  intake_client_type_of_care     BOOLEAN NOT NULL DEFAULT true,
  intake_client_preferred_days   BOOLEAN NOT NULL DEFAULT true,
  intake_client_estimated_hours  BOOLEAN NOT NULL DEFAULT true,
  intake_client_preferred_start  BOOLEAN NOT NULL DEFAULT true,
  intake_client_notes            BOOLEAN NOT NULL DEFAULT true,
  auto_schedule_consultation     BOOLEAN NOT NULL DEFAULT false,

  -- Step 4: Caregiver Intake (9 booleans)
  intake_cg_full_name       BOOLEAN NOT NULL DEFAULT true,
  intake_cg_phone_number    BOOLEAN NOT NULL DEFAULT true,
  intake_cg_email           BOOLEAN NOT NULL DEFAULT true,
  intake_cg_location        BOOLEAN NOT NULL DEFAULT true,
  intake_cg_experience      BOOLEAN NOT NULL DEFAULT true,
  intake_cg_certifications  BOOLEAN NOT NULL DEFAULT true,
  intake_cg_availability    BOOLEAN NOT NULL DEFAULT true,
  intake_cg_transportation  BOOLEAN NOT NULL DEFAULT true,
  intake_cg_notes           BOOLEAN NOT NULL DEFAULT true,

  -- Step 5: Notifications (5 booleans)
  notify_summaries_sms      BOOLEAN NOT NULL DEFAULT true,
  notify_summaries_email    BOOLEAN NOT NULL DEFAULT true,
  notify_intake_coordinator BOOLEAN NOT NULL DEFAULT true,
  notify_intake_scheduler   BOOLEAN NOT NULL DEFAULT false,
  notify_intake_admin       BOOLEAN NOT NULL DEFAULT true,

  -- Retell state
  retell_llm_id           TEXT,
  retell_agent_id         TEXT,
  retell_phone_number_id  TEXT,
  retell_sync_status      TEXT NOT NULL DEFAULT 'pending' CHECK (retell_sync_status IN ('pending', 'synced', 'error')),
  retell_sync_error       TEXT,
  last_synced_at          TIMESTAMPTZ,

  -- Meta
  is_active    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE receptionist_config IS 'AI Receptionist configuration — one row per agency';

-- Auto-update updated_at
CREATE TRIGGER set_receptionist_config_updated_at
  BEFORE UPDATE ON receptionist_config
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── retell_sync_log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retell_sync_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id         UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  action            TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('success', 'error')),
  request_payload   JSONB,
  response_payload  JSONB,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retell_sync_log_agency
  ON retell_sync_log (agency_id, created_at DESC);

COMMENT ON TABLE retell_sync_log IS 'Audit trail for Retell API sync operations';

-- ─── RLS ──────────────────────────────────────────────────────────
ALTER TABLE receptionist_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE retell_sync_log ENABLE ROW LEVEL SECURITY;

-- receptionist_config: owner/admin can read and write
CREATE POLICY receptionist_config_select ON receptionist_config
  FOR SELECT TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

CREATE POLICY receptionist_config_insert ON receptionist_config
  FOR INSERT TO authenticated
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

CREATE POLICY receptionist_config_update ON receptionist_config
  FOR UPDATE TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]))
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

-- retell_sync_log: owner/admin can read only
CREATE POLICY retell_sync_log_select ON retell_sync_log
  FOR SELECT TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

-- Service role needs full access for server-side sync inserts
CREATE POLICY retell_sync_log_service_insert ON retell_sync_log
  FOR INSERT TO service_role
  WITH CHECK (true);
