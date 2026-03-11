-- ============================================================
-- Migration 029: Full RBAC Row Level Security policies
-- Run AFTER migrations 023–028.
--
-- Access model: office-only SaaS.
-- Only staff roles have login access:
--   owner / admin       → full access to agency data
--   coordinator         → schedule + evv + clients (no billing, no HR docs)
--   billing             → billing tables + client basics
--   hr                  → employees + HR docs + client basics
--   viewer              → read-only across most tables
--
-- Caregivers do NOT have SaaS login access.
-- The 'caregiver' app_role is reserved for the enum but is never
-- assigned in agency_members, so no caregiver policies are needed.
-- ============================================================

-- ============================================================
-- Drop all existing permissive policies (anon/authenticated blankets)
-- ============================================================

-- EVV
DROP POLICY IF EXISTS "Allow authenticated read evv_visits"         ON public.evv_visits;
DROP POLICY IF EXISTS "Allow anon read evv_visits"                  ON public.evv_visits;
DROP POLICY IF EXISTS "Allow authenticated insert evv_visits"       ON public.evv_visits;
DROP POLICY IF EXISTS "Allow anon insert evv_visits"                ON public.evv_visits;
DROP POLICY IF EXISTS "Allow authenticated update evv_visits"       ON public.evv_visits;
DROP POLICY IF EXISTS "Allow anon update evv_visits"                ON public.evv_visits;
DROP POLICY IF EXISTS "Allow anon read evv_service_types"           ON public.evv_service_types;
DROP POLICY IF EXISTS "Allow anon read evv_funding_sources"         ON public.evv_funding_sources;
DROP POLICY IF EXISTS "Allow anon read evv_settings"                ON public.evv_settings;
DROP POLICY IF EXISTS "Allow authenticated read evv_settings"       ON public.evv_settings;
DROP POLICY IF EXISTS "Allow authenticated update evv_settings"     ON public.evv_settings;
DROP POLICY IF EXISTS "Allow anon insert evv_audit_log"             ON public.evv_audit_log;
DROP POLICY IF EXISTS "Allow authenticated insert evv_audit_log"    ON public.evv_audit_log;
DROP POLICY IF EXISTS "Allow anon read evv_audit_log"               ON public.evv_audit_log;
DROP POLICY IF EXISTS "Allow authenticated read evv_audit_log"      ON public.evv_audit_log;
DROP POLICY IF EXISTS "Allow anon insert evv_corrections"           ON public.evv_corrections;
DROP POLICY IF EXISTS "Allow authenticated insert evv_corrections"  ON public.evv_corrections;
DROP POLICY IF EXISTS "Allow anon read evv_corrections"             ON public.evv_corrections;
DROP POLICY IF EXISTS "Allow authenticated read evv_corrections"    ON public.evv_corrections;
DROP POLICY IF EXISTS "Allow anon insert evv_exceptions"            ON public.evv_exceptions;
DROP POLICY IF EXISTS "Allow anon read evv_exceptions"              ON public.evv_exceptions;
DROP POLICY IF EXISTS "Allow authenticated read evv_exceptions"     ON public.evv_exceptions;
DROP POLICY IF EXISTS "Allow authenticated update evv_exceptions"   ON public.evv_exceptions;
DROP POLICY IF EXISTS "Allow anon insert evv_gps_captures"          ON public.evv_gps_captures;
DROP POLICY IF EXISTS "Allow authenticated insert evv_gps_captures" ON public.evv_gps_captures;
DROP POLICY IF EXISTS "Allow anon read evv_gps_captures"            ON public.evv_gps_captures;
DROP POLICY IF EXISTS "Allow authenticated read evv_gps_captures"   ON public.evv_gps_captures;

