-- =============================================================================
-- Schedule Module: Events, Tasks, Recurrence, Time-Off, Audit
-- =============================================================================
-- Comprehensive schema for scheduling shifts and care visits.
-- Links to employees (caregivers, coordinators) and clients tables.
-- Supports recurring events, drag-and-drop time changes, and audit trails.
-- =============================================================================

-- =============================================================================
-- Table 1: schedule_recurrence_rules
-- =============================================================================
-- Must be created first since schedule_events references it

CREATE TABLE IF NOT EXISTS schedule_recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL CHECK (pattern IN ('daily', 'weekly', 'biweekly', 'monthly')),
  days_of_week INT[], -- 0=Sun, 1=Mon, ..., 6=Sat (for weekly/biweekly patterns)
  interval INT NOT NULL DEFAULT 1,
  end_type TEXT NOT NULL DEFAULT 'never' CHECK (end_type IN ('never', 'date', 'count')),
  end_date DATE,
  end_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_recurrence_rules_pattern ON schedule_recurrence_rules (pattern);

COMMENT ON TABLE schedule_recurrence_rules IS 'Recurrence patterns for repeating schedule events (daily, weekly, biweekly, monthly).';
COMMENT ON COLUMN schedule_recurrence_rules.days_of_week IS 'Array of day numbers (0=Sunday to 6=Saturday) for weekly patterns.';
COMMENT ON COLUMN schedule_recurrence_rules.end_type IS 'never | date | count';

-- =============================================================================
-- Table 2: schedule_events (core)
-- =============================================================================

