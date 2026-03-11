-- =============================================================================
-- Allow anon role to upload/update/delete in client_profile_image bucket
-- (App uses anon key from browser; only "authenticated" was allowed before.)
-- Run this in Supabase SQL Editor if you get "new row violates row-level security policy".
-- =============================================================================

-- Drop existing policies (in case 003 was run with authenticated-only)
DROP POLICY IF EXISTS "Authenticated users can upload client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete client avatars" ON storage.objects;

-- Allow anon to upload (client uses anon key when not using Supabase Auth)
CREATE POLICY "Anon can upload client avatars"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'client_profile_image');

-- Allow anon to update
CREATE POLICY "Anon can update client avatars"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'client_profile_image');

-- Allow anon to delete
CREATE POLICY "Anon can delete client avatars"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'client_profile_image');

-- Keep authenticated able to do the same (if you add Supabase Auth later)
CREATE POLICY "Authenticated users can upload client avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client_profile_image');

CREATE POLICY "Authenticated users can update client avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client_profile_image');

CREATE POLICY "Authenticated users can delete client avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client_profile_image');
