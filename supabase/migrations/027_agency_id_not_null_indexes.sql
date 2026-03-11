-- ============================================================
-- Migration 027: Backfill agency_id + Set NOT NULL + Indexes
--
-- This migration is fully self-contained and safe to run even
-- if existing seed/test data has NULL agency_id values.
--
-- Step 1: Create a seed agency for any pre-existing rows
-- Step 2: Backfill root tables (employees, clients)
-- Step 3: Cascade-backfill all dependent tables
-- Step 4: Set agency_id NOT NULL on every table
-- Step 5: Create indexes
-- ============================================================

-- ============================================================
-- STEP 1: Ensure a seed agency exists for orphaned rows
-- Uses the first agency already in the table, or creates one.
-- ============================================================

DO $$
DECLARE
  v_seed_agency_id UUID;
BEGIN
  -- Try to use any existing agency
  SELECT id INTO v_seed_agency_id
  FROM public.agencies
  ORDER BY created_at
  LIMIT 1;

  -- No agencies yet — create a placeholder so existing data doesn't block us
  IF v_seed_agency_id IS NULL THEN
    INSERT INTO public.agencies (name, slug, settings, is_active)
    VALUES ('Default Agency', 'default-agency', '{}', true)
    RETURNING id INTO v_seed_agency_id;

    RAISE NOTICE 'Created placeholder agency % for existing seed data. '
      'Replace it with your real agency after signup.', v_seed_agency_id;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- STEP 2: Backfill root tables
  -- ──────────────────────────────────────────────────────────

  UPDATE public.employees
  SET agency_id = v_seed_agency_id
  WHERE agency_id IS NULL;

  UPDATE public.clients
  SET agency_id = v_seed_agency_id
  WHERE agency_id IS NULL;

  -- ──────────────────────────────────────────────────────────
  -- STEP 3: Cascade-backfill dependent tables from root tables
  -- (Only touches rows still NULL — safe to re-run)
  -- ──────────────────────────────────────────────────────────

  -- EVV: from clients (via client_id)
  UPDATE public.evv_visits v
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE v.client_id = c.id AND v.agency_id IS NULL;

  -- EVV child tables: from evv_visits
  UPDATE public.evv_audit_log a
  SET agency_id = v.agency_id
  FROM public.evv_visits v
  WHERE a.visit_id = v.id AND a.agency_id IS NULL;

  UPDATE public.evv_corrections cor
  SET agency_id = v.agency_id
  FROM public.evv_visits v
  WHERE cor.visit_id = v.id AND cor.agency_id IS NULL;

  UPDATE public.evv_exceptions ex
  SET agency_id = v.agency_id
  FROM public.evv_visits v
  WHERE ex.visit_id = v.id AND ex.agency_id IS NULL;

  UPDATE public.evv_gps_captures g
  SET agency_id = v.agency_id
  FROM public.evv_visits v
  WHERE g.visit_id = v.id AND g.agency_id IS NULL;

  -- Schedule: from clients, then employees for caregiver-only events
  UPDATE public.schedule_events se
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE se.client_id = c.id AND se.agency_id IS NULL;

  UPDATE public.schedule_events se
  SET agency_id = e.agency_id
  FROM public.employees e
  WHERE se.caregiver_id = e.id AND se.agency_id IS NULL;

  -- Fallback: any remaining schedule_events still NULL → seed agency
  UPDATE public.schedule_events
  SET agency_id = v_seed_agency_id
  WHERE agency_id IS NULL;

  -- Schedule child tables
  UPDATE public.schedule_audit_log sal
  SET agency_id = se.agency_id
  FROM public.schedule_events se
  WHERE sal.event_id = se.id AND sal.agency_id IS NULL;

  UPDATE public.schedule_event_exceptions see
  SET agency_id = se.agency_id
  FROM public.schedule_events se
  WHERE see.parent_event_id = se.id AND see.agency_id IS NULL;

  UPDATE public.schedule_event_tasks set_t
  SET agency_id = se.agency_id
  FROM public.schedule_events se
  WHERE set_t.event_id = se.id AND set_t.agency_id IS NULL;

  UPDATE public.schedule_recurrence_rules srr
  SET agency_id = se.agency_id
  FROM public.schedule_events se
  WHERE se.recurrence_rule_id = srr.id AND srr.agency_id IS NULL;

  UPDATE public.schedule_time_off sto
  SET agency_id = e.agency_id
  FROM public.employees e
  WHERE sto.employee_id = e.id AND sto.agency_id IS NULL;

  -- Billing: from clients
  UPDATE public.billing_invoices bi
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE bi.client_id = c.id AND bi.agency_id IS NULL;

  UPDATE public.billing_invoice_lines bil
  SET agency_id = bi.agency_id
  FROM public.billing_invoices bi
  WHERE bil.invoice_id = bi.id AND bil.agency_id IS NULL;

  UPDATE public.billing_claims bc
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE bc.client_id = c.id AND bc.agency_id IS NULL;

  UPDATE public.billing_claim_lines bcl
  SET agency_id = bc.agency_id
  FROM public.billing_claims bc
  WHERE bcl.claim_id = bc.id AND bcl.agency_id IS NULL;

  UPDATE public.billing_payments bp
  SET agency_id = bi.agency_id
  FROM public.billing_invoices bi
  WHERE bp.invoice_id = bi.id AND bp.agency_id IS NULL;

  -- Remaining billing_payments (linked via claim_id, not invoice_id)
  UPDATE public.billing_payments bp
  SET agency_id = bc.agency_id
  FROM public.billing_claims bc
  WHERE bp.claim_id = bc.id AND bp.agency_id IS NULL;

  -- Documents and client admin: from clients / employees
  UPDATE public.client_documents cd
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE cd.client_id = c.id AND cd.agency_id IS NULL;

  UPDATE public.employee_documents ed
  SET agency_id = e.agency_id
  FROM public.employees e
  WHERE ed.employee_id = e.id AND ed.agency_id IS NULL;

  UPDATE public.client_guardians cg
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE cg.client_id = c.id AND cg.agency_id IS NULL;

  UPDATE public.client_onboarding_items coi
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE coi.client_id = c.id AND coi.agency_id IS NULL;

  UPDATE public.client_payer_assignments cpa
  SET agency_id = c.agency_id
  FROM public.clients c
  WHERE cpa.client_id = c.id AND cpa.agency_id IS NULL;

  UPDATE public.employee_verifications ev
  SET agency_id = e.agency_id
  FROM public.employees e
  WHERE ev.employee_id = e.id AND ev.agency_id IS NULL;

