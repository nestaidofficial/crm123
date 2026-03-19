-- Migration: Onboarding Candidates Table
-- Description: Tracks employee/caregiver candidates through the onboarding workflow
-- Created: 2024-03-19

-- Create onboarding_candidates table
CREATE TABLE IF NOT EXISTS public.onboarding_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  -- Basic info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  
  -- Workflow state
  current_phase_id TEXT,
  current_stage_label TEXT,
  onboarding_status TEXT DEFAULT 'active' CHECK (onboarding_status IN ('active', 'completed', 'withdrawn')),
  
  -- Workflow configuration (stores selected step IDs from wizard)
  workflow_config JSONB DEFAULT '{"configured": false, "selectedStepIds": []}'::jsonb,
  
  -- Step statuses (map of step_id -> status)
  step_statuses JSONB DEFAULT '{}'::jsonb,
  
  -- Documents (array of document records)
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Activity log (array of activity entries)
  activity_log JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on agency_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_candidates_agency_id 
  ON public.onboarding_candidates(agency_id);

-- Create index on onboarding_status for filtering
CREATE INDEX IF NOT EXISTS idx_onboarding_candidates_status 
  ON public.onboarding_candidates(onboarding_status);

-- Create index on email for lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_candidates_email 
  ON public.onboarding_candidates(email);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_onboarding_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_candidates_updated_at
  BEFORE UPDATE ON public.onboarding_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_candidates_updated_at();

-- Enable Row Level Security
ALTER TABLE public.onboarding_candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view candidates from their agency
CREATE POLICY "Users can view candidates from their agency"
  ON public.onboarding_candidates
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id 
      FROM public.agency_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users with appropriate roles can insert candidates
CREATE POLICY "Users can insert candidates for their agency"
  ON public.onboarding_candidates
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id 
      FROM public.agency_members am
      WHERE am.user_id = auth.uid()
        AND am.app_role IN ('owner', 'admin', 'hr', 'coordinator')
    )
  );

-- Policy: Users with appropriate roles can update candidates
CREATE POLICY "Users can update candidates from their agency"
  ON public.onboarding_candidates
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT am.agency_id 
      FROM public.agency_members am
      WHERE am.user_id = auth.uid()
        AND am.app_role IN ('owner', 'admin', 'hr', 'coordinator')
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id 
      FROM public.agency_members am
      WHERE am.user_id = auth.uid()
        AND am.app_role IN ('owner', 'admin', 'hr', 'coordinator')
    )
  );

-- Policy: Users with appropriate roles can delete candidates
CREATE POLICY "Users can delete candidates from their agency"
  ON public.onboarding_candidates
  FOR DELETE
  USING (
    agency_id IN (
      SELECT am.agency_id 
      FROM public.agency_members am
      WHERE am.user_id = auth.uid()
        AND am.app_role IN ('owner', 'admin', 'hr')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_candidates TO authenticated;
GRANT USAGE ON SEQUENCE public.onboarding_candidates_id_seq TO authenticated;

-- Add comment
COMMENT ON TABLE public.onboarding_candidates IS 'Tracks employee/caregiver candidates through the onboarding workflow with compliance steps, documents, and activity logs';
