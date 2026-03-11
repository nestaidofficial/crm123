-- ============================================================
-- Migration 031: Remove all caregiver RLS policies
--
-- NessaCRM is an office-only SaaS. Caregivers do not log in.
-- This migration drops every policy that granted caregivers
-- SELECT, INSERT, or UPDATE access.
--
-- It also tightens the policies that previously used
-- is_agency_member() (which included caregivers) and replaces
-- them with is_staff() (owner/admin/coordinator/billing/hr/viewer).
--
-- Safe to run even if 029 was applied before this change.
-- All DROP statements use IF EXISTS.
-- ============================================================

-- ============================================================
-- 1. Drop caregiver-specific policies (added in migration 029)
-- ============================================================

-- Clients
DROP POLICY IF EXISTS "clients_select_caregiver"              ON public.clients;

-- Employees
DROP POLICY IF EXISTS "employees_select_caregiver"            ON public.employees;

-- Employee documents (caregivers reading their own)
DROP POLICY IF EXISTS "employee_documents_select_own"         ON public.employee_documents;

-- Schedule events
DROP POLICY IF EXISTS "schedule_events_select_caregiver"      ON public.schedule_events;

-- Schedule time off (caregivers submitting their own)
DROP POLICY IF EXISTS "schedule_time_off_select_caregiver"    ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_insert_caregiver"    ON public.schedule_time_off;

-- EVV visits
DROP POLICY IF EXISTS "evv_visits_select_caregiver"           ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_insert_caregiver"           ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_update_caregiver"           ON public.evv_visits;

-- EVV supporting tables
DROP POLICY IF EXISTS "evv_audit_log_select_caregiver"        ON public.evv_audit_log;
DROP POLICY IF EXISTS "evv_corrections_select_caregiver"      ON public.evv_corrections;
DROP POLICY IF EXISTS "evv_exceptions_select_caregiver"       ON public.evv_exceptions;
DROP POLICY IF EXISTS "evv_gps_captures_select_caregiver"     ON public.evv_gps_captures;

-- ============================================================
-- 2. Replace is_agency_member() policies with is_staff()
--    so caregivers can no longer sneak in via membership check.
-- ============================================================

-- evv_audit_log insert
DROP POLICY IF EXISTS "evv_audit_log_insert" ON public.evv_audit_log;
CREATE POLICY "evv_audit_log_insert" ON public.evv_audit_log
  FOR INSERT WITH CHECK (public.is_staff(agency_id));

-- evv_exceptions insert
DROP POLICY IF EXISTS "evv_exceptions_insert" ON public.evv_exceptions;
CREATE POLICY "evv_exceptions_insert" ON public.evv_exceptions
  FOR INSERT WITH CHECK (public.is_staff(agency_id));

-- evv_gps_captures insert
DROP POLICY IF EXISTS "evv_gps_captures_insert" ON public.evv_gps_captures;
CREATE POLICY "evv_gps_captures_insert" ON public.evv_gps_captures
  FOR INSERT WITH CHECK (public.is_staff(agency_id));

-- evv_settings select
DROP POLICY IF EXISTS "evv_settings_select" ON public.evv_settings;
CREATE POLICY "evv_settings_select" ON public.evv_settings
  FOR SELECT USING (public.is_staff(agency_id));

-- schedule_event_tasks select
DROP POLICY IF EXISTS "schedule_event_tasks_select" ON public.schedule_event_tasks;
CREATE POLICY "schedule_event_tasks_select" ON public.schedule_event_tasks
  FOR SELECT USING (public.is_staff(agency_id));

-- schedule_recurrence_rules select
DROP POLICY IF EXISTS "schedule_recurrence_rules_select" ON public.schedule_recurrence_rules;
CREATE POLICY "schedule_recurrence_rules_select" ON public.schedule_recurrence_rules
  FOR SELECT USING (public.is_staff(agency_id));

-- ============================================================
-- 3. Consolidate split staff/caregiver policies into single ones
--    (only needed when the old split policies still exist)
-- ============================================================

-- clients: merge _select_staff → _select (if split version exists)
DROP POLICY IF EXISTS "clients_select_staff" ON public.clients;
DROP POLICY IF EXISTS "clients_select"       ON public.clients;
CREATE POLICY "clients_select" ON public.clients
  FOR SELECT USING (public.is_staff(agency_id));