CREATE TABLE IF NOT EXISTS schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
  caregiver_id UUID REFERENCES employees (id) ON DELETE SET NULL,
  care_coordinator_id UUID REFERENCES employees (id) ON DELETE SET NULL,
  care_type TEXT CHECK (care_type IN ('personal_care', 'companion_care', 'skilled_nursing', 'respite_care', 'live_in', 'other')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  is_open_shift BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  description TEXT,
  instructions TEXT,
  pay_rate NUMERIC(10, 2),
  pay_type TEXT CHECK (pay_type IN ('hourly', 'salary', 'per-visit')),
  recurrence_rule_id UUID REFERENCES schedule_recurrence_rules (id) ON DELETE SET NULL,
  is_recurring_instance BOOLEAN NOT NULL DEFAULT false,
  parent_event_id UUID REFERENCES schedule_events (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_events_client_id ON schedule_events (client_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_caregiver_id ON schedule_events (caregiver_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_care_coordinator_id ON schedule_events (care_coordinator_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_start_at ON schedule_events (start_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_events_status ON schedule_events (status);
CREATE INDEX IF NOT EXISTS idx_schedule_events_recurrence_rule_id ON schedule_events (recurrence_rule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_parent_event_id ON schedule_events (parent_event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_is_open_shift ON schedule_events (is_open_shift) WHERE is_open_shift = true;

COMMENT ON TABLE schedule_events IS 'Core schedule events (shifts/visits). Each row is either a one-off event or a template for recurring series.';
COMMENT ON COLUMN schedule_events.client_id IS 'FK to clients; nullable for open shifts or caregiver-only events.';
COMMENT ON COLUMN schedule_events.caregiver_id IS 'FK to employees; nullable for unassigned/open shifts.';
COMMENT ON COLUMN schedule_events.is_open_shift IS 'True if shift is open for caregivers to claim.';
COMMENT ON COLUMN schedule_events.color IS 'Tailwind class (e.g. bg-blue-200) for calendar display.';
COMMENT ON COLUMN schedule_events.is_recurring_instance IS 'True for generated occurrences from a recurring template.';
COMMENT ON COLUMN schedule_events.parent_event_id IS 'Links generated recurring instances back to the template event.';

-- =============================================================================
-- Table 3: schedule_event_tasks
-- =============================================================================

CREATE TABLE IF NOT EXISTS schedule_event_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES schedule_events (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees (id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_event_tasks_event_id ON schedule_event_tasks (event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_event_tasks_sort_order ON schedule_event_tasks (event_id, sort_order);

COMMENT ON TABLE schedule_event_tasks IS 'Checklist tasks per event (from Task tab in event dialog).';
COMMENT ON COLUMN schedule_event_tasks.sort_order IS 'Display order within event.';

-- =============================================================================
-- Table 4: schedule_event_exceptions
-- =============================================================================

CREATE TABLE IF NOT EXISTS schedule_event_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_event_id UUID NOT NULL REFERENCES schedule_events (id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('modified', 'cancelled')),
  modified_start_at TIMESTAMPTZ,
  modified_end_at TIMESTAMPTZ,
  modified_caregiver_id UUID REFERENCES employees (id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_event_id, original_date)
);

CREATE INDEX IF NOT EXISTS idx_schedule_event_exceptions_parent_event_id ON schedule_event_exceptions (parent_event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_event_exceptions_original_date ON schedule_event_exceptions (original_date);

COMMENT ON TABLE schedule_event_exceptions IS 'Per-occurrence overrides for recurring events (e.g. "this Tuesday cancelled" or "moved to 10am-2pm").';
COMMENT ON COLUMN schedule_event_exceptions.exception_type IS 'modified | cancelled';

-- =============================================================================
-- Table 5: schedule_time_off
-- =============================================================================

CREATE TABLE IF NOT EXISTS schedule_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_time_off_employee_id ON schedule_time_off (employee_id);
CREATE INDEX IF NOT EXISTS idx_schedule_time_off_start_at ON schedule_time_off (start_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_time_off_status ON schedule_time_off (status);

COMMENT ON TABLE schedule_time_off IS 'Out-of-office / unavailability blocks for employees.';
COMMENT ON COLUMN schedule_time_off.status IS 'pending | approved | denied';

-- =============================================================================
-- Table 6: schedule_audit_log
-- =============================================================================

CREATE TABLE IF NOT EXISTS schedule_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES schedule_events (id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'time_changed', 'reassigned', 'status_changed', 'cancelled', 'deleted')),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  actor_id UUID REFERENCES employees (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_audit_log_event_id ON schedule_audit_log (event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_audit_log_created_at ON schedule_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_audit_log_action ON schedule_audit_log (action);

COMMENT ON TABLE schedule_audit_log IS 'Audit trail for all schedule event mutations (especially drag-and-drop time changes).';
COMMENT ON COLUMN schedule_audit_log.action IS 'created | updated | time_changed | reassigned | status_changed | cancelled | deleted';

-- =============================================================================
-- Link EVV to Schedule Events
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'evv_visits' AND column_name = 'schedule_event_id'
  ) THEN
    ALTER TABLE evv_visits ADD COLUMN schedule_event_id UUID REFERENCES schedule_events (id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_evv_visits_schedule_event_id ON evv_visits (schedule_event_id);
    COMMENT ON COLUMN evv_visits.schedule_event_id IS 'Optional link to the source schedule event that this EVV visit verifies.';
  END IF;
END $$;

-- =============================================================================
-- Triggers: Auto-update updated_at timestamps
-- =============================================================================

CREATE TRIGGER set_schedule_events_updated_at
  BEFORE UPDATE ON schedule_events
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_schedule_time_off_updated_at
  BEFORE UPDATE ON schedule_time_off
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE schedule_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_event_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all schedule data
CREATE POLICY schedule_recurrence_rules_read ON schedule_recurrence_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY schedule_events_read ON schedule_events FOR SELECT TO authenticated USING (true);
CREATE POLICY schedule_event_tasks_read ON schedule_event_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY schedule_event_exceptions_read ON schedule_event_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY schedule_time_off_read ON schedule_time_off FOR SELECT TO authenticated USING (true);
CREATE POLICY schedule_audit_log_read ON schedule_audit_log FOR SELECT TO authenticated USING (true);

-- Allow anon users to read schedule data (for dev simplicity)
CREATE POLICY schedule_events_anon_read ON schedule_events FOR SELECT TO anon USING (true);
CREATE POLICY schedule_event_tasks_anon_read ON schedule_event_tasks FOR SELECT TO anon USING (true);

-- Allow authenticated users to insert schedule data
CREATE POLICY schedule_recurrence_rules_insert ON schedule_recurrence_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY schedule_events_insert ON schedule_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY schedule_event_tasks_insert ON schedule_event_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY schedule_event_exceptions_insert ON schedule_event_exceptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY schedule_time_off_insert ON schedule_time_off FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY schedule_audit_log_insert ON schedule_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Allow anon users to insert schedule data (for dev simplicity)
CREATE POLICY schedule_events_anon_insert ON schedule_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY schedule_event_tasks_anon_insert ON schedule_event_tasks FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated users to update schedule data
CREATE POLICY schedule_recurrence_rules_update ON schedule_recurrence_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY schedule_events_update ON schedule_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY schedule_event_tasks_update ON schedule_event_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY schedule_event_exceptions_update ON schedule_event_exceptions FOR UPDATE TO authenticated USING (true);
CREATE POLICY schedule_time_off_update ON schedule_time_off FOR UPDATE TO authenticated USING (true);

-- Allow anon users to update schedule data (for dev simplicity)
CREATE POLICY schedule_events_anon_update ON schedule_events FOR UPDATE TO anon USING (true);
CREATE POLICY schedule_event_tasks_anon_update ON schedule_event_tasks FOR UPDATE TO anon USING (true);

-- Allow authenticated users to delete schedule data
CREATE POLICY schedule_recurrence_rules_delete ON schedule_recurrence_rules FOR DELETE TO authenticated USING (true);
CREATE POLICY schedule_events_delete ON schedule_events FOR DELETE TO authenticated USING (true);
CREATE POLICY schedule_event_tasks_delete ON schedule_event_tasks FOR DELETE TO authenticated USING (true);
CREATE POLICY schedule_event_exceptions_delete ON schedule_event_exceptions FOR DELETE TO authenticated USING (true);
CREATE POLICY schedule_time_off_delete ON schedule_time_off FOR DELETE TO authenticated USING (true);

-- Allow anon users to delete schedule data (for dev simplicity)
CREATE POLICY schedule_events_anon_delete ON schedule_events FOR DELETE TO anon USING (true);
CREATE POLICY schedule_event_tasks_anon_delete ON schedule_event_tasks FOR DELETE TO anon USING (true);

-- Note: For production, tighten RLS to check employee role (admin, coordinator) using auth.jwt() -> app_metadata.role
-- Current policies allow all authenticated/anon users for development simplicity

COMMENT ON POLICY schedule_events_read ON schedule_events IS 'All authenticated users can read schedule events.';
COMMENT ON POLICY schedule_events_insert ON schedule_events IS 'Authenticated users can create schedule events.';
COMMENT ON POLICY schedule_events_update ON schedule_events IS 'Authenticated users can update schedule events (includes drag-drop time changes).';
COMMENT ON POLICY schedule_events_delete ON schedule_events IS 'Authenticated users can delete schedule events.';
