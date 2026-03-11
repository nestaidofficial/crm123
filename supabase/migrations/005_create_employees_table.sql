-- =============================================================================
-- Employees: core employee/caregiver profile (HR management)
-- =============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  dob DATE,
  ssn TEXT, -- Masked for display (e.g. ***-**-4567)
  gender TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('caregiver', 'cna', 'hha', 'lpn', 'rn', 'admin', 'coordinator', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'onboarding')),
  start_date DATE NOT NULL,
  department TEXT NOT NULL,
  supervisor TEXT NOT NULL,
  address JSONB NOT NULL DEFAULT '{}', -- { street, city, state, zip }
  emergency_contact JSONB NOT NULL DEFAULT '{}', -- { name, phone }
  pay_rate NUMERIC(12,2) NOT NULL,
  pay_type TEXT NOT NULL CHECK (pay_type IN ('hourly', 'salary', 'per-visit')),
  payroll JSONB NOT NULL DEFAULT '{}', -- { bank_account, routing_number, bank_name }
  work_authorization TEXT,
  notes TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}', -- Array of skill strings
  -- Soft delete and activity tracking
  is_archived BOOLEAN NOT NULL DEFAULT false,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_is_archived ON employees (is_archived);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees (status);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees (role);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees (department);
CREATE INDEX IF NOT EXISTS idx_employees_last_active_at ON employees (last_active_at DESC NULLS LAST);

COMMENT ON TABLE employees IS 'Employee/caregiver records; soft delete via is_archived.';
COMMENT ON COLUMN employees.role IS 'caregiver | cna | hha | lpn | rn | admin | coordinator | other';
COMMENT ON COLUMN employees.status IS 'active | inactive | onboarding';
COMMENT ON COLUMN employees.pay_type IS 'hourly | salary | per-visit';
COMMENT ON COLUMN employees.skills IS 'Array of skill strings (e.g. ["Wound Care", "IV Therapy", "BLS"])';
COMMENT ON COLUMN employees.registered_at IS 'When employee was registered (profile "Registered" date).';
COMMENT ON COLUMN employees.last_active_at IS 'Last activity timestamp (profile "Last Active").';


-- =============================================================================
-- Employee documents: IDs, contracts, certifications, training, references
-- (Document Library: name, type, size, uploaded date)
-- =============================================================================

CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN (
    'id', 'contract', 'certification', 'training', 'reference', 'other'
  )),
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_uploaded_at ON employee_documents (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents (type);

COMMENT ON TABLE employee_documents IS 'Document library per employee: IDs, contracts, certifications, training docs, references.';
COMMENT ON COLUMN employee_documents.file_path IS 'Storage path (e.g. Supabase Storage bucket key).';
COMMENT ON COLUMN employee_documents.file_size_bytes IS 'File size in bytes (app may display e.g. 1.2 MB).';


-- =============================================================================
-- Employee verifications / onboarding checklist
-- (Verifications tab: Background Check, Reference Verified, I-9 Form, HIPAA Training, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS employee_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('complete', 'pending', 'missing')),
  completed_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_verifications_employee_id ON employee_verifications (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_verifications_status ON employee_verifications (employee_id, status);

COMMENT ON TABLE employee_verifications IS 'Verification checklist per employee (Background Check, References, I-9, HIPAA, etc.).';
COMMENT ON COLUMN employee_verifications.status IS 'complete | pending | missing';
