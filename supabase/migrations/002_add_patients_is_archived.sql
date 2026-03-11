-- Add is_archived and index to an existing clients table.
-- Run this only if clients already exists without is_archived.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clients_is_archived ON clients (is_archived);
