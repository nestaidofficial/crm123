-- ==========================================
-- Migration 044: Outreach Attempts + Outbound Agent Config
-- ==========================================
-- Tracks each call/SMS attempt per caregiver per vacant shift
-- and adds outbound agent columns to coordinator_config.

-- ─── Table: outreach_attempts ──────────────────────────────────
CREATE TABLE outreach_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  event_id         UUID NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
  caregiver_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  channel          TEXT NOT NULL CHECK (channel IN ('call', 'sms')),
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','accepted','declined','no_answer','voicemail','failed')),
  retell_call_id   TEXT,
  retell_chat_id   TEXT,
  call_duration_ms INT,
  response_message TEXT,
  response_notes   TEXT,
  responded_at     TIMESTAMPTZ,
  initiated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_outreach_attempts_agency_event
  ON outreach_attempts (agency_id, event_id);

CREATE INDEX idx_outreach_attempts_retell_call
  ON outreach_attempts (retell_call_id)
  WHERE retell_call_id IS NOT NULL;

CREATE INDEX idx_outreach_attempts_retell_chat
  ON outreach_attempts (retell_chat_id)
  WHERE retell_chat_id IS NOT NULL;

CREATE INDEX idx_outreach_attempts_caregiver_event
  ON outreach_attempts (caregiver_id, event_id);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE outreach_attempts ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY outreach_attempts_service_all ON outreach_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated: read own agency
CREATE POLICY outreach_attempts_auth_select ON outreach_attempts
  FOR SELECT TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin', 'coordinator']::app_role[]));

-- Authenticated: insert for own agency
CREATE POLICY outreach_attempts_auth_insert ON outreach_attempts
  FOR INSERT TO authenticated
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin', 'coordinator']::app_role[]));

-- Authenticated: update for own agency
CREATE POLICY outreach_attempts_auth_update ON outreach_attempts
  FOR UPDATE TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin', 'coordinator']::app_role[]))
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin', 'coordinator']::app_role[]));

-- ─── Enable realtime ───────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE outreach_attempts;

-- ─── Trigger: auto-update updated_at ───────────────────────────
CREATE TRIGGER set_outreach_attempts_updated_at
  BEFORE UPDATE ON outreach_attempts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── Add outbound agent columns to coordinator_config ──────────
ALTER TABLE coordinator_config
  ADD COLUMN IF NOT EXISTS retell_outbound_agent_id TEXT,
  ADD COLUMN IF NOT EXISTS retell_outbound_llm_id TEXT,
  ADD COLUMN IF NOT EXISTS retell_outbound_chat_agent_id TEXT;