-- Schedule
DROP POLICY IF EXISTS "Allow authenticated full access schedule_events"           ON public.schedule_events;
DROP POLICY IF EXISTS "Allow anon full access schedule_events"                    ON public.schedule_events;
DROP POLICY IF EXISTS "Allow authenticated full access schedule_event_tasks"      ON public.schedule_event_tasks;
DROP POLICY IF EXISTS "Allow anon full access schedule_event_tasks"               ON public.schedule_event_tasks;
DROP POLICY IF EXISTS "Allow authenticated full access schedule_recurrence_rules" ON public.schedule_recurrence_rules;
DROP POLICY IF EXISTS "Allow authenticated full access schedule_event_exceptions" ON public.schedule_event_exceptions;
DROP POLICY IF EXISTS "Allow authenticated full access schedule_time_off"         ON public.schedule_time_off;
DROP POLICY IF EXISTS "Allow authenticated full access schedule_audit_log"        ON public.schedule_audit_log;

-- Billing
DROP POLICY IF EXISTS "Allow authenticated read billing_payers"              ON public.billing_payers;
DROP POLICY IF EXISTS "Allow anon read billing_payers"                       ON public.billing_payers;
DROP POLICY IF EXISTS "Allow authenticated write billing_payers"             ON public.billing_payers;
DROP POLICY IF EXISTS "Allow anon write billing_payers"                      ON public.billing_payers;
DROP POLICY IF EXISTS "Allow authenticated read billing_service_codes"       ON public.billing_service_codes;
DROP POLICY IF EXISTS "Allow anon read billing_service_codes"                ON public.billing_service_codes;
DROP POLICY IF EXISTS "Allow authenticated write billing_service_codes"      ON public.billing_service_codes;
DROP POLICY IF EXISTS "Allow anon write billing_service_codes"               ON public.billing_service_codes;
DROP POLICY IF EXISTS "Allow authenticated read client_payer_assignments"    ON public.client_payer_assignments;
DROP POLICY IF EXISTS "Allow anon read client_payer_assignments"             ON public.client_payer_assignments;
DROP POLICY IF EXISTS "Allow authenticated write client_payer_assignments"   ON public.client_payer_assignments;
DROP POLICY IF EXISTS "Allow anon write client_payer_assignments"            ON public.client_payer_assignments;
DROP POLICY IF EXISTS "Allow authenticated read billing_provider_config"     ON public.billing_provider_config;
DROP POLICY IF EXISTS "Allow anon read billing_provider_config"              ON public.billing_provider_config;
DROP POLICY IF EXISTS "Allow authenticated write billing_provider_config"    ON public.billing_provider_config;
DROP POLICY IF EXISTS "Allow anon write billing_provider_config"             ON public.billing_provider_config;
DROP POLICY IF EXISTS "Allow authenticated read billing_invoices"            ON public.billing_invoices;
DROP POLICY IF EXISTS "Allow anon read billing_invoices"                     ON public.billing_invoices;
DROP POLICY IF EXISTS "Allow authenticated write billing_invoices"           ON public.billing_invoices;
DROP POLICY IF EXISTS "Allow anon write billing_invoices"                    ON public.billing_invoices;
DROP POLICY IF EXISTS "Allow authenticated read billing_invoice_lines"       ON public.billing_invoice_lines;
DROP POLICY IF EXISTS "Allow anon read billing_invoice_lines"                ON public.billing_invoice_lines;
DROP POLICY IF EXISTS "Allow authenticated write billing_invoice_lines"      ON public.billing_invoice_lines;
DROP POLICY IF EXISTS "Allow anon write billing_invoice_lines"               ON public.billing_invoice_lines;
DROP POLICY IF EXISTS "Allow authenticated read billing_claims"              ON public.billing_claims;
DROP POLICY IF EXISTS "Allow anon read billing_claims"                       ON public.billing_claims;
DROP POLICY IF EXISTS "Allow authenticated write billing_claims"             ON public.billing_claims;
DROP POLICY IF EXISTS "Allow anon write billing_claims"                      ON public.billing_claims;
DROP POLICY IF EXISTS "Allow authenticated read billing_claim_lines"         ON public.billing_claim_lines;
DROP POLICY IF EXISTS "Allow anon read billing_claim_lines"                  ON public.billing_claim_lines;
DROP POLICY IF EXISTS "Allow authenticated write billing_claim_lines"        ON public.billing_claim_lines;
DROP POLICY IF EXISTS "Allow anon write billing_claim_lines"                 ON public.billing_claim_lines;
DROP POLICY IF EXISTS "Allow authenticated read billing_payments"            ON public.billing_payments;
DROP POLICY IF EXISTS "Allow anon read billing_payments"                     ON public.billing_payments;
DROP POLICY IF EXISTS "Allow authenticated write billing_payments"           ON public.billing_payments;
DROP POLICY IF EXISTS "Allow anon write billing_payments"                    ON public.billing_payments;

