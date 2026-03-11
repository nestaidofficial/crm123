-- =============================================================================
-- Allow anon reads on EVV tables
-- =============================================================================
-- The CRM currently uses the anon key without Supabase Auth (login is handled
-- at the app level). This migration adds SELECT policies for the anon role so
-- the EVV page can read data without a user session.
-- =============================================================================

CREATE POLICY evv_visits_read_anon ON evv_visits FOR SELECT TO anon USING (true);
CREATE POLICY evv_exceptions_read_anon ON evv_exceptions FOR SELECT TO anon USING (true);
CREATE POLICY evv_gps_captures_read_anon ON evv_gps_captures FOR SELECT TO anon USING (true);
CREATE POLICY evv_corrections_read_anon ON evv_corrections FOR SELECT TO anon USING (true);
CREATE POLICY evv_audit_log_read_anon ON evv_audit_log FOR SELECT TO anon USING (true);
CREATE POLICY evv_service_types_read_anon ON evv_service_types FOR SELECT TO anon USING (true);
CREATE POLICY evv_funding_sources_read_anon ON evv_funding_sources FOR SELECT TO anon USING (true);
CREATE POLICY evv_settings_read_anon ON evv_settings FOR SELECT TO anon USING (true);
