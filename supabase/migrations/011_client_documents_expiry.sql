-- =============================================================================
-- Add expiry_date to client_documents (optional; for consents, insurance, etc.)
-- =============================================================================

ALTER TABLE client_documents
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

COMMENT ON COLUMN client_documents.expiry_date IS 'Optional expiry date (e.g. for insurance, consents, certifications).';

CREATE INDEX IF NOT EXISTS idx_client_documents_expiry_date
  ON client_documents (expiry_date)
  WHERE expiry_date IS NOT NULL;