-- ============================================================
-- Drop any previously-created 029 policies so this script is
-- safe to re-run (idempotent).
-- ============================================================

-- Clients
DROP POLICY IF EXISTS "clients_select"                        ON public.clients;
DROP POLICY IF EXISTS "clients_select_staff"                  ON public.clients;
DROP POLICY IF EXISTS "clients_select_caregiver"              ON public.clients;
DROP POLICY IF EXISTS "clients_insert"                        ON public.clients;
DROP POLICY IF EXISTS "clients_update"                        ON public.clients;
DROP POLICY IF EXISTS "clients_delete"                        ON public.clients;

-- Employees
DROP POLICY IF EXISTS "employees_select"                      ON public.employees;
DROP POLICY IF EXISTS "employees_select_staff"                ON public.employees;
DROP POLICY IF EXISTS "employees_select_caregiver"            ON public.employees;
DROP POLICY IF EXISTS "employees_insert"                      ON public.employees;
DROP POLICY IF EXISTS "employees_update"                      ON public.employees;
DROP POLICY IF EXISTS "employees_delete"                      ON public.employees;

-- Client documents
DROP POLICY IF EXISTS "client_documents_select"               ON public.client_documents;
DROP POLICY IF EXISTS "client_documents_insert"               ON public.client_documents;
DROP POLICY IF EXISTS "client_documents_update"               ON public.client_documents;
DROP POLICY IF EXISTS "client_documents_delete"               ON public.client_documents;

-- Client guardians / onboarding / payer assignments
DROP POLICY IF EXISTS "client_guardians_select"               ON public.client_guardians;
DROP POLICY IF EXISTS "client_guardians_write"                ON public.client_guardians;
DROP POLICY IF EXISTS "client_onboarding_items_select"        ON public.client_onboarding_items;
DROP POLICY IF EXISTS "client_onboarding_items_write"         ON public.client_onboarding_items;
DROP POLICY IF EXISTS "client_payer_assignments_select"       ON public.client_payer_assignments;
DROP POLICY IF EXISTS "client_payer_assignments_write"        ON public.client_payer_assignments;

-- Employee documents / verifications
DROP POLICY IF EXISTS "employee_documents_select"             ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_select_staff"       ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_select_own"         ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_write"              ON public.employee_documents;
DROP POLICY IF EXISTS "employee_verifications_select"         ON public.employee_verifications;
DROP POLICY IF EXISTS "employee_verifications_write"          ON public.employee_verifications;

-- Schedule events
DROP POLICY IF EXISTS "schedule_events_select"                ON public.schedule_events;
DROP POLICY IF EXISTS "schedule_events_select_staff"          ON public.schedule_events;
DROP POLICY IF EXISTS "schedule_events_select_caregiver"      ON public.schedule_events;
DROP POLICY IF EXISTS "schedule_events_insert"                ON public.schedule_events;
DROP POLICY IF EXISTS "schedule_events_update"                ON public.schedule_events;
DROP POLICY IF EXISTS "schedule_events_delete"                ON public.schedule_events;

