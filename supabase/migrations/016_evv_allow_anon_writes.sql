-- =============================================================================
-- Allow anon writes on EVV tables
-- =============================================================================
-- The CRM uses the anon key without Supabase Auth. This adds INSERT/UPDATE
-- policies for anon so clock corrections, audit logs, and visit updates work.
-- =============================================================================

CREATE POLICY evv_corrections_insert_anon ON evv_corrections FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY evv_audit_log_insert_anon ON evv_audit_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY evv_visits_update_anon ON evv_visits FOR UPDATE TO anon USING (true);
CREATE POLICY evv_exceptions_update_anon ON evv_exceptions FOR UPDATE TO anon USING (true);
