-- =============================================================================
-- Agency Services Module
-- =============================================================================
-- Per-agency service catalog with junction tables linking services to clients
-- and employees. Enables agencies to define their own service offerings and
-- track which services each client receives and each employee provides.
-- =============================================================================

-- =============================================================================
-- Agency Services Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS agency_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_agency_service_name UNIQUE (agency_id, name)
);

CREATE INDEX IF NOT EXISTS idx_agency_services_agency_id ON agency_services (agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_services_is_active ON agency_services (is_active);

COMMENT ON TABLE agency_services IS 'Per-agency service catalog defining available services for clients and employees';

-- =============================================================================
-- Client Services Junction Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES agency_services(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_client_service UNIQUE (client_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON client_services (client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_service_id ON client_services (service_id);
CREATE INDEX IF NOT EXISTS idx_client_services_agency_id ON client_services (agency_id);

COMMENT ON TABLE client_services IS 'Junction table linking clients to the services they receive';

-- =============================================================================
-- Employee Services Junction Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS employee_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES agency_services(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_employee_service UNIQUE (employee_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_services_employee_id ON employee_services (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_services_service_id ON employee_services (service_id);
CREATE INDEX IF NOT EXISTS idx_employee_services_agency_id ON employee_services (agency_id);

COMMENT ON TABLE employee_services IS 'Junction table linking employees to the services they provide';

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE agency_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_services ENABLE ROW LEVEL SECURITY;

-- Agency Services Policies
CREATE POLICY "Users can view agency services for their agency" ON agency_services
  FOR SELECT USING (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

CREATE POLICY "Users can insert agency services for their agency" ON agency_services
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

CREATE POLICY "Users can update agency services for their agency" ON agency_services
  FOR UPDATE USING (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

CREATE POLICY "Users can delete agency services for their agency" ON agency_services
  FOR DELETE USING (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

-- Client Services Policies
CREATE POLICY "Users can view client services for their agency" ON client_services
  FOR SELECT USING (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

CREATE POLICY "Users can insert client services for their agency" ON client_services
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

CREATE POLICY "Users can update client services for their agency" ON client_services
  FOR UPDATE USING (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

CREATE POLICY "Users can delete client services for their agency" ON client_services
  FOR DELETE USING (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

-- Employee Services Policies
CREATE POLICY "Users can view employee services for their agency" ON employee_services
  FOR SELECT USING (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

CREATE POLICY "Users can insert employee services for their agency" ON employee_services
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

CREATE POLICY "Users can update employee services for their agency" ON employee_services
  FOR UPDATE USING (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

CREATE POLICY "Users can delete employee services for their agency" ON employee_services
  FOR DELETE USING (
    agency_id IN (
      SELECT unnest(get_user_agency_ids())
    )
  );

-- =============================================================================
-- Seed Data Function
-- =============================================================================

CREATE OR REPLACE FUNCTION seed_agency_services()
RETURNS void AS $$
DECLARE
  agency_record RECORD;
  service_names TEXT[] := ARRAY[
    'Personal Care',
    'Companion Care', 
    'Homemaker / Household Support',
    'Medication Support',
    'Transportation / Escort Services',
    'Respite Care',
    'Family Caregiver Support',
    'Dementia / Memory Care Support',
    'Overnight Care',
    'Live-In Care',
    'Post-Hospital / Recovery Support',
    'Disability Support Services',
    'Pediatric Home Care Support'
  ];
  service_name TEXT;
BEGIN
  -- Seed services for all existing agencies
  FOR agency_record IN SELECT id FROM agencies LOOP
    FOREACH service_name IN ARRAY service_names LOOP
      INSERT INTO agency_services (agency_id, name)
      VALUES (agency_record.id, service_name)
      ON CONFLICT (agency_id, name) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the seed function
SELECT seed_agency_services();

-- Drop the seed function (no longer needed)
DROP FUNCTION seed_agency_services();

-- =============================================================================
-- Trigger to Auto-Seed Services for New Agencies
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_seed_agency_services()
RETURNS TRIGGER AS $$
DECLARE
  service_names TEXT[] := ARRAY[
    'Personal Care',
    'Companion Care', 
    'Homemaker / Household Support',
    'Medication Support',
    'Transportation / Escort Services',
    'Respite Care',
    'Family Caregiver Support',
    'Dementia / Memory Care Support',
    'Overnight Care',
    'Live-In Care',
    'Post-Hospital / Recovery Support',
    'Disability Support Services',
    'Pediatric Home Care Support'
  ];
  service_name TEXT;
BEGIN
  -- Seed default services for the new agency
  FOREACH service_name IN ARRAY service_names LOOP
    INSERT INTO agency_services (agency_id, name)
    VALUES (NEW.id, service_name);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_seed_agency_services
  AFTER INSERT ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION auto_seed_agency_services();

COMMENT ON FUNCTION auto_seed_agency_services() IS 'Automatically seeds default services when a new agency is created';
COMMENT ON TRIGGER trigger_auto_seed_agency_services ON agencies IS 'Auto-seeds services for new agencies';