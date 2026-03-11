-- =============================================================================
-- Billing Module: Invoices, Claims, Payers, and 837P EDI Support
-- =============================================================================
-- Comprehensive schema for private-pay invoicing and Medicaid 837P claims
-- with embedded EVV data. Designed for multi-state operation with per-payer
-- service codes, authorization tracking, and claim lifecycle management.
-- =============================================================================

-- =============================================================================
-- Table 1: billing_payers
-- =============================================================================
-- Payer registry (Medicaid state programs, private insurers, self-pay)

CREATE TABLE IF NOT EXISTS billing_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  payer_type TEXT NOT NULL CHECK (payer_type IN ('medicaid', 'private_insurance', 'self_pay', 'hcbs', 'other')),
  state TEXT, -- Two-letter state code (e.g., "MA", "CA"); NULL for self-pay
  electronic_payer_id TEXT, -- Clearinghouse routing ID or state payer ID
  address JSONB, -- { street, city, state, zip }
  phone TEXT,
  timely_filing_days INT NOT NULL DEFAULT 365,
  billing_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('weekly', 'biweekly', 'monthly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_payers_state ON billing_payers (state);
CREATE INDEX IF NOT EXISTS idx_billing_payers_payer_type ON billing_payers (payer_type);
CREATE INDEX IF NOT EXISTS idx_billing_payers_is_active ON billing_payers (is_active) WHERE is_active = true;

COMMENT ON TABLE billing_payers IS 'Payer registry: Medicaid state programs, private insurance, and self-pay.';
COMMENT ON COLUMN billing_payers.electronic_payer_id IS 'Clearinghouse routing ID or state Medicaid payer ID (for 837P submission).';
COMMENT ON COLUMN billing_payers.timely_filing_days IS 'Days from service date to submit claim (90-365 days, varies by state).';

-- Seed data: Self-pay and a few test Medicaid programs
INSERT INTO billing_payers (name, payer_type, state, electronic_payer_id, timely_filing_days) VALUES
  ('Self-Pay', 'self_pay', NULL, NULL, 90),
  ('Massachusetts MassHealth', 'medicaid', 'MA', '42008', 180),
  ('California Medi-Cal', 'medicaid', 'CA', 'CAMEDICAID', 365),
  ('New York Medicaid', 'medicaid', 'NY', 'NYMEDICAID', 365),
  ('Texas Medicaid', 'medicaid', 'TX', 'TXMEDICAID', 95)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Table 2: billing_service_codes
-- =============================================================================
-- Procedure codes (HCPCS/CPT) with per-payer rates and effective dates

CREATE TABLE IF NOT EXISTS billing_service_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES billing_payers (id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES evv_service_types (id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- HCPCS/CPT code (e.g., "T1019", "S5130")
  modifier TEXT, -- Optional modifier (e.g., "GT", "U1")
  description TEXT,
  rate NUMERIC(10, 2) NOT NULL, -- Reimbursement rate per unit
  unit_type TEXT NOT NULL CHECK (unit_type IN ('15min', 'hour', 'visit', 'day')),
  effective_date DATE NOT NULL,
  end_date DATE, -- NULL means currently active
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payer_id, service_type_id, code, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_billing_service_codes_payer_id ON billing_service_codes (payer_id);
CREATE INDEX IF NOT EXISTS idx_billing_service_codes_service_type_id ON billing_service_codes (service_type_id);
CREATE INDEX IF NOT EXISTS idx_billing_service_codes_is_active ON billing_service_codes (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_billing_service_codes_effective_date ON billing_service_codes (effective_date, end_date);

COMMENT ON TABLE billing_service_codes IS 'HCPCS/CPT procedure codes with per-payer rates and effective dates. Supports multi-state operation.';
COMMENT ON COLUMN billing_service_codes.unit_type IS '15min | hour | visit | day -- how units are counted for this code.';

-- Seed data: Self-pay codes (using hour-based rates)
DO $$
DECLARE
  self_pay_id UUID;
  personal_care_id UUID;
  companion_id UUID;
  respite_id UUID;
  skilled_nursing_id UUID;
BEGIN
  SELECT id INTO self_pay_id FROM billing_payers WHERE payer_type = 'self_pay' LIMIT 1;
  SELECT id INTO personal_care_id FROM evv_service_types WHERE name = 'Personal Care';
  SELECT id INTO companion_id FROM evv_service_types WHERE name = 'Companion';
  SELECT id INTO respite_id FROM evv_service_types WHERE name = 'Respite Care';
  SELECT id INTO skilled_nursing_id FROM evv_service_types WHERE name = 'Skilled Nursing';

  IF self_pay_id IS NOT NULL THEN
    INSERT INTO billing_service_codes (payer_id, service_type_id, code, description, rate, unit_type, effective_date) VALUES
      (self_pay_id, personal_care_id, 'SELFPAY-PC', 'Personal Care (Private Pay)', 35.00, 'hour', '2024-01-01'),
      (self_pay_id, companion_id, 'SELFPAY-COMP', 'Companion Care (Private Pay)', 30.00, 'hour', '2024-01-01'),
      (self_pay_id, respite_id, 'SELFPAY-RESP', 'Respite Care (Private Pay)', 32.00, 'hour', '2024-01-01'),
      (self_pay_id, skilled_nursing_id, 'SELFPAY-SN', 'Skilled Nursing (Private Pay)', 65.00, 'hour', '2024-01-01')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Seed data: Massachusetts Medicaid codes (T codes with 15-min units)
DO $$
DECLARE
  ma_medicaid_id UUID;
  personal_care_id UUID;
  companion_id UUID;
BEGIN
  SELECT id INTO ma_medicaid_id FROM billing_payers WHERE state = 'MA' AND payer_type = 'medicaid' LIMIT 1;
  SELECT id INTO personal_care_id FROM evv_service_types WHERE name = 'Personal Care';
  SELECT id INTO companion_id FROM evv_service_types WHERE name = 'Companion';

  IF ma_medicaid_id IS NOT NULL THEN
    INSERT INTO billing_service_codes (payer_id, service_type_id, code, modifier, description, rate, unit_type, effective_date) VALUES
      (ma_medicaid_id, personal_care_id, 'T1019', 'U1', 'Personal Care Services', 6.50, '15min', '2024-01-01'),
      (ma_medicaid_id, companion_id, 'S5130', NULL, 'Companion Care', 6.00, '15min', '2024-01-01')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =============================================================================
-- Table 3: client_payer_assignments
-- =============================================================================
-- Links clients to their payers with member IDs and authorization

CREATE TABLE IF NOT EXISTS client_payer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES billing_payers (id) ON DELETE CASCADE,
  member_id TEXT, -- Medicaid ID or insurance member number
  group_number TEXT, -- For private insurance
  is_primary BOOLEAN NOT NULL DEFAULT true,
  authorization_number TEXT, -- Prior auth number
  authorized_units NUMERIC(10, 2), -- Total authorized units
  used_units NUMERIC(10, 2) NOT NULL DEFAULT 0,
  authorization_start DATE,
  authorization_end DATE,
  effective_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_payer_assignments_client_id ON client_payer_assignments (client_id);
CREATE INDEX IF NOT EXISTS idx_client_payer_assignments_payer_id ON client_payer_assignments (payer_id);
CREATE INDEX IF NOT EXISTS idx_client_payer_assignments_is_primary ON client_payer_assignments (is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_client_payer_assignments_auth_end ON client_payer_assignments (authorization_end) WHERE authorization_end IS NOT NULL;

COMMENT ON TABLE client_payer_assignments IS 'Links clients to payers with member IDs, prior authorization, and unit tracking.';
COMMENT ON COLUMN client_payer_assignments.authorized_units IS 'Total authorized units (hours, visits, etc.) for this authorization period.';
COMMENT ON COLUMN client_payer_assignments.used_units IS 'Units consumed so far. Updated when claims are submitted.';

-- =============================================================================
-- Table 4: billing_provider_config
-- =============================================================================
-- Organization-level provider settings (single row)

CREATE TABLE IF NOT EXISTS billing_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  npi TEXT NOT NULL, -- 10-digit National Provider Identifier
  tax_id TEXT NOT NULL, -- EIN (Employer Identification Number)
  taxonomy_code TEXT, -- NUCC taxonomy (e.g., "251E00000X" for Home Health Agency)
  billing_address JSONB NOT NULL, -- { street, city, state, zip }
  billing_phone TEXT,
  billing_contact_name TEXT,
  state_provider_ids JSONB NOT NULL DEFAULT '{}', -- { "MA": "12345", "NY": "67890" }
  default_place_of_service TEXT NOT NULL DEFAULT '12', -- POS 12 = Home
  edi_submitter_id TEXT, -- ISA segment submitter ID
  edi_receiver_id TEXT, -- ISA segment receiver ID (payer-specific)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE billing_provider_config IS 'Organization-level provider settings for billing and 837P claims (single row).';
COMMENT ON COLUMN billing_provider_config.npi IS '10-digit National Provider Identifier (billing provider NPI).';
COMMENT ON COLUMN billing_provider_config.taxonomy_code IS 'NUCC taxonomy code (e.g., 251E00000X for Home Health Agency).';
COMMENT ON COLUMN billing_provider_config.state_provider_ids IS 'Per-state Medicaid provider IDs as JSON: { "MA": "12345", "NY": "67890" }.';

-- Insert default provider config row (to be updated by user)
INSERT INTO billing_provider_config (
  id,
  provider_name,
  npi,
  tax_id,
  taxonomy_code,
  billing_address,
  billing_phone
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Your Home Care Agency',
  '1234567890',
  '12-3456789',
  '251E00000X',
  '{"street": "123 Main St", "city": "Boston", "state": "MA", "zip": "02101"}',
  '555-0100'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Table 5: billing_invoices
-- =============================================================================
-- Private-pay / self-pay invoices

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  payer_id UUID REFERENCES billing_payers (id) ON DELETE SET NULL, -- NULL for direct-to-client
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'unpaid', 'partially_paid', 'paid', 'overdue', 'voided')),
  due_date DATE,
  sent_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_client_id ON billing_invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_payer_id ON billing_invoices (payer_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices (status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_due_date ON billing_invoices (due_date);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_billing_period ON billing_invoices (billing_period_start, billing_period_end);

COMMENT ON TABLE billing_invoices IS 'Private-pay invoices for self-pay clients.';
COMMENT ON COLUMN billing_invoices.invoice_number IS 'Auto-generated unique invoice number (e.g., INV-000001).';

-- =============================================================================
-- Table 6: billing_invoice_lines
-- =============================================================================
-- Line items on invoices (one per EVV visit)

CREATE TABLE IF NOT EXISTS billing_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES billing_invoices (id) ON DELETE CASCADE,
  evv_visit_id UUID NOT NULL REFERENCES evv_visits (id) ON DELETE CASCADE,
  service_code_id UUID REFERENCES billing_service_codes (id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  service_date DATE NOT NULL,
  units NUMERIC(8, 2) NOT NULL, -- Hours or unit count
  rate NUMERIC(10, 2) NOT NULL, -- Per-unit rate
  amount NUMERIC(12, 2) NOT NULL, -- units × rate
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoice_lines_invoice_id ON billing_invoice_lines (invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoice_lines_evv_visit_id ON billing_invoice_lines (evv_visit_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoice_lines_service_date ON billing_invoice_lines (service_date);

COMMENT ON TABLE billing_invoice_lines IS 'Line items on private-pay invoices, linked to EVV visits.';

-- =============================================================================
-- Table 7: billing_claims
-- =============================================================================
-- Medicaid / insurance 837P claims

CREATE TABLE IF NOT EXISTS billing_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES billing_payers (id) ON DELETE CASCADE,
  client_payer_assignment_id UUID REFERENCES client_payer_assignments (id) ON DELETE SET NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'submitted', 'accepted', 'rejected', 'paid', 'denied', 'corrected')),
  submission_date DATE,
  response_date DATE,
  rejection_reason TEXT,
  edi_content TEXT, -- Generated 837P EDI content (stored for audit)
  filing_deadline DATE, -- Computed from service date + payer.timely_filing_days
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_claims_client_id ON billing_claims (client_id);
CREATE INDEX IF NOT EXISTS idx_billing_claims_payer_id ON billing_claims (payer_id);
CREATE INDEX IF NOT EXISTS idx_billing_claims_status ON billing_claims (status);
CREATE INDEX IF NOT EXISTS idx_billing_claims_filing_deadline ON billing_claims (filing_deadline) WHERE status IN ('draft', 'generated');
CREATE INDEX IF NOT EXISTS idx_billing_claims_submission_date ON billing_claims (submission_date);

COMMENT ON TABLE billing_claims IS 'Medicaid/insurance 837P claims with lifecycle tracking.';
COMMENT ON COLUMN billing_claims.edi_content IS 'Generated ANSI X12N 837P 5010A1 EDI content (stored for audit and resubmission).';
COMMENT ON COLUMN billing_claims.filing_deadline IS 'Deadline to submit claim (service date + payer timely_filing_days).';

-- =============================================================================
-- Table 8: billing_claim_lines
-- =============================================================================
-- Service lines on claims with embedded EVV data

CREATE TABLE IF NOT EXISTS billing_claim_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES billing_claims (id) ON DELETE CASCADE,
  evv_visit_id UUID NOT NULL REFERENCES evv_visits (id) ON DELETE CASCADE,
  service_code TEXT NOT NULL, -- HCPCS code (e.g., "T1019")
  modifier TEXT, -- Optional modifier (e.g., "GT", "U1")
  service_date DATE NOT NULL,
  units NUMERIC(8, 2) NOT NULL, -- Number of units (15-min blocks, hours, visits, etc.)
  rate NUMERIC(10, 2) NOT NULL, -- Rate per unit
  amount NUMERIC(12, 2) NOT NULL, -- units × rate
  diagnosis_code TEXT, -- ICD-10 code (from client diagnosis)
  place_of_service TEXT NOT NULL DEFAULT '12', -- POS 12 = Home
  rendering_provider_npi TEXT, -- Caregiver NPI (if required by state)
  -- Embedded EVV data (21st Century Cures Act compliance)
  evv_clock_in TIMESTAMPTZ,
  evv_clock_out TIMESTAMPTZ,
  evv_gps_lat_in DOUBLE PRECISION,
  evv_gps_lon_in DOUBLE PRECISION,
  evv_gps_lat_out DOUBLE PRECISION,
  evv_gps_lon_out DOUBLE PRECISION,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_claim_lines_claim_id ON billing_claim_lines (claim_id);
CREATE INDEX IF NOT EXISTS idx_billing_claim_lines_evv_visit_id ON billing_claim_lines (evv_visit_id);
CREATE INDEX IF NOT EXISTS idx_billing_claim_lines_service_date ON billing_claim_lines (service_date);

COMMENT ON TABLE billing_claim_lines IS 'Service lines on Medicaid claims with embedded EVV data (clock times, GPS).';
COMMENT ON COLUMN billing_claim_lines.evv_clock_in IS 'Embedded EVV: caregiver clock-in timestamp (21st Century Cures Act).';
COMMENT ON COLUMN billing_claim_lines.evv_gps_lat_in IS 'Embedded EVV: latitude at clock-in.';

-- =============================================================================
-- Table 9: billing_payments
-- =============================================================================
-- Payment tracking for invoices and claims

CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('check', 'ach', 'credit_card', 'cash', 'era', 'other')),
  reference_number TEXT, -- Check number, ERA trace, transaction ID
  payer_id UUID REFERENCES billing_payers (id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES billing_invoices (id) ON DELETE SET NULL,
  claim_id UUID REFERENCES billing_claims (id) ON DELETE SET NULL,
  notes TEXT,
  recorded_by UUID REFERENCES employees (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_invoice_id ON billing_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_claim_id ON billing_payments (claim_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_payment_date ON billing_payments (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_payments_payer_id ON billing_payments (payer_id);

COMMENT ON TABLE billing_payments IS 'Payment tracking for both invoices and claims. Links to ERA (835) for Medicaid remittance.';
COMMENT ON COLUMN billing_payments.method IS 'check | ach | credit_card | cash | era | other';

-- =============================================================================
-- Add NPI to employees table
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'npi'
  ) THEN
    ALTER TABLE employees ADD COLUMN npi TEXT;
    CREATE INDEX IF NOT EXISTS idx_employees_npi ON employees (npi) WHERE npi IS NOT NULL;
    COMMENT ON COLUMN employees.npi IS 'National Provider Identifier (NPI) for rendering provider on claims. Optional; only needed if state requires individual caregiver NPI.';
  END IF;
END $$;

-- =============================================================================
-- Triggers: Auto-update updated_at timestamps
-- =============================================================================

CREATE TRIGGER set_billing_payers_updated_at
  BEFORE UPDATE ON billing_payers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_client_payer_assignments_updated_at
  BEFORE UPDATE ON client_payer_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_billing_invoices_updated_at
  BEFORE UPDATE ON billing_invoices
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_billing_claims_updated_at
  BEFORE UPDATE ON billing_claims
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_billing_provider_config_updated_at
  BEFORE UPDATE ON billing_provider_config
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE billing_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_service_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_claim_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read billing data
CREATE POLICY billing_payers_read ON billing_payers FOR SELECT TO authenticated USING (true);
CREATE POLICY billing_service_codes_read ON billing_service_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY client_payer_assignments_read ON client_payer_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY billing_provider_config_read ON billing_provider_config FOR SELECT TO authenticated USING (true);
CREATE POLICY billing_invoices_read ON billing_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY billing_invoice_lines_read ON billing_invoice_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY billing_claims_read ON billing_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY billing_claim_lines_read ON billing_claim_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY billing_payments_read ON billing_payments FOR SELECT TO authenticated USING (true);

-- Allow anon users to read (for dev simplicity)
CREATE POLICY billing_payers_anon_read ON billing_payers FOR SELECT TO anon USING (true);
CREATE POLICY billing_service_codes_anon_read ON billing_service_codes FOR SELECT TO anon USING (true);
CREATE POLICY client_payer_assignments_anon_read ON client_payer_assignments FOR SELECT TO anon USING (true);
CREATE POLICY billing_provider_config_anon_read ON billing_provider_config FOR SELECT TO anon USING (true);
CREATE POLICY billing_invoices_anon_read ON billing_invoices FOR SELECT TO anon USING (true);
CREATE POLICY billing_invoice_lines_anon_read ON billing_invoice_lines FOR SELECT TO anon USING (true);
CREATE POLICY billing_claims_anon_read ON billing_claims FOR SELECT TO anon USING (true);
CREATE POLICY billing_claim_lines_anon_read ON billing_claim_lines FOR SELECT TO anon USING (true);
CREATE POLICY billing_payments_anon_read ON billing_payments FOR SELECT TO anon USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY billing_payers_write ON billing_payers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY billing_service_codes_write ON billing_service_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY client_payer_assignments_write ON client_payer_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY billing_provider_config_write ON billing_provider_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY billing_invoices_write ON billing_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY billing_invoice_lines_write ON billing_invoice_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY billing_claims_write ON billing_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY billing_claim_lines_write ON billing_claim_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY billing_payments_write ON billing_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anon users to write (for dev simplicity)
CREATE POLICY billing_payers_anon_write ON billing_payers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY billing_service_codes_anon_write ON billing_service_codes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY client_payer_assignments_anon_write ON client_payer_assignments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY billing_provider_config_anon_write ON billing_provider_config FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY billing_invoices_anon_write ON billing_invoices FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY billing_invoice_lines_anon_write ON billing_invoice_lines FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY billing_claims_anon_write ON billing_claims FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY billing_claim_lines_anon_write ON billing_claim_lines FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY billing_payments_anon_write ON billing_payments FOR ALL TO anon USING (true) WITH CHECK (true);

COMMENT ON POLICY billing_invoices_read ON billing_invoices IS 'All authenticated users can read billing invoices.';
COMMENT ON POLICY billing_claims_read ON billing_claims IS 'All authenticated users can read Medicaid claims.';

-- Note: For production, tighten RLS to check employee role (admin, billing) using auth.jwt() -> app_metadata.role
-- Current policies allow all authenticated/anon users for development simplicity
