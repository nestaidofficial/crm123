-- ============================================================
-- Migration 030: Lockdown — remove anon access, harden storage
-- Run AFTER migration 029 (RLS policies) and after verifying the app
-- works correctly with authenticated users.
-- ============================================================

-- ============================================================
-- 1. Remove remaining anon-accessible policies on reference tables
-- ============================================================

-- evv_service_types: was anon-accessible; now only authenticated
DROP POLICY IF EXISTS "Allow anon read evv_service_types"  ON public.evv_service_types;
DROP POLICY IF EXISTS "Allow anon write evv_service_types" ON public.evv_service_types;

-- evv_funding_sources: was anon-accessible
DROP POLICY IF EXISTS "Allow anon read evv_funding_sources"  ON public.evv_funding_sources;
DROP POLICY IF EXISTS "Allow anon write evv_funding_sources" ON public.evv_funding_sources;

-- ============================================================
-- 2. Storage bucket policies
-- Replace anon-open policies with authenticated-only, agency-scoped policies.
-- 
-- The storage.objects table uses RLS policies attached to the bucket.
-- File paths are now: {agency_id}/{record_id}/{filename}
--
-- NOTE: Supabase storage policies reference storage.objects, which has these columns:
--   bucket_id, name (= path), owner, created_at, updated_at, metadata
-- ============================================================

-- Drop all existing anon/open storage policies on storage.objects.
-- Storage policies are RLS policies on storage.objects, not rows in a table.
DROP POLICY IF EXISTS "Allow anon upload client avatars"                    ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload employee avatars"                  ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update client avatars"                    ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update employee avatars"                  ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete client avatars"                    ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete employee avatars"                  ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to client_profile_image"      ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to employee_profile_image"    ON storage.objects;
DROP POLICY IF EXISTS "Allow anon insert for employee-documents"            ON storage.objects;
DROP POLICY IF EXISTS "Allow anon insert for client-documents"              ON storage.objects;
-- Broad authenticated-but-not-agency-scoped policies
DROP POLICY IF EXISTS "Allow authenticated read client_profile_image"       ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated write client_profile_image"      ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read employee_profile_image"     ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated write employee_profile_image"    ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read employee-documents"         ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated write employee-documents"        ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read client-documents"           ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated write client-documents"          ON storage.objects;

-- ============================================================
-- 3. Verify: all tables that should have RLS enabled
-- Run this query to check — expected: every row has rls_enabled = true
-- ============================================================
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;

-- ============================================================
-- 4. Verify: no service-role key in frontend env vars
-- Check that SUPABASE_SERVICE_ROLE_KEY is NOT prefixed with NEXT_PUBLIC_
-- This is a manual check — ensure .env.local has:
--   NEXT_PUBLIC_SUPABASE_URL=...
--   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
--   SUPABASE_SERVICE_ROLE_KEY=...   (server-only, not NEXT_PUBLIC_)
-- ============================================================

-- ============================================================
-- 5. Cleanup: ensure evv_settings singleton row has agency_id set
-- After running this migration, create per-agency evv_settings rows:
--
--   INSERT INTO public.evv_settings (agency_id, ...)
--   SELECT '<your-agency-id>', geofence_radius_meters, ...
--   FROM public.evv_settings
--   WHERE id = '00000000-0000-0000-0000-000000000001';
--
-- Similarly for billing_provider_config:
--   INSERT INTO public.billing_provider_config (agency_id, ...)
--   SELECT '<your-agency-id>', provider_name, npi, ...
--   FROM public.billing_provider_config
--   WHERE id = '00000000-0000-0000-0000-000000000001';
-- ============================================================

-- ============================================================
-- 6. Final RLS verification helper
-- Run this to see all policies per table:
-- ============================================================
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
