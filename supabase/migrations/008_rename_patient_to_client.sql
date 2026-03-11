-- =============================================================================
-- Rename Patient to Client: tables, columns, indexes, constraints, storage buckets
-- This migration preserves all existing data.
-- Only runs the table renames if "patients" exists (legacy schema).
-- If "clients" already exists (from rewritten 001), skips table renames.
-- =============================================================================

DO $$
BEGIN
  -- Only rename tables if we have the legacy "patients" schema
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patients')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients')
  THEN
    -- 1. Rename Tables
    ALTER TABLE patients RENAME TO clients;
    ALTER TABLE patient_documents RENAME TO client_documents;
    ALTER TABLE patient_guardians RENAME TO client_guardians;
    ALTER TABLE patient_onboarding_items RENAME TO client_onboarding_items;

    -- 2. Rename Foreign Key Columns
    ALTER TABLE client_documents RENAME COLUMN patient_id TO client_id;
    ALTER TABLE client_guardians RENAME COLUMN patient_id TO client_id;
    ALTER TABLE client_onboarding_items RENAME COLUMN patient_id TO client_id;

    -- 3. Rename Indexes
    ALTER INDEX IF EXISTS idx_patients_is_archived RENAME TO idx_clients_is_archived;
    ALTER INDEX IF EXISTS idx_patients_created_at RENAME TO idx_clients_created_at;
    ALTER INDEX IF EXISTS idx_patients_status RENAME TO idx_clients_status;
    ALTER INDEX IF EXISTS idx_patients_last_active_at RENAME TO idx_clients_last_active_at;
    ALTER INDEX IF EXISTS idx_patient_documents_patient_id RENAME TO idx_client_documents_client_id;
    ALTER INDEX IF EXISTS idx_patient_documents_uploaded_at RENAME TO idx_client_documents_uploaded_at;
    ALTER INDEX IF EXISTS idx_patient_documents_type RENAME TO idx_client_documents_type;
    ALTER INDEX IF EXISTS idx_patient_guardians_patient_id RENAME TO idx_client_guardians_client_id;
    ALTER INDEX IF EXISTS idx_patient_guardians_is_primary RENAME TO idx_client_guardians_is_primary;
    ALTER INDEX IF EXISTS idx_patient_onboarding_items_patient_id RENAME TO idx_client_onboarding_items_client_id;
    ALTER INDEX IF EXISTS idx_patient_onboarding_items_status RENAME TO idx_client_onboarding_items_status;

    -- 4. Rename Constraints (only if they exist with old names)
    BEGIN
      ALTER TABLE clients RENAME CONSTRAINT patients_status_check TO clients_status_check;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    BEGIN
      ALTER TABLE clients RENAME CONSTRAINT patients_avatar_url_format_check TO clients_avatar_url_format_check;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
  END IF;
END $$;

-- schedule_events.patient_id -> client_id (if that table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedule_events' AND column_name = 'patient_id'
  ) THEN
    ALTER TABLE schedule_events RENAME COLUMN patient_id TO client_id;
  END IF;
END $$;

-- =============================================================================
-- 5. Update Comments
-- =============================================================================

COMMENT ON TABLE clients IS 'Client records; soft delete via is_archived.';
COMMENT ON COLUMN clients.status IS 'active | inactive | pending | on_hold';
COMMENT ON COLUMN clients.registered_at IS 'When client was registered (profile "Registered" date).';
COMMENT ON COLUMN clients.last_active_at IS 'Last activity timestamp (profile "Last Active").';
COMMENT ON COLUMN clients.avatar_url IS 'Public URL to client profile image in storage.client_profile_image bucket';

COMMENT ON TABLE client_documents IS 'Document library per client: consents, care plans, insurance, medical records.';
COMMENT ON COLUMN client_documents.file_path IS 'Storage path (e.g. Supabase Storage bucket key).';
COMMENT ON COLUMN client_documents.file_size_bytes IS 'File size in bytes (app may display e.g. 1.2 MB).';

COMMENT ON TABLE client_guardians IS 'Additional family members and guardians per client (Family tab). Primary contact is stored in clients.primary_contact and shown as the first family member.';
COMMENT ON COLUMN client_guardians.is_primary IS 'True for the primary contact (from add-client); one per client.';

COMMENT ON TABLE client_onboarding_items IS 'Onboarding checklist per client (Intake Form, Care Plan, Insurance, etc.).';
COMMENT ON COLUMN client_onboarding_items.status IS 'complete | pending | missing | locked';

-- =============================================================================
-- 6. Update avatar_url constraint to reference new bucket name
-- =============================================================================

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_avatar_url_format_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_avatar_url_format_check
  CHECK (
    avatar_url IS NULL OR
    (length(trim(avatar_url)) > 0 AND avatar_url LIKE '%client_profile_image%')
  );

-- =============================================================================
-- 7. Storage Buckets
-- Skip renaming buckets that have files (FK constraint prevents it).
-- Create client-documents bucket if it doesn't exist (for new uploads).
-- =============================================================================

DO $$
BEGIN
  -- Rename patient_profile_image only if empty and client version doesn't exist
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'patient_profile_image')
     AND NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'client_profile_image')
     AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'patient_profile_image' LIMIT 1)
  THEN
    UPDATE storage.buckets SET id = 'client_profile_image', name = 'client_profile_image' WHERE id = 'patient_profile_image';
  END IF;

  -- Rename patient-documents only if empty and client version doesn't exist
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'patient-documents')
     AND NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'client-documents')
     AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'patient-documents' LIMIT 1)
  THEN
    UPDATE storage.buckets SET id = 'client-documents', name = 'client-documents' WHERE id = 'patient-documents';
  END IF;

  -- Ensure client-documents bucket exists (create if patient-documents had files and couldn't be renamed)
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'client-documents')
  THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'client-documents',
      'client-documents',
      false,
      10485760,
      ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
    );
  END IF;
END $$;

-- =============================================================================
-- 8. Update Storage Policies
-- =============================================================================

-- Drop old policies for patient_profile_image (no-op if already migrated)
DROP POLICY IF EXISTS "Public read access for patient avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload patient avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update patient avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete patient avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload patient avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update patient avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient avatars" ON storage.objects;

-- Drop client policies if they exist (idempotent - handles both fresh and migrated schemas)
DROP POLICY IF EXISTS "Public read access for client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client avatars" ON storage.objects;

-- Create policies for client_profile_image
CREATE POLICY "Public read access for client avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'client_profile_image');

CREATE POLICY "Anon can upload client avatars"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'client_profile_image');

CREATE POLICY "Anon can update client avatars"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'client_profile_image');

CREATE POLICY "Anon can delete client avatars"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'client_profile_image');

CREATE POLICY "Authenticated users can upload client avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client_profile_image');

CREATE POLICY "Authenticated users can update client avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client_profile_image');

CREATE POLICY "Authenticated users can delete client avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client_profile_image');

-- Drop old patient-document policies and any existing client-document policies (idempotent)
DROP POLICY IF EXISTS "Public read access for patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for client documents" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update client documents" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;

-- Create policies for client-documents
CREATE POLICY "Public read access for client documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-documents');

CREATE POLICY "Anon can upload client documents"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Anon can update client documents"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'client-documents');

CREATE POLICY "Anon can delete client documents"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can update client documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can delete client documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-documents');