-- Schedule supporting tables
DROP POLICY IF EXISTS "schedule_event_tasks_select"           ON public.schedule_event_tasks;
DROP POLICY IF EXISTS "schedule_event_tasks_write"            ON public.schedule_event_tasks;
DROP POLICY IF EXISTS "schedule_event_exceptions_select"      ON public.schedule_event_exceptions;
DROP POLICY IF EXISTS "schedule_event_exceptions_write"       ON public.schedule_event_exceptions;
DROP POLICY IF EXISTS "schedule_recurrence_rules_select"      ON public.schedule_recurrence_rules;
DROP POLICY IF EXISTS "schedule_recurrence_rules_write"       ON public.schedule_recurrence_rules;
DROP POLICY IF EXISTS "schedule_audit_log_select"             ON public.schedule_audit_log;
DROP POLICY IF EXISTS "schedule_audit_log_insert"             ON public.schedule_audit_log;

-- Schedule time off
DROP POLICY IF EXISTS "schedule_time_off_select"              ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_select_staff"        ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_select_caregiver"    ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_insert"              ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_insert_staff"        ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_insert_caregiver"    ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_update"              ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_delete"              ON public.schedule_time_off;

-- EVV visits
DROP POLICY IF EXISTS "evv_visits_select"                     ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_select_staff"               ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_select_caregiver"           ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_insert"                     ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_insert_staff"               ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_insert_caregiver"           ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_update"                     ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_update_staff"               ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_update_caregiver"           ON public.evv_visits;

-- EVV supporting tables
DROP POLICY IF EXISTS "evv_audit_log_select"                  ON public.evv_audit_log;
DROP POLICY IF EXISTS "evv_audit_log_select_staff"            ON public.evv_audit_log;
DROP POLICY IF EXISTS "evv_audit_log_select_caregiver"        ON public.evv_audit_log;
DROP POLICY IF EXISTS "evv_audit_log_insert"                  ON public.evv_audit_log;
DROP POLICY IF EXISTS "evv_corrections_select"                ON public.evv_corrections;
DROP POLICY IF EXISTS "evv_corrections_select_staff"          ON public.evv_corrections;
DROP POLICY IF EXISTS "evv_corrections_select_caregiver"      ON public.evv_corrections;
DROP POLICY IF EXISTS "evv_corrections_insert"                ON public.evv_corrections;
DROP POLICY IF EXISTS "evv_exceptions_select"                 ON public.evv_exceptions;
DROP POLICY IF EXISTS "evv_exceptions_select_staff"           ON public.evv_exceptions;
DROP POLICY IF EXISTS "evv_exceptions_select_caregiver"       ON public.evv_exceptions;
DROP POLICY IF EXISTS "evv_exceptions_insert"                 ON public.evv_exceptions;
DROP POLICY IF EXISTS "evv_exceptions_update"                 ON public.evv_exceptions;
DROP POLICY IF EXISTS "evv_gps_captures_select"               ON public.evv_gps_captures;
DROP POLICY IF EXISTS "evv_gps_captures_select_staff"         ON public.evv_gps_captures;
DROP POLICY IF EXISTS "evv_gps_captures_select_caregiver"     ON public.evv_gps_captures;
DROP POLICY IF EXISTS "evv_gps_captures_insert"               ON public.evv_gps_captures;
DROP POLICY IF EXISTS "evv_settings_select"                   ON public.evv_settings;
DROP POLICY IF EXISTS "evv_settings_write"                    ON public.evv_settings;
DROP POLICY IF EXISTS "evv_service_types_select"              ON public.evv_service_types;
DROP POLICY IF EXISTS "evv_funding_sources_select"            ON public.evv_funding_sources;

