-- =============================================================================
-- Expand employee_documents.type to include all compliance workflow document types
-- Old types: id, contract, certification, training, reference, other
-- New types: all compliance workflow types + legacy types kept for backwards compat
-- =============================================================================

-- Drop the auto-generated CHECK constraint (Postgres names it <table>_<col>_check)
ALTER TABLE employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_type_check;

-- Add expanded CHECK constraint covering all compliance and legacy document types
ALTER TABLE employee_documents
  ADD CONSTRAINT employee_documents_type_check
  CHECK (type IN (
    -- Compliance workflow types
    'application',
    'cori',
    'sori',
    'training',
    'i9',
    'policy',
    'emergency',
    'w4',
    'direct_deposit',
    'offer_letter',
    'reference',
    'interview',
    'transportation',
    'other',
    -- Legacy types (kept for backwards compatibility)
    'id',
    'contract',
    'certification'
  ));

COMMENT ON COLUMN employee_documents.type IS
  'Document type: application | cori | sori | training | i9 | policy | emergency | w4 | direct_deposit | offer_letter | reference | interview | transportation | other | id | contract | certification';