-- employees: merge _select_staff → _select
DROP POLICY IF EXISTS "employees_select_staff" ON public.employees;
DROP POLICY IF EXISTS "employees_select"       ON public.employees;
CREATE POLICY "employees_select" ON public.employees
  FOR SELECT USING (public.is_staff(agency_id));

-- employee_documents: drop old split select, create single staff policy
DROP POLICY IF EXISTS "employee_documents_select_staff" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_select"       ON public.employee_documents;
CREATE POLICY "employee_documents_select" ON public.employee_documents
  FOR SELECT USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','hr','viewer']::public.app_role[])
  );

-- schedule_events: merge _select_staff → _select
DROP POLICY IF EXISTS "schedule_events_select_staff" ON public.schedule_events;
DROP POLICY IF EXISTS "schedule_events_select"       ON public.schedule_events;
CREATE POLICY "schedule_events_select" ON public.schedule_events
  FOR SELECT USING (public.is_staff(agency_id));

-- schedule_time_off: merge _select_staff → _select
DROP POLICY IF EXISTS "schedule_time_off_select_staff" ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_select"       ON public.schedule_time_off;
CREATE POLICY "schedule_time_off_select" ON public.schedule_time_off
  FOR SELECT USING (public.is_staff(agency_id));

-- schedule_time_off insert: drop old staff-only insert, re-create clean
DROP POLICY IF EXISTS "schedule_time_off_insert_staff" ON public.schedule_time_off;
DROP POLICY IF EXISTS "schedule_time_off_insert"       ON public.schedule_time_off;
CREATE POLICY "schedule_time_off_insert" ON public.schedule_time_off
  FOR INSERT WITH CHECK (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','hr']::public.app_role[])
  );

-- evv_visits: merge _select_staff → _select
DROP POLICY IF EXISTS "evv_visits_select_staff" ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_select"       ON public.evv_visits;
CREATE POLICY "evv_visits_select" ON public.evv_visits
  FOR SELECT USING (public.is_staff(agency_id));

-- evv_visits insert: merge _insert_staff → _insert
DROP POLICY IF EXISTS "evv_visits_insert_staff" ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_insert"       ON public.evv_visits;
CREATE POLICY "evv_visits_insert" ON public.evv_visits
  FOR INSERT WITH CHECK (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','billing']::public.app_role[])
  );

-- evv_visits update: merge _update_staff → _update
DROP POLICY IF EXISTS "evv_visits_update_staff" ON public.evv_visits;
DROP POLICY IF EXISTS "evv_visits_update"       ON public.evv_visits;
CREATE POLICY "evv_visits_update" ON public.evv_visits
  FOR UPDATE USING (
    public.has_agency_role(agency_id, ARRAY['owner','admin','coordinator','billing']::public.app_role[])
  );

-- evv_audit_log select: merge _select_staff → _select
DROP POLICY IF EXISTS "evv_audit_log_select_staff" ON public.evv_audit_log;
DROP POLICY IF EXISTS "evv_audit_log_select"       ON public.evv_audit_log;
CREATE POLICY "evv_audit_log_select" ON public.evv_audit_log
  FOR SELECT USING (public.is_staff(agency_id));

-- evv_corrections select: merge _select_staff → _select
DROP POLICY IF EXISTS "evv_corrections_select_staff" ON public.evv_corrections;
DROP POLICY IF EXISTS "evv_corrections_select"       ON public.evv_corrections;
CREATE POLICY "evv_corrections_select" ON public.evv_corrections
  FOR SELECT USING (public.is_staff(agency_id));

-- evv_exceptions select: merge _select_staff → _select
DROP POLICY IF EXISTS "evv_exceptions_select_staff" ON public.evv_exceptions;
DROP POLICY IF EXISTS "evv_exceptions_select"       ON public.evv_exceptions;
CREATE POLICY "evv_exceptions_select" ON public.evv_exceptions
  FOR SELECT USING (public.is_staff(agency_id));

-- evv_gps_captures select: merge _select_staff → _select
DROP POLICY IF EXISTS "evv_gps_captures_select_staff" ON public.evv_gps_captures;
DROP POLICY IF EXISTS "evv_gps_captures_select"       ON public.evv_gps_captures;
CREATE POLICY "evv_gps_captures_select" ON public.evv_gps_captures
  FOR SELECT USING (public.is_staff(agency_id));
