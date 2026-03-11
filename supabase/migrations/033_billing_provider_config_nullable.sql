-- Make npi and tax_id nullable to support private-pay agencies
-- that do not need a National Provider Identifier or EIN for billing.
ALTER TABLE billing_provider_config
  ALTER COLUMN npi DROP NOT NULL,
  ALTER COLUMN tax_id DROP NOT NULL,
  ALTER COLUMN provider_name DROP NOT NULL,
  ALTER COLUMN billing_address DROP NOT NULL;

-- Set empty-string defaults to NULL for cleanliness
UPDATE billing_provider_config
  SET npi = NULL WHERE npi = '';

UPDATE billing_provider_config
  SET tax_id = NULL WHERE tax_id = '';

UPDATE billing_provider_config
  SET provider_name = NULL WHERE provider_name = '';
