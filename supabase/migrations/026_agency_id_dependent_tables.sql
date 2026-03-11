-- ============================================================
-- Migration 026: Add agency_id to all agency-owned dependent tables
-- Run AFTER migration 025 (root tables have agency_id).
-- All columns are nullable initially for safe backfill.
-- Migration 027 sets NOT NULL after backfill.
-- ============================================================

-- ============================================================
-- EVV tables
-- ============================================================

ALTER TABLE public.evv_visits
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.evv_audit_log
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.evv_corrections
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.evv_exceptions
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.evv_gps_captures
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

-- evv_settings: convert from singleton to per-agency
-- The existing singleton row (id = 00000000-...) is preserved for compatibility
ALTER TABLE public.evv_settings
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- ============================================================
-- Schedule tables
-- ============================================================

ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.schedule_audit_log
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.schedule_event_exceptions
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.schedule_event_tasks
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.schedule_time_off
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.schedule_recurrence_rules
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

-- ============================================================
-- Billing tables
-- ============================================================

ALTER TABLE public.billing_invoices
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.billing_invoice_lines
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.billing_claims
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.billing_claim_lines
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.billing_payments
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.billing_service_codes
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.billing_payers
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

-- billing_provider_config: convert from singleton to per-agency
ALTER TABLE public.billing_provider_config
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- ============================================================
-- Documents and client admin tables
-- ============================================================

ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.client_guardians
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.client_onboarding_items
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.client_payer_assignments
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

ALTER TABLE public.employee_verifications
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE RESTRICT;

-- ============================================================
-- Backfill: propagate agency_id from root tables
-- Run these UPDATE statements AFTER populating employees.agency_id
-- and clients.agency_id (migration 025 + manual backfill).
-- ============================================================

-- EVV: backfill from clients (evv_visits has client_id)
UPDATE public.evv_visits v
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE v.client_id = c.id
    AND v.agency_id IS NULL
    AND c.agency_id IS NOT NULL;

-- EVV child tables: backfill from evv_visits
UPDATE public.evv_audit_log a
  SET agency_id = v.agency_id
  FROM public.evv_visits v
  WHERE a.visit_id = v.id
    AND a.agency_id IS NULL
    AND v.agency_id IS NOT NULL;

UPDATE public.evv_corrections cor
  SET agency_id = v.agency_id
  FROM public.evv_visits v
  WHERE cor.visit_id = v.id
    AND cor.agency_id IS NULL
    AND v.agency_id IS NOT NULL;

UPDATE public.evv_exceptions ex
  SET agency_id = v.agency_id
  FROM public.evv_visits v
  WHERE ex.visit_id = v.id
    AND ex.agency_id IS NULL
    AND v.agency_id IS NOT NULL;

UPDATE public.evv_gps_captures g
  SET agency_id = v.agency_id
  FROM public.evv_visits v
  WHERE g.visit_id = v.id
    AND g.agency_id IS NULL
    AND v.agency_id IS NOT NULL;

-- Schedule: backfill from clients (via client_id) or employees (via caregiver_id)
UPDATE public.schedule_events se
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE se.client_id = c.id
    AND se.agency_id IS NULL
    AND c.agency_id IS NOT NULL;

-- For open shifts without a client, fall back to caregiver
UPDATE public.schedule_events se
  SET agency_id = e.agency_id
  FROM public.employees e
  WHERE se.caregiver_id = e.id
    AND se.agency_id IS NULL
    AND e.agency_id IS NOT NULL;

-- Schedule child tables: backfill from schedule_events
UPDATE public.schedule_audit_log sal
  SET agency_id = se.agency_id
  FROM public.schedule_events se
  WHERE sal.event_id = se.id
    AND sal.agency_id IS NULL
    AND se.agency_id IS NOT NULL;

UPDATE public.schedule_event_exceptions see
  SET agency_id = se.agency_id
  FROM public.schedule_events se
  WHERE see.parent_event_id = se.id
    AND see.agency_id IS NULL
    AND se.agency_id IS NOT NULL;

UPDATE public.schedule_event_tasks set_t
  SET agency_id = se.agency_id
  FROM public.schedule_events se
  WHERE set_t.event_id = se.id
    AND set_t.agency_id IS NULL
    AND se.agency_id IS NOT NULL;

-- schedule_recurrence_rules: backfill from schedule_events
UPDATE public.schedule_recurrence_rules srr
  SET agency_id = se.agency_id
  FROM public.schedule_events se
  WHERE se.recurrence_rule_id = srr.id
    AND srr.agency_id IS NULL
    AND se.agency_id IS NOT NULL;

-- schedule_time_off: backfill from employees
UPDATE public.schedule_time_off sto
  SET agency_id = e.agency_id
  FROM public.employees e
  WHERE sto.employee_id = e.id
    AND sto.agency_id IS NULL
    AND e.agency_id IS NOT NULL;

-- Billing: backfill from clients
UPDATE public.billing_invoices bi
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE bi.client_id = c.id
    AND bi.agency_id IS NULL
    AND c.agency_id IS NOT NULL;

UPDATE public.billing_invoice_lines bil
  SET agency_id = bi.agency_id
  FROM public.billing_invoices bi
  WHERE bil.invoice_id = bi.id
    AND bil.agency_id IS NULL
    AND bi.agency_id IS NOT NULL;

UPDATE public.billing_claims bc
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE bc.client_id = c.id
    AND bc.agency_id IS NULL
    AND c.agency_id IS NOT NULL;

UPDATE public.billing_claim_lines bcl
  SET agency_id = bc.agency_id
  FROM public.billing_claims bc
  WHERE bcl.claim_id = bc.id
    AND bcl.agency_id IS NULL
    AND bc.agency_id IS NOT NULL;

UPDATE public.billing_payments bp
  SET agency_id = bi.agency_id
  FROM public.billing_invoices bi
  WHERE bp.invoice_id = bi.id
    AND bp.agency_id IS NULL
    AND bi.agency_id IS NOT NULL;

-- billing_service_codes: payer-level, backfill from billing_payers (which is backfilled separately)
-- billing_payers: agency-specific payer configs are set manually per agency
-- (global seed payers like MassHealth remain without agency_id until explicitly assigned)

-- Document tables: backfill from clients / employees
UPDATE public.client_documents cd
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE cd.client_id = c.id
    AND cd.agency_id IS NULL
    AND c.agency_id IS NOT NULL;

UPDATE public.employee_documents ed
  SET agency_id = e.agency_id
  FROM public.employees e
  WHERE ed.employee_id = e.id
    AND ed.agency_id IS NULL
    AND e.agency_id IS NOT NULL;

UPDATE public.client_guardians cg
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE cg.client_id = c.id
    AND cg.agency_id IS NULL
    AND c.agency_id IS NOT NULL;

UPDATE public.client_onboarding_items coi
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE coi.client_id = c.id
    AND coi.agency_id IS NULL
    AND c.agency_id IS NOT NULL;

UPDATE public.client_payer_assignments cpa
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE cpa.client_id = c.id
    AND cpa.agency_id IS NULL
    AND c.agency_id IS NOT NULL;

UPDATE public.employee_verifications ev
  SET agency_id = e.agency_id
  FROM public.employees e
  WHERE ev.employee_id = e.id
    AND ev.agency_id IS NULL
    AND e.agency_id IS NOT NULL;