-- Billing tables
DROP POLICY IF EXISTS "billing_payers_select"                 ON public.billing_payers;
DROP POLICY IF EXISTS "billing_payers_write"                  ON public.billing_payers;
DROP POLICY IF EXISTS "billing_service_codes_select"          ON public.billing_service_codes;
DROP POLICY IF EXISTS "billing_service_codes_write"           ON public.billing_service_codes;
DROP POLICY IF EXISTS "billing_provider_config_select"        ON public.billing_provider_config;
DROP POLICY IF EXISTS "billing_provider_config_write"         ON public.billing_provider_config;
DROP POLICY IF EXISTS "billing_invoices_select"               ON public.billing_invoices;
DROP POLICY IF EXISTS "billing_invoices_write"                ON public.billing_invoices;
DROP POLICY IF EXISTS "billing_invoice_lines_select"          ON public.billing_invoice_lines;
DROP POLICY IF EXISTS "billing_invoice_lines_write"           ON public.billing_invoice_lines;
DROP POLICY IF EXISTS "billing_claims_select"                 ON public.billing_claims;
DROP POLICY IF EXISTS "billing_claims_write"                  ON public.billing_claims;
DROP POLICY IF EXISTS "billing_claim_lines_select"            ON public.billing_claim_lines;
DROP POLICY IF EXISTS "billing_claim_lines_write"             ON public.billing_claim_lines;
DROP POLICY IF EXISTS "billing_payments_select"               ON public.billing_payments;
DROP POLICY IF EXISTS "billing_payments_write"                ON public.billing_payments;

-- ============================================================
-- Enable RLS on all tables that don't have it yet
-- ============================================================

ALTER TABLE public.clients                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_guardians         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_onboarding_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evv_visits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evv_audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evv_corrections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evv_exceptions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evv_gps_captures         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evv_settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evv_service_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evv_funding_sources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_event_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_event_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_time_off        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoice_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_claims           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_claim_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_service_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_provider_config  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CLIENTS
-- staff (owner/admin/coordinator/billing/hr/viewer) = full read
-- coordinator/admin/hr/owner = write
-- ============================================================

CREATE POLICY "clients_select" ON public.clients
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT WITH CHECK (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','hr']::public.app_role[])
  );

CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','hr']::public.app_role[])
  );

CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[])
  );

-- ============================================================
-- EMPLOYEES
-- ============================================================

CREATE POLICY "employees_select" ON public.employees
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "employees_insert" ON public.employees
  FOR INSERT WITH CHECK (
    public.has_agency_role(agency_id, ARRAY['owner','admin','hr']::public.app_role[])
  );

CREATE POLICY "employees_update" ON public.employees
  FOR UPDATE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','hr']::public.app_role[])
  );

CREATE POLICY "employees_delete" ON public.employees
  FOR DELETE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[])
  );

-- ============================================================
-- CLIENT DOCUMENTS
-- ============================================================

CREATE POLICY "client_documents_select" ON public.client_documents
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','billing','hr','viewer']::public.app_role[])
  );

CREATE POLICY "client_documents_insert" ON public.client_documents
  FOR INSERT WITH CHECK (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','hr']::public.app_role[])
  );

CREATE POLICY "client_documents_update" ON public.client_documents
  FOR UPDATE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','hr']::public.app_role[])
  );

CREATE POLICY "client_documents_delete" ON public.client_documents
  FOR DELETE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[])
  );

-- ============================================================
-- CLIENT GUARDIANS, ONBOARDING, PAYER ASSIGNMENTS
-- ============================================================

CREATE POLICY "client_guardians_select" ON public.client_guardians
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "client_guardians_write" ON public.client_guardians
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','hr']::public.app_role[])
  );

CREATE POLICY "client_onboarding_items_select" ON public.client_onboarding_items
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "client_onboarding_items_write" ON public.client_onboarding_items
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','hr']::public.app_role[])
  );

CREATE POLICY "client_payer_assignments_select" ON public.client_payer_assignments
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing','coordinator','hr','viewer']::public.app_role[])
  );

CREATE POLICY "client_payer_assignments_write" ON public.client_payer_assignments
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing']::public.app_role[])
  );

