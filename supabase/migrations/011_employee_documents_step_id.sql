-- =============================================================================
-- Add compliance_step_id to employee_documents
-- Links documents to specific steps in the compliance workflow (e.g. "phase1-step1")
-- =============================================================================

ALTER TABLE employee_documents
  ADD COLUMN IF NOT EXISTS compliance_step_id TEXT;

COMMENT ON COLUMN employee_documents.compliance_step_id IS 'Links document to a specific compliance workflow step (e.g. phase1-step1).';

CREATE INDEX IF NOT EXISTS idx_employee_documents_compliance_step_id
  ON employee_documents (compliance_step_id)
  WHERE compliance_step_id IS NOT NULL;
