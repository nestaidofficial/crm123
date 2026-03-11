-- =============================================================================
-- Clients: core profile and care plan (matches lib/db/client.mapper.ts)
-- =============================================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_type TEXT NOT NULL CHECK (care_type IN ('non_medical', 'medical')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  notes TEXT,
  address JSONB NOT NULL DEFAULT '{}',
  -- Primary contact (name, relation, phone required on add-client). Shown as first family member in Family tab.
  primary_contact JSONB NOT NULL DEFAULT '{}',
  emergency_contact JSONB NOT NULL DEFAULT '{}',
  care_plan JSONB NOT NULL DEFAULT '{}',
  -- Status and activity (profile header: Active, Registered, Last Active)
  status TEXT NOT NULL DEFAULT 'active' CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive', 'pending', 'on_hold')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ,
  -- Soft delete
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_is_archived ON clients (is_archived);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients (status);
CREATE INDEX IF NOT EXISTS idx_clients_last_active_at ON clients (last_active_at DESC NULLS LAST);

COMMENT ON TABLE clients IS 'Client records; soft delete via is_archived.';
COMMENT ON COLUMN clients.status IS 'active | inactive | pending | on_hold';
COMMENT ON COLUMN clients.registered_at IS 'When client was registered (profile "Registered" date).';
COMMENT ON COLUMN clients.last_active_at IS 'Last activity timestamp (profile "Last Active").';

-- Backfill status/activity columns if clients table already existed without them
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
-- Add status constraint only if missing (no-op when table was just created above)
DO $$
BEGIN
  ALTER TABLE clients ADD CONSTRAINT clients_status_check
    CHECK (status IN ('active', 'inactive', 'pending', 'on_hold'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =============================================================================
-- Client documents: uploads, consents, care plans, insurance, medical records
-- (Document Library: name, type, size, uploaded date; max file size 10MB in app)
-- =============================================================================

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN (
    'intake_form', 'care_plan', 'contract', 'insurance', 'consent',
    'medical_record', 'certification', 'other'
  )),
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents (client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_at ON client_documents (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON client_documents (type);

COMMENT ON TABLE client_documents IS 'Document library per client: consents, care plans, insurance, medical records.';
COMMENT ON COLUMN client_documents.file_path IS 'Storage path (e.g. Supabase Storage bucket key).';
COMMENT ON COLUMN client_documents.file_size_bytes IS 'File size in bytes (app may display e.g. 1.2 MB).';


-- =============================================================================
-- Client guardians / family members (Family tab)
-- =============================================================================
-- The first family member is the client's primary_contact (from add-client; name, relation, phone required).
-- Additional family members are added via "Add Guardian" and stored here.

CREATE TABLE IF NOT EXISTS client_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_guardians_client_id ON client_guardians (client_id);

COMMENT ON TABLE client_guardians IS 'Additional family members and guardians per client (Family tab). Primary contact is stored in clients.primary_contact and shown as the first family member.';


-- =============================================================================
-- Client onboarding checklist (Onboarding tab: Intake Form, Care Plan, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS client_onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('complete', 'pending', 'missing', 'locked')),
  completed_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_items_client_id ON client_onboarding_items (client_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_items_status ON client_onboarding_items (client_id, status);

COMMENT ON TABLE client_onboarding_items IS 'Onboarding checklist per client (Intake Form, Care Plan, Insurance, etc.).';
COMMENT ON COLUMN client_onboarding_items.status IS 'complete | pending | missing | locked';
