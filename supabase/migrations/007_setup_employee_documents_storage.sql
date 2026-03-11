-- =============================================================================
-- Setup Storage bucket and policies for employee documents
-- Bucket name: employee-documents
-- =============================================================================

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false, -- private bucket, uses signed URLs for access
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

-- =============================================================================
-- Storage Policies for employee-documents bucket
-- =============================================================================

-- Policy: Service role has full access (bypasses RLS)
-- This is implicit, but we document it here for clarity

-- Anon: app uses anon key from browser when not using Supabase Auth
CREATE POLICY "Anon can upload employee documents"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'employee-documents');

CREATE POLICY "Anon can update employee documents"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'employee-documents');

CREATE POLICY "Anon can delete employee documents"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'employee-documents');

CREATE POLICY "Anon can read employee documents"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'employee-documents');

-- Authenticated: for when Supabase Auth is used
CREATE POLICY "Authenticated users can upload employee documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated users can update employee documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated users can delete employee documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated users can read employee documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'employee-documents');

-- =============================================================================
-- Optional: Link employee_documents.file_path to bucket (comment only)
-- =============================================================================

COMMENT ON COLUMN employee_documents.file_path IS 'Storage path in storage.employee-documents bucket (e.g. {employee_id}/{uuid}-{filename})';

-- Normalize existing rows: set file_path to empty if it doesn't look like a valid path
-- (In case there's any test data)
UPDATE employee_documents
SET file_path = ''
WHERE file_path IS NOT NULL
  AND (trim(file_path) = '' OR file_path LIKE 'http%');

-- Optional: Add a check constraint for file_path format
-- Constraint: file_path must be non-empty and not a URL (should be a storage path)
ALTER TABLE employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_file_path_format_check;

ALTER TABLE employee_documents
  ADD CONSTRAINT employee_documents_file_path_format_check
  CHECK (
    length(trim(file_path)) > 0 AND file_path NOT LIKE 'http%'
  );
