-- ==========================================
-- Migration 041: Coordinator Requests (Approval Workflow)
-- ==========================================
-- Extends coverage_requests with approval columns so the AI coordinator
-- can create pending requests that admins approve/reject from the UI.

-- ─── Add new columns ─────────────────────────────────────────────
ALTER TABLE coverage_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'callout'
    CHECK (request_type IN ('callout', 'cancel_shift', 'schedule_change', 'reschedule', 'availability_update')),
  ADD COLUMN IF NOT EXISTS caregiver_id UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES schedule_events(id),
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS action_payload JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ─── Update status constraint to include pending/approved/rejected ──
ALTER TABLE coverage_requests DROP CONSTRAINT IF EXISTS coverage_requests_status_check;
ALTER TABLE coverage_requests ADD CONSTRAINT coverage_requests_status_check
  CHECK (status IN ('open', 'in_progress', 'filled', 'cancelled', 'pending', 'approved', 'rejected'));

-- ─── Index for fast request queries ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_coverage_requests_request_type
  ON coverage_requests (agency_id, request_type, status, created_at DESC);

-- ─── RLS: allow authenticated owner/admin to UPDATE ──────────────
CREATE POLICY coverage_requests_update ON coverage_requests
  FOR UPDATE TO authenticated
  USING (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]))
  WITH CHECK (has_agency_role(agency_id, ARRAY['owner', 'admin']::app_role[]));

-- Service role update (for approve endpoint if using service client)
CREATE POLICY coverage_requests_service_update ON coverage_requests
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);
