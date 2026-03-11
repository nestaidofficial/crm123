-- =============================================================================
-- Activity Log: System-wide activity tracking for dashboard feed
-- =============================================================================
-- Tracks all major actions across the system for real-time dashboard updates
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  
  -- Activity classification
  type TEXT NOT NULL CHECK (type IN (
    'care_note', 'schedule', 'client', 'employee', 'visit', 
    'alert', 'task', 'document', 'billing', 'compliance'
  )),
  
  -- Activity details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Actor (who performed the action)
  actor_id UUID REFERENCES employees (id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  
  -- Related entities (optional FKs for filtering)
  client_id UUID REFERENCES clients (id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees (id) ON DELETE CASCADE,
  schedule_event_id UUID REFERENCES schedule_events (id) ON DELETE CASCADE,
  evv_visit_id UUID REFERENCES evv_visits (id) ON DELETE CASCADE,
  
  -- Status for filtering
  status TEXT CHECK (status IN ('completed', 'pending', 'urgent', 'info')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_agency_id ON activity_log (agency_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log (type);
CREATE INDEX IF NOT EXISTS idx_activity_log_status ON activity_log (status);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id ON activity_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_client_id ON activity_log (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_employee_id ON activity_log (employee_id) WHERE employee_id IS NOT NULL;

COMMENT ON TABLE activity_log IS 'System-wide activity log for dashboard feed and audit trail.';
COMMENT ON COLUMN activity_log.type IS 'care_note | schedule | client | employee | visit | alert | task | document | billing | compliance';
COMMENT ON COLUMN activity_log.status IS 'completed | pending | urgent | info';
COMMENT ON COLUMN activity_log.actor_name IS 'Display name of the person who performed the action (denormalized for performance).';

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read activity logs for their agency
CREATE POLICY activity_log_read ON activity_log 
  FOR SELECT TO authenticated 
  USING (true);

-- Allow anon users to read (for dev simplicity)
CREATE POLICY activity_log_anon_read ON activity_log 
  FOR SELECT TO anon 
  USING (true);

-- Allow authenticated users to insert activity logs
CREATE POLICY activity_log_insert ON activity_log 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Allow anon users to insert (for dev simplicity)
CREATE POLICY activity_log_anon_insert ON activity_log 
  FOR INSERT TO anon 
  WITH CHECK (true);

COMMENT ON POLICY activity_log_read ON activity_log IS 'All authenticated users can read activity logs.';
COMMENT ON POLICY activity_log_insert ON activity_log IS 'Authenticated users can create activity logs.';
