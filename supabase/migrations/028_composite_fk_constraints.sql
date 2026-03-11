-- ============================================================
-- Migration 028: Composite FK constraints for cross-tenant integrity
-- Prevents rows in dependent tables from referencing an entity
-- that belongs to a different agency.
--
-- Run AFTER migration 027 (agency_id is NOT NULL everywhere).
-- ============================================================

-- ============================================================
-- Step 1: Add composite UNIQUE constraints to root tables
-- These are referenced by the composite FKs below.
-- ============================================================

ALTER TABLE public.clients
  ADD CONSTRAINT uq_clients_id_agency UNIQUE (id, agency_id);

ALTER TABLE public.employees
  ADD CONSTRAINT uq_employees_id_agency UNIQUE (id, agency_id);

-- ============================================================
-- Step 2: Drop existing simple FKs that will be replaced by composite FKs
-- Only drop the FKs that we're upgrading to composite; leave the rest.
-- ============================================================

-- evv_visits → clients
ALTER TABLE public.evv_visits
  DROP CONSTRAINT IF EXISTS evv_visits_client_id_fkey;

-- evv_visits → employees
ALTER TABLE public.evv_visits
  DROP CONSTRAINT IF EXISTS evv_visits_employee_id_fkey;

-- schedule_events → clients
ALTER TABLE public.schedule_events
  DROP CONSTRAINT IF EXISTS schedule_events_client_id_fkey;

-- schedule_events → employees (caregiver)
ALTER TABLE public.schedule_events
  DROP CONSTRAINT IF EXISTS schedule_events_caregiver_id_fkey;

-- billing_invoices → clients
ALTER TABLE public.billing_invoices
  DROP CONSTRAINT IF EXISTS billing_invoices_client_id_fkey;

-- billing_claims → clients
ALTER TABLE public.billing_claims
  DROP CONSTRAINT IF EXISTS billing_claims_client_id_fkey;

-- client_documents → clients
ALTER TABLE public.client_documents
  DROP CONSTRAINT IF EXISTS client_documents_client_id_fkey;

-- client_guardians → clients
ALTER TABLE public.client_guardians
  DROP CONSTRAINT IF EXISTS client_guardians_client_id_fkey;

-- client_onboarding_items → clients
ALTER TABLE public.client_onboarding_items
  DROP CONSTRAINT IF EXISTS client_onboarding_items_client_id_fkey;

-- client_payer_assignments → clients
ALTER TABLE public.client_payer_assignments
  DROP CONSTRAINT IF EXISTS client_payer_assignments_client_id_fkey;

-- employee_documents → employees
ALTER TABLE public.employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_employee_id_fkey;

-- employee_verifications → employees
ALTER TABLE public.employee_verifications
  DROP CONSTRAINT IF EXISTS employee_verifications_employee_id_fkey;

-- schedule_time_off → employees
ALTER TABLE public.schedule_time_off
  DROP CONSTRAINT IF EXISTS schedule_time_off_employee_id_fkey;

-- ============================================================
-- Step 3: Add composite FK constraints
-- ============================================================

-- evv_visits
ALTER TABLE public.evv_visits
  ADD CONSTRAINT fk_evv_visits_client_agency
    FOREIGN KEY (client_id, agency_id) REFERENCES public.clients(id, agency_id);

ALTER TABLE public.evv_visits
  ADD CONSTRAINT fk_evv_visits_employee_agency
    FOREIGN KEY (employee_id, agency_id) REFERENCES public.employees(id, agency_id);

-- schedule_events (client_id is nullable — open shifts have no client)
ALTER TABLE public.schedule_events
  ADD CONSTRAINT fk_schedule_events_client_agency
    FOREIGN KEY (client_id, agency_id) REFERENCES public.clients(id, agency_id)
    DEFERRABLE INITIALLY DEFERRED;

-- schedule_events caregiver (also nullable — open shifts)
ALTER TABLE public.schedule_events
  ADD CONSTRAINT fk_schedule_events_caregiver_agency
    FOREIGN KEY (caregiver_id, agency_id) REFERENCES public.employees(id, agency_id)
    DEFERRABLE INITIALLY DEFERRED;

-- billing_invoices
ALTER TABLE public.billing_invoices
  ADD CONSTRAINT fk_billing_invoices_client_agency
    FOREIGN KEY (client_id, agency_id) REFERENCES public.clients(id, agency_id);

-- billing_claims
ALTER TABLE public.billing_claims
  ADD CONSTRAINT fk_billing_claims_client_agency
    FOREIGN KEY (client_id, agency_id) REFERENCES public.clients(id, agency_id);

-- client_documents
ALTER TABLE public.client_documents
  ADD CONSTRAINT fk_client_documents_client_agency
    FOREIGN KEY (client_id, agency_id) REFERENCES public.clients(id, agency_id)
    ON DELETE CASCADE;

-- client_guardians
ALTER TABLE public.client_guardians
  ADD CONSTRAINT fk_client_guardians_client_agency
    FOREIGN KEY (client_id, agency_id) REFERENCES public.clients(id, agency_id)
    ON DELETE CASCADE;

-- client_onboarding_items
ALTER TABLE public.client_onboarding_items
  ADD CONSTRAINT fk_client_onboarding_items_client_agency
    FOREIGN KEY (client_id, agency_id) REFERENCES public.clients(id, agency_id)
    ON DELETE CASCADE;

-- client_payer_assignments
ALTER TABLE public.client_payer_assignments
  ADD CONSTRAINT fk_client_payer_assignments_client_agency
    FOREIGN KEY (client_id, agency_id) REFERENCES public.clients(id, agency_id)
    ON DELETE CASCADE;

-- employee_documents
ALTER TABLE public.employee_documents
  ADD CONSTRAINT fk_employee_documents_employee_agency
    FOREIGN KEY (employee_id, agency_id) REFERENCES public.employees(id, agency_id)
    ON DELETE CASCADE;

-- employee_verifications
ALTER TABLE public.employee_verifications
  ADD CONSTRAINT fk_employee_verifications_employee_agency
    FOREIGN KEY (employee_id, agency_id) REFERENCES public.employees(id, agency_id)
    ON DELETE CASCADE;

-- schedule_time_off
ALTER TABLE public.schedule_time_off
  ADD CONSTRAINT fk_schedule_time_off_employee_agency
    FOREIGN KEY (employee_id, agency_id) REFERENCES public.employees(id, agency_id)
    ON DELETE CASCADE;
