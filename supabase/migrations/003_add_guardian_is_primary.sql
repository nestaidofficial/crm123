-- Primary contact is stored as a guardian with is_primary = true (instead of clients.primary_contact).

ALTER TABLE client_guardians
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_client_guardians_is_primary ON client_guardians (client_id, is_primary) WHERE is_primary = true;

COMMENT ON COLUMN client_guardians.is_primary IS 'True for the primary contact (from add-client); one per client.';