END $$;

-- ============================================================
-- STEP 4: Set agency_id NOT NULL on every table
-- All rows are guaranteed to be backfilled above.
-- ============================================================

-- Root tables
ALTER TABLE public.employees ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.clients   ALTER COLUMN agency_id SET NOT NULL;

-- EVV tables
ALTER TABLE public.evv_visits         ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.evv_audit_log      ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.evv_corrections    ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.evv_exceptions     ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.evv_gps_captures   ALTER COLUMN agency_id SET NOT NULL;

-- Schedule tables
ALTER TABLE public.schedule_events           ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.schedule_audit_log        ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.schedule_event_exceptions ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.schedule_event_tasks      ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.schedule_time_off         ALTER COLUMN agency_id SET NOT NULL;

-- Billing tables
ALTER TABLE public.billing_invoices      ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.billing_invoice_lines ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.billing_claims        ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.billing_claim_lines   ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.billing_payments      ALTER COLUMN agency_id SET NOT NULL;

-- Document and client admin tables
ALTER TABLE public.client_documents         ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.employee_documents       ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.client_guardians         ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.client_onboarding_items  ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.client_payer_assignments ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.employee_verifications   ALTER COLUMN agency_id SET NOT NULL;

-- ============================================================
-- STEP 5: Create indexes
-- ============================================================

-- Root tables
DROP INDEX IF EXISTS idx_employees_agency_id;
DROP INDEX IF EXISTS idx_clients_agency_id;

CREATE INDEX idx_employees_agency_id       ON public.employees(agency_id);
CREATE INDEX idx_employees_agency_created  ON public.employees(agency_id, created_at DESC);
CREATE INDEX idx_clients_agency_id         ON public.clients(agency_id);
CREATE INDEX idx_clients_agency_created    ON public.clients(agency_id, created_at DESC);

-- EVV tables
CREATE INDEX IF NOT EXISTS idx_evv_visits_agency_id       ON public.evv_visits(agency_id);
CREATE INDEX IF NOT EXISTS idx_evv_visits_agency_created  ON public.evv_visits(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evv_audit_log_agency_id    ON public.evv_audit_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_evv_corrections_agency_id  ON public.evv_corrections(agency_id);
CREATE INDEX IF NOT EXISTS idx_evv_exceptions_agency_id   ON public.evv_exceptions(agency_id);
CREATE INDEX IF NOT EXISTS idx_evv_gps_captures_agency_id ON public.evv_gps_captures(agency_id);

-- Schedule tables
CREATE INDEX IF NOT EXISTS idx_schedule_events_agency_id           ON public.schedule_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_agency_start        ON public.schedule_events(agency_id, start_at);
CREATE INDEX IF NOT EXISTS idx_schedule_audit_log_agency_id        ON public.schedule_audit_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_schedule_event_exceptions_agency_id ON public.schedule_event_exceptions(agency_id);
CREATE INDEX IF NOT EXISTS idx_schedule_event_tasks_agency_id      ON public.schedule_event_tasks(agency_id);
CREATE INDEX IF NOT EXISTS idx_schedule_time_off_agency_id         ON public.schedule_time_off(agency_id);
CREATE INDEX IF NOT EXISTS idx_schedule_recurrence_rules_agency_id ON public.schedule_recurrence_rules(agency_id)
  WHERE agency_id IS NOT NULL;

-- Billing tables
CREATE INDEX IF NOT EXISTS idx_billing_invoices_agency_id      ON public.billing_invoices(agency_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_agency_created ON public.billing_invoices(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_invoice_lines_agency_id ON public.billing_invoice_lines(agency_id);
CREATE INDEX IF NOT EXISTS idx_billing_claims_agency_id        ON public.billing_claims(agency_id);
CREATE INDEX IF NOT EXISTS idx_billing_claim_lines_agency_id   ON public.billing_claim_lines(agency_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_agency_id      ON public.billing_payments(agency_id);
CREATE INDEX IF NOT EXISTS idx_billing_service_codes_agency_id ON public.billing_service_codes(agency_id)
  WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_payers_agency_id        ON public.billing_payers(agency_id)
  WHERE agency_id IS NOT NULL;

-- Document and client admin tables
CREATE INDEX IF NOT EXISTS idx_client_documents_agency_id         ON public.client_documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_agency_id       ON public.employee_documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_client_guardians_agency_id         ON public.client_guardians(agency_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_items_agency_id  ON public.client_onboarding_items(agency_id);
CREATE INDEX IF NOT EXISTS idx_client_payer_assignments_agency_id ON public.client_payer_assignments(agency_id);
CREATE INDEX IF NOT EXISTS idx_employee_verifications_agency_id   ON public.employee_verifications(agency_id);
