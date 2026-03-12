-- ============================================================================
-- 043: Human-friendly short IDs for employees and clients
-- Format: E-1001, E-1002, ... (employees)  C-1001, C-1002, ... (clients)
-- ============================================================================

-- (a) Counter table — one row per (agency, entity_type) for race-safe sequencing
CREATE TABLE IF NOT EXISTS short_id_counters (
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('employee', 'client')),
  next_val    INT  NOT NULL DEFAULT 1001,
  PRIMARY KEY (agency_id, entity_type)
);

-- (b) Generator function — returns e.g. 'E-1001'
CREATE OR REPLACE FUNCTION generate_short_id(
  p_agency_id  UUID,
  p_entity_type TEXT,
  p_prefix      TEXT
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_val INT;
BEGIN
  -- Ensure a counter row exists
  INSERT INTO short_id_counters (agency_id, entity_type, next_val)
  VALUES (p_agency_id, p_entity_type, 1001)
  ON CONFLICT DO NOTHING;

  -- Atomically fetch-and-increment with row lock
  UPDATE short_id_counters
  SET    next_val = next_val + 1
  WHERE  agency_id = p_agency_id AND entity_type = p_entity_type
  RETURNING next_val - 1 INTO v_val;

  RETURN p_prefix || '-' || v_val::TEXT;
END;
$$;

-- (c) Add short_id columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS short_id TEXT;
ALTER TABLE clients   ADD COLUMN IF NOT EXISTS short_id TEXT;

-- (d) Unique indexes scoped to agency (partial — only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_agency_short_id
  ON employees (agency_id, short_id) WHERE short_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_agency_short_id
  ON clients (agency_id, short_id) WHERE short_id IS NOT NULL;

-- (e) BEFORE INSERT triggers — auto-assign short_id when NULL
CREATE OR REPLACE FUNCTION trg_employee_short_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.short_id IS NULL AND NEW.agency_id IS NOT NULL THEN
    NEW.short_id := generate_short_id(NEW.agency_id, 'employee', 'E');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_short_id_trigger ON employees;
CREATE TRIGGER employee_short_id_trigger
  BEFORE INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION trg_employee_short_id();

CREATE OR REPLACE FUNCTION trg_client_short_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.short_id IS NULL AND NEW.agency_id IS NOT NULL THEN
    NEW.short_id := generate_short_id(NEW.agency_id, 'client', 'C');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_short_id_trigger ON clients;
CREATE TRIGGER client_short_id_trigger
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION trg_client_short_id();

-- (f) Backfill existing rows ordered by created_at
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Backfill employees
  FOR r IN
    SELECT id, agency_id
    FROM employees
    WHERE short_id IS NULL AND agency_id IS NOT NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE employees
    SET short_id = generate_short_id(r.agency_id, 'employee', 'E')
    WHERE id = r.id;
  END LOOP;

  -- Backfill clients
  FOR r IN
    SELECT id, agency_id
    FROM clients
    WHERE short_id IS NULL AND agency_id IS NOT NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE clients
    SET short_id = generate_short_id(r.agency_id, 'client', 'C')
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- (g) RLS — allow service_role full access to counter table
ALTER TABLE short_id_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON short_id_counters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read counters for their agency
CREATE POLICY "authenticated_read_own_agency" ON short_id_counters
  FOR SELECT
  TO authenticated
  USING (agency_id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  ));
