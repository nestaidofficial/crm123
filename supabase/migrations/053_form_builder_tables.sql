-- ============================================================
-- Migration 053: Form Builder Tables
-- Creates forms, form_invitations, and form_submissions tables
-- with agency-scoped RLS policies and form-signatures storage bucket.
-- ============================================================

-- ============================================================
-- 1. Enums
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_status') THEN
    CREATE TYPE public.form_status AS ENUM ('draft', 'published', 'archived');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_invitation_status') THEN
    CREATE TYPE public.form_invitation_status AS ENUM ('pending', 'viewed', 'completed', 'expired');
  END IF;
END
$$;

-- ============================================================
-- 2. forms table
-- Stores the form schema (fields + customization) as JSONB.
-- Icon and registryDependencies are stripped before storing.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.forms (
  id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID                  NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by      UUID                  NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title           TEXT                  NOT NULL DEFAULT 'Untitled Form',
  description     TEXT,
  schema          JSONB                 NOT NULL DEFAULT '[]',
  customization   JSONB                 NOT NULL DEFAULT '{}',
  status          public.form_status    NOT NULL DEFAULT 'draft',
  short_id        TEXT                  UNIQUE,
  created_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ           NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forms_agency_id  ON public.forms(agency_id);
CREATE INDEX IF NOT EXISTS idx_forms_short_id   ON public.forms(short_id);
CREATE INDEX IF NOT EXISTS idx_forms_status     ON public.forms(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON public.forms(created_by);

CREATE TRIGGER set_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================
-- 3. form_invitations table
-- Tracks who was invited to fill a form and their status.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.form_invitations (
  id               UUID                         PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id          UUID                         NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  agency_id        UUID                         NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  recipient_email  TEXT                         NOT NULL,
  recipient_name   TEXT,
  recipient_type   TEXT                         NOT NULL DEFAULT 'external',
  recipient_id     UUID,
  token            TEXT                         NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  status           public.form_invitation_status NOT NULL DEFAULT 'pending',
  sent_at          TIMESTAMPTZ                  NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ                  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_invitations_form_id    ON public.form_invitations(form_id);
CREATE INDEX IF NOT EXISTS idx_form_invitations_agency_id  ON public.form_invitations(agency_id);
CREATE INDEX IF NOT EXISTS idx_form_invitations_token      ON public.form_invitations(token);
CREATE INDEX IF NOT EXISTS idx_form_invitations_recipient  ON public.form_invitations(recipient_email);

-- ============================================================
-- 4. form_submissions table
-- Stores the actual answers in JSONB format.
-- Supports both invited and anonymous submissions.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id           UUID        NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  agency_id         UUID        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  invitation_id     UUID        REFERENCES public.form_invitations(id) ON DELETE SET NULL,
  respondent_email  TEXT,
  respondent_name   TEXT,
  respondent_type   TEXT        NOT NULL DEFAULT 'external',
  respondent_id     UUID,
  data              JSONB       NOT NULL DEFAULT '{}',
  signature_urls    JSONB,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id      ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_agency_id    ON public.form_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_invitation_id ON public.form_submissions(invitation_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON public.form_submissions(agency_id, submitted_at DESC);

-- ============================================================
-- 5. Row Level Security
-- ============================================================

ALTER TABLE public.forms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions  ENABLE ROW LEVEL SECURITY;

-- forms: staff within agency can CRUD
CREATE POLICY "forms_select" ON public.forms
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "forms_insert" ON public.forms
  FOR INSERT WITH CHECK (public.is_staff(agency_id));

CREATE POLICY "forms_update" ON public.forms
  FOR UPDATE USING (public.is_staff(agency_id));

CREATE POLICY "forms_delete" ON public.forms
  FOR DELETE USING (public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[]));

-- form_invitations: staff can CRUD
CREATE POLICY "form_invitations_select" ON public.form_invitations
  FOR SELECT USING (public.is_staff(agency_id));

CREATE POLICY "form_invitations_insert" ON public.form_invitations
  FOR INSERT WITH CHECK (public.is_staff(agency_id));

CREATE POLICY "form_invitations_update" ON public.form_invitations
  FOR UPDATE USING (public.is_staff(agency_id));

CREATE POLICY "form_invitations_delete" ON public.form_invitations
  FOR DELETE USING (public.has_agency_role(agency_id, ARRAY['owner','admin']::public.app_role[]));

-- form_submissions: staff can read; service_role can insert (for public submissions via API)
CREATE POLICY "form_submissions_select" ON public.form_submissions
  FOR SELECT USING (public.is_staff(agency_id));

-- Allow service_role to insert submissions from public fill page
CREATE POLICY "form_submissions_insert_service" ON public.form_submissions
  FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================
-- 6. Storage bucket for signature images
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-signatures',
  'form-signatures',
  false,
  5242880,  -- 5MB limit per signature image
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Service role can upload signature images from the submit API
CREATE POLICY "form_signatures_insert" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'form-signatures');

-- Staff can read signature images within their agency
-- (path format: {agency_id}/{form_id}/{submission_id}/{field_name}.png)
CREATE POLICY "form_signatures_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'form-signatures'
    AND public.is_agency_member((storage.foldername(name))[1]::uuid)
  );
