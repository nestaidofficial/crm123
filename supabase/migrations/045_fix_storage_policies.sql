-- Fix: Recreate storage policies dropped by migration 030_lockdown_storage_and_anon.sql
-- That migration dropped ALL policies on storage.objects but never recreated
-- authenticated-user policies, blocking all avatar uploads/reads.

-- client_profile_image
CREATE POLICY "auth_select_client_profile_image" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client_profile_image');

CREATE POLICY "auth_insert_client_profile_image" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client_profile_image');

CREATE POLICY "auth_update_client_profile_image" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'client_profile_image')
  WITH CHECK (bucket_id = 'client_profile_image');

CREATE POLICY "auth_delete_client_profile_image" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client_profile_image');

-- employee_profile_image
CREATE POLICY "auth_select_employee_profile_image" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'employee_profile_image');

CREATE POLICY "auth_insert_employee_profile_image" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee_profile_image');

CREATE POLICY "auth_update_employee_profile_image" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'employee_profile_image')
  WITH CHECK (bucket_id = 'employee_profile_image');

CREATE POLICY "auth_delete_employee_profile_image" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'employee_profile_image');

-- admin_profile_images
CREATE POLICY "auth_select_admin_profile_images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'admin_profile_images');

CREATE POLICY "auth_insert_admin_profile_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'admin_profile_images');

CREATE POLICY "auth_update_admin_profile_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'admin_profile_images')
  WITH CHECK (bucket_id = 'admin_profile_images');

CREATE POLICY "auth_delete_admin_profile_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'admin_profile_images');