-- ============================================================
-- EMPLOYEE DOCUMENTS + VERIFICATIONS
-- hr/admin/owner = read + write; viewer = read-only
-- ============================================================

CREATE POLICY "employee_documents_select" ON public.employee_documents
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','hr','viewer']::public.app_role[])
  );

CREATE POLICY "employee_documents_write" ON public.employee_documents
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','hr']::public.app_role[])
  );

CREATE POLICY "employee_verifications_select" ON public.employee_verifications
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','hr','viewer']::public.app_role[])
  );

CREATE POLICY "employee_verifications_write" ON public.employee_verifications
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','hr']::public.app_role[])
  );

-- ============================================================
-- SCHEDULE EVENTS
-- coordinator/admin/owner = full control; viewer/billing/hr = read-only
-- ============================================================

CREATE POLICY "schedule_events_select" ON public.schedule_events
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "schedule_events_insert" ON public.schedule_events
  FOR INSERT WITH CHECK (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator']::public.app_role[])
  );

CREATE POLICY "schedule_events_update" ON public.schedule_events
  FOR UPDATE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator']::public.app_role[])
  );

CREATE POLICY "schedule_events_delete" ON public.schedule_events
  FOR DELETE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator']::public.app_role[])
  );

-- ============================================================
-- SCHEDULE SUPPORTING TABLES
-- ============================================================

CREATE POLICY "schedule_event_tasks_select" ON public.schedule_event_tasks
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "schedule_event_tasks_write" ON public.schedule_event_tasks
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator']::public.app_role[])
  );

CREATE POLICY "schedule_event_exceptions_select" ON public.schedule_event_exceptions
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "schedule_event_exceptions_write" ON public.schedule_event_exceptions
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator']::public.app_role[])
  );

CREATE POLICY "schedule_recurrence_rules_select" ON public.schedule_recurrence_rules
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "schedule_recurrence_rules_write" ON public.schedule_recurrence_rules
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator']::public.app_role[])
  );

CREATE POLICY "schedule_audit_log_select" ON public.schedule_audit_log
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "schedule_audit_log_insert" ON public.schedule_audit_log
  FOR INSERT WITH CHECK (public.is_staff(agency_id));

-- ============================================================
-- SCHEDULE TIME OFF
-- staff manages time-off requests on behalf of field employees
-- ============================================================

CREATE POLICY "schedule_time_off_select" ON public.schedule_time_off
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "schedule_time_off_insert" ON public.schedule_time_off
  FOR INSERT WITH CHECK (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','hr']::public.app_role[])
  );

CREATE POLICY "schedule_time_off_update" ON public.schedule_time_off
  FOR UPDATE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','hr']::public.app_role[])
  );

CREATE POLICY "schedule_time_off_delete" ON public.schedule_time_off
  FOR DELETE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','hr']::public.app_role[])
  );

-- ============================================================
-- EVV VISITS
-- coordinator/admin/owner = full; billing = read + update for claims;
-- viewer/hr = read-only
-- ============================================================

CREATE POLICY "evv_visits_select" ON public.evv_visits
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "evv_visits_insert" ON public.evv_visits
  FOR INSERT WITH CHECK (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','billing']::public.app_role[])
  );

CREATE POLICY "evv_visits_update" ON public.evv_visits
  FOR UPDATE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','billing']::public.app_role[])
  );

-- ============================================================
-- EVV SUPPORTING TABLES
-- ============================================================

CREATE POLICY "evv_audit_log_select" ON public.evv_audit_log
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "evv_audit_log_insert" ON public.evv_audit_log
  FOR INSERT WITH CHECK (public.is_staff(agency_id));

CREATE POLICY "evv_corrections_select" ON public.evv_corrections
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "evv_corrections_insert" ON public.evv_corrections
  FOR INSERT WITH CHECK (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator']::public.app_role[])
  );

