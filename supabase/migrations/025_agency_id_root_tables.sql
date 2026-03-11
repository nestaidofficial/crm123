-- ============================================================
-- Migration 025: Add agency_id to root tables (clients + employees)
-- These are the "anchor" tables — all other tables backfill from these.
-- NOTE: agency_id is nullable initially to allow safe backfill.
--       Migration 027 sets NOT NULL after backfill.
-- ============================================================

-- Add agency_id to employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS agency_id UUID
  REFERENCES public.agencies(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_employees_agency_id ON public.employees(agency_id)
  WHERE agency_id IS NOT NULL;

-- Add agency_id to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS agency_id UUID
  REFERENCES public.agencies(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON public.clients(agency_id)
  WHERE agency_id IS NOT NULL;

-- ============================================================
-- Backfill instructions (run manually after inserting your first agency row)
-- ============================================================
-- After running this migration, insert an agency row and then run:
--
--   UPDATE public.employees SET agency_id = '<your-agency-uuid>';
--   UPDATE public.clients    SET agency_id = '<your-agency-uuid>';
--
-- Then run migration 027 to add NOT NULL + composite indexes.
-- ============================================================
