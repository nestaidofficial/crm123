-- =============================================================================
-- Seed Schedule Links, Payment Status, and Employee Pay Rates
-- =============================================================================
-- This migration ensures:
-- 1. EVV visits have schedule_event_id links to schedule_events
-- 2. EVV visits have varied payment_status for testing
-- 3. Employees have realistic pay rates ($18-35/hr for caregivers)
-- =============================================================================

-- Update employee pay rates to realistic values
DO $$
DECLARE
  emp_record RECORD;
BEGIN
  -- Set realistic pay rates for caregivers based on role
  FOR emp_record IN 
    SELECT id, role FROM employees WHERE status = 'active'
  LOOP
    CASE emp_record.role
      WHEN 'caregiver' THEN
        UPDATE employees 
        SET pay_rate = 22.00 + (RANDOM() * 8), -- $22-30/hr
            pay_type = 'hourly'
        WHERE id = emp_record.id;
      
      WHEN 'cna' THEN
        UPDATE employees 
        SET pay_rate = 24.00 + (RANDOM() * 6), -- $24-30/hr
            pay_type = 'hourly'
        WHERE id = emp_record.id;
      
      WHEN 'hha' THEN
        UPDATE employees 
        SET pay_rate = 26.00 + (RANDOM() * 7), -- $26-33/hr
            pay_type = 'hourly'
        WHERE id = emp_record.id;
      
      WHEN 'lpn' THEN
        UPDATE employees 
        SET pay_rate = 30.00 + (RANDOM() * 5), -- $30-35/hr
            pay_type = 'hourly'
        WHERE id = emp_record.id;
      
      WHEN 'rn' THEN
        UPDATE employees 
        SET pay_rate = 38.00 + (RANDOM() * 7), -- $38-45/hr
            pay_type = 'hourly'
        WHERE id = emp_record.id;
      
      WHEN 'admin', 'coordinator' THEN
        UPDATE employees 
        SET pay_rate = 50000.00 + (RANDOM() * 15000), -- $50k-65k/yr
            pay_type = 'salary'
        WHERE id = emp_record.id;
      
      ELSE
        UPDATE employees 
        SET pay_rate = 20.00 + (RANDOM() * 10), -- $20-30/hr
            pay_type = 'hourly'
        WHERE id = emp_record.id;
    END CASE;
  END LOOP;

  RAISE NOTICE 'Updated pay rates for all active employees';
END $$;

-- Create schedule events for existing EVV visits that don't have them
DO $$
DECLARE
  visit_record RECORD;
  new_event_id UUID;
  employee_pay_rate NUMERIC;
  employee_pay_type TEXT;
BEGIN
  FOR visit_record IN 
    SELECT 
      v.id,
      v.employee_id,
      v.client_id,
      v.scheduled_start,
      v.scheduled_end,
      v.schedule_event_id,
      e.pay_rate,
      e.pay_type
    FROM evv_visits v
    JOIN employees e ON e.id = v.employee_id
    WHERE v.schedule_event_id IS NULL
  LOOP
    -- Create a matching schedule event
    INSERT INTO schedule_events (
      title,
      client_id,
      caregiver_id,
      care_coordinator_id,
      care_type,
      status,
      start_at,
      end_at,
      is_all_day,
      is_open_shift,
      color,
      description,
      instructions,
      pay_rate,
      pay_type,
      recurrence_rule_id,
      is_recurring_instance,
      parent_event_id
    ) VALUES (
      'Care Shift',
      visit_record.client_id,
      visit_record.employee_id,
      NULL,
      'personal_care',
      'completed',
      visit_record.scheduled_start,
      visit_record.scheduled_end,
      FALSE,
      FALSE,
      NULL,
      'Auto-generated shift from EVV visit',
      NULL,
      visit_record.pay_rate,
      visit_record.pay_type,
      NULL,
      FALSE,
      NULL
    ) RETURNING id INTO new_event_id;

    -- Link the EVV visit to the schedule event
    UPDATE evv_visits 
    SET schedule_event_id = new_event_id 
    WHERE id = visit_record.id;
  END LOOP;

  RAISE NOTICE 'Created schedule events for EVV visits without links';
END $$;

-- Update payment_status to create a realistic distribution
DO $$
DECLARE
  total_approved_visits INT;
  visits_to_mark_paid INT;
BEGIN
  -- Count approved visits
  SELECT COUNT(*) INTO total_approved_visits
  FROM evv_visits
  WHERE timesheet_status = 'approved' 
    AND clock_out IS NOT NULL;

  IF total_approved_visits = 0 THEN
    RAISE NOTICE 'No approved visits found to update payment status';
    RETURN;
  END IF;

  -- Mark approximately 60% as paid (older visits more likely to be paid)
  visits_to_mark_paid := FLOOR(total_approved_visits * 0.6);

  -- Mark the oldest 60% of approved visits as paid
  UPDATE evv_visits
  SET payment_status = 'paid'
  WHERE id IN (
    SELECT id 
    FROM evv_visits
    WHERE timesheet_status = 'approved' 
      AND clock_out IS NOT NULL
    ORDER BY scheduled_start ASC
    LIMIT visits_to_mark_paid
  );

  -- Mark about 5% as processing (recent visits)
  UPDATE evv_visits
  SET payment_status = 'processing'
  WHERE id IN (
    SELECT id 
    FROM evv_visits
    WHERE timesheet_status = 'approved' 
      AND clock_out IS NOT NULL
      AND payment_status = 'unpaid'
    ORDER BY scheduled_start DESC
    LIMIT GREATEST(1, FLOOR(total_approved_visits * 0.05))
  );

  RAISE NOTICE 'Updated payment_status: ~60%% paid, ~5%% processing, ~35%% unpaid';
END $$;

-- Add some realistic overtime to a few visits
UPDATE evv_visits
SET overtime_minutes = 30 + FLOOR(RANDOM() * 31) -- 30-60 minutes
WHERE timesheet_status = 'approved'
  AND clock_out IS NOT NULL
  AND id IN (
    SELECT id FROM evv_visits 
    WHERE timesheet_status = 'approved'
    ORDER BY RANDOM()
    LIMIT 3
  );

COMMENT ON COLUMN employees.pay_rate IS 'Hourly rate (for hourly/per-visit) or annual salary (for salary). Updated with realistic values in migration 021.';
COMMENT ON COLUMN schedule_events.pay_rate IS 'Pay rate for this specific shift. Defaults to employee pay_rate if not specified.';