CREATE POLICY "evv_exceptions_select" ON public.evv_exceptions
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "evv_exceptions_insert" ON public.evv_exceptions
  FOR INSERT WITH CHECK (public.is_staff(agency_id));

CREATE POLICY "evv_exceptions_update" ON public.evv_exceptions
  FOR UPDATE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator']::public.app_role[])
  );

CREATE POLICY "evv_gps_captures_select" ON public.evv_gps_captures
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "evv_gps_captures_insert" ON public.evv_gps_captures
  FOR INSERT WITH CHECK (public.is_staff(agency_id));

-- evv_settings: per-agency settings
CREATE POLICY "evv_settings_select" ON public.evv_settings
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "evv_settings_write" ON public.evv_settings
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[])
  );

-- Reference tables: all authenticated staff can read (no agency filter)
CREATE POLICY "evv_service_types_select" ON public.evv_service_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "evv_funding_sources_select" ON public.evv_funding_sources
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- BILLING TABLES
-- ============================================================

CREATE POLICY "billing_payers_select" ON public.billing_payers
  FOR SELECT USING (
    agency_id IS NULL  -- global seed payers visible to all authenticated users
    OR public.has_agency_role(agency_id, ARRAY['owner','admin','billing','coordinator','viewer']::public.app_role[])
  );

CREATE POLICY "billing_payers_write" ON public.billing_payers
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing']::public.app_role[])
  );

CREATE POLICY "billing_service_codes_select" ON public.billing_service_codes
  FOR SELECT USING (
    agency_id IS NULL
    OR public.has_agency_role(agency_id, ARRAY['owner','admin','billing','coordinator','viewer']::public.app_role[])
  );

CREATE POLICY "billing_service_codes_write" ON public.billing_service_codes
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing']::public.app_role[])
  );

CREATE POLICY "billing_provider_config_select" ON public.billing_provider_config
  FOR SELECT USING (
    agency_id IS NULL
    OR public.has_agency_role(agency_id, ARRAY['owner','admin','billing','viewer']::public.app_role[])
  );

CREATE POLICY "billing_provider_config_write" ON public.billing_provider_config
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[])
  );

CREATE POLICY "billing_invoices_select" ON public.billing_invoices
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing','coordinator','viewer']::public.app_role[])
  );

CREATE POLICY "billing_invoices_write" ON public.billing_invoices
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing']::public.app_role[])
  );

CREATE POLICY "billing_invoice_lines_select" ON public.billing_invoice_lines
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing','coordinator','viewer']::public.app_role[])
  );

CREATE POLICY "billing_invoice_lines_write" ON public.billing_invoice_lines
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing']::public.app_role[])
  );

CREATE POLICY "billing_claims_select" ON public.billing_claims
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing','coordinator','viewer']::public.app_role[])
  );

CREATE POLICY "billing_claims_write" ON public.billing_claims
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing']::public.app_role[])
  );

CREATE POLICY "billing_claim_lines_select" ON public.billing_claim_lines
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing','coordinator','viewer']::public.app_role[])
  );

CREATE POLICY "billing_claim_lines_write" ON public.billing_claim_lines
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing']::public.app_role[])
  );

CREATE POLICY "billing_payments_select" ON public.billing_payments
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing','coordinator','viewer']::public.app_role[])
  );

CREATE POLICY "billing_payments_write" ON public.billing_payments
  FOR ALL USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','billing']::public.app_role[])
  );

-- ============================================================
-- Storage bucket policies (replacement for anon-open policies)
-- Scoped to authenticated staff users within the agency.
-- ============================================================

-- NOTE: Storage bucket RLS is managed via Supabase Dashboard or separate
-- storage policy migrations. The key change is:
--   - Remove any anon policies from client_profile_image, employee_profile_image,
--     employee-documents, client-documents buckets.
--   - Allow authenticated staff users only; enforce path-based agency scoping:
--       {agency_id}/{record_id}/filename
-- This is documented as a manual step in the lockdown phase.
