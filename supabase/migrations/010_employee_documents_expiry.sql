-- =============================================================================
-- Add expiry_date to employee_documents (optional; for certifications, IDs, etc.)
-- =============================================================================

ALTER TABLE employee_documents
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

COMMENT ON COLUMN employee_documents.expiry_date IS 'Optional expiry date (e.g. for certifications, IDs, contracts).';

CREATE INDEX IF NOT EXISTS idx_employee_documents_expiry_date
  ON employee_documents (expiry_date)
  WHERE expiry_date IS NOT NULL;
