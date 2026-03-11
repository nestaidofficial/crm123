-- =============================================================================
-- Setup Storage bucket and policies for client profile images
-- Bucket name: client_profile_image
-- =============================================================================

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client_profile_image',
  'client_profile_image',
  true, -- public bucket so avatars are accessible via public URL
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- =============================================================================
-- Storage Policies for client_profile_image bucket
-- =============================================================================

-- Policy: Allow anyone to read/view profile images (public bucket)
CREATE POLICY "Public read access for client avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'client_profile_image');

-- Anon: app uses anon key from browser when not using Supabase Auth
CREATE POLICY "Anon can upload client avatars"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'client_profile_image');
CREATE POLICY "Anon can update client avatars"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'client_profile_image');
CREATE POLICY "Anon can delete client avatars"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'client_profile_image');

-- Authenticated: for when Supabase Auth is used
CREATE POLICY "Authenticated users can upload client avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client_profile_image');
CREATE POLICY "Authenticated users can update client avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client_profile_image');
CREATE POLICY "Authenticated users can delete client avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client_profile_image');

-- =============================================================================
-- Optional: Link clients.avatar_url to bucket (comment only; no strict constraint)
-- =============================================================================

COMMENT ON COLUMN clients.avatar_url IS 'Public URL to client profile image in storage.client_profile_image bucket';

-- Normalize existing rows: set avatar_url to NULL if it's empty or not a valid
-- Supabase Storage URL for our bucket (e.g. old data URLs or empty strings).
UPDATE clients
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND (trim(avatar_url) = '' OR avatar_url NOT LIKE 'http%'
       OR avatar_url NOT LIKE '%client_profile_image%');

-- Optional: Add a check constraint only for NEW values (existing invalid URLs already normalized above).
-- Constraint: avatar_url must be null, or a non-empty URL containing our bucket name.
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_avatar_url_format_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_avatar_url_format_check
  CHECK (
    avatar_url IS NULL OR
    (length(trim(avatar_url)) > 0 AND avatar_url LIKE '%client_profile_image%')
  );
