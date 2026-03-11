-- ============================================================
-- Migration 024: Tenant Layer
-- Creates agencies, app_role enum, agency_members, and the
-- RLS helper functions used by every subsequent policy.
-- ============================================================

-- 1. Agencies table (one row per homecare company / workspace)
CREATE TABLE IF NOT EXISTS public.agencies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  settings    JSONB       NOT NULL DEFAULT '{}',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agencies_slug ON public.agencies(slug);

-- Updated_at trigger
CREATE TRIGGER set_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- 2. App-level RBAC role enum (separate from employees.role which is a job category)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'owner',
      'admin',
      'coordinator',
      'billing',
      'hr',
      'caregiver',
      'viewer'
    );
  END IF;
END
$$;

-- 3. Agency membership table — maps auth users to agencies with a permission role
CREATE TABLE IF NOT EXISTS public.agency_members (
  agency_id   UUID           NOT NULL REFERENCES public.agencies(id)  ON DELETE CASCADE,
  user_id     UUID           NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  role        public.app_role NOT NULL DEFAULT 'viewer',
  is_active   BOOLEAN        NOT NULL DEFAULT true,
  invited_at  TIMESTAMPTZ    DEFAULT now(),
  joined_at   TIMESTAMPTZ,
  PRIMARY KEY (agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_members_user_id   ON public.agency_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_agency_id ON public.agency_members(agency_id);

-- ============================================================
-- 4. RLS helper functions
-- ============================================================

-- 4a. Is the current user a member of the given agency?
CREATE OR REPLACE FUNCTION public.is_agency_member(aid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members
    WHERE agency_id = aid
      AND user_id   = auth.uid()
      AND is_active = true
  );
$$;

-- 4b. Does the current user hold one of the specified roles in the given agency?
CREATE OR REPLACE FUNCTION public.has_agency_role(aid UUID, roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members
    WHERE agency_id = aid
      AND user_id   = auth.uid()
      AND is_active = true
      AND role      = ANY(roles)
  );
$$;

-- 4c. Is the current user "staff" (any non-caregiver role) in the given agency?
CREATE OR REPLACE FUNCTION public.is_staff(aid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members
    WHERE agency_id = aid
      AND user_id   = auth.uid()
      AND is_active = true
      AND role      IN ('owner','admin','coordinator','billing','hr','viewer')
  );
$$;

COMMENT ON FUNCTION public.is_agency_member(UUID) IS
  'Returns true if the current auth user is an active member of the given agency.';
COMMENT ON FUNCTION public.has_agency_role(UUID, public.app_role[]) IS
  'Returns true if the current auth user holds one of the given roles in the given agency.';
COMMENT ON FUNCTION public.is_staff(UUID) IS
  'Returns true if the current auth user is an active non-caregiver staff member of the given agency.';

-- ============================================================
-- 5. Enable RLS on new tables
-- ============================================================

ALTER TABLE public.agencies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

-- agencies: any member can read; only owner/admin can update
CREATE POLICY "agencies_select" ON public.agencies
  FOR SELECT USING (public.is_agency_member(id));

CREATE POLICY "agencies_update" ON public.agencies
  FOR UPDATE USING (public.has_agency_role(id, ARRAY['owner','admin']::public.app_role[]));

-- agency_members: any member of the agency can see the roster;
-- only owner/admin can manage membership
CREATE POLICY "agency_members_select" ON public.agency_members
  FOR SELECT USING (public.is_agency_member(agency_id));

CREATE POLICY "agency_members_insert" ON public.agency_members
  FOR INSERT WITH CHECK (public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "agency_members_update" ON public.agency_members
  FOR UPDATE USING (public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "agency_members_delete" ON public.agency_members
  FOR DELETE USING (public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[]));
