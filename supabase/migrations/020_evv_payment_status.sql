-- =============================================================================
-- EVV Payment Status Column
-- =============================================================================
-- Adds payment_status column to evv_visits table to track whether shifts
-- have been paid to caregivers. This supports payroll tracking and timesheet
-- export features.
-- =============================================================================

-- Add payment_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'evv_visits' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE evv_visits ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid' 
      CHECK (payment_status IN ('unpaid', 'paid', 'processing'));
    
    CREATE INDEX IF NOT EXISTS idx_evv_visits_payment_status ON evv_visits (payment_status);
    
    COMMENT ON COLUMN evv_visits.payment_status IS 'Payment status for caregiver payroll: unpaid | paid | processing';
  END IF;
END $$;

-- Update some existing seed data to have 'paid' status for testing
UPDATE evv_visits 
SET payment_status = 'paid' 
WHERE timesheet_status = 'approved' 
  AND clock_out IS NOT NULL 
  AND created_at < now() - interval '7 days'
  AND id IN (
    SELECT id FROM evv_visits 
    WHERE timesheet_status = 'approved' 
    LIMIT 3
  );

COMMENT ON TABLE evv_visits IS 'Core EVV visit records with clock times, GPS verification, timesheet approval, and payment tracking.';
