-- =============================================================================
-- EVV Test Data Seed
-- =============================================================================
-- Creates 10 sample visits with various statuses for testing the EVV UI
-- Prerequisites: At least 10 employees (caregivers) and 10 clients must exist
-- =============================================================================

-- Helper: Get service type and funding source IDs
DO $$
DECLARE
  personal_care_id UUID;
  companion_id UUID;
  respite_id UUID;
  skilled_nursing_id UUID;
  medication_id UUID;
  
  medicaid_id UUID;
  hcbs_id UUID;
  private_pay_id UUID;
  regional_center_id UUID;
  idd_id UUID;
  
  employee_ids UUID[];
  client_ids UUID[];
BEGIN
  -- Get lookup IDs
  SELECT id INTO personal_care_id FROM evv_service_types WHERE name = 'Personal Care';
  SELECT id INTO companion_id FROM evv_service_types WHERE name = 'Companion';
  SELECT id INTO respite_id FROM evv_service_types WHERE name = 'Respite Care';
  SELECT id INTO skilled_nursing_id FROM evv_service_types WHERE name = 'Skilled Nursing';
  SELECT id INTO medication_id FROM evv_service_types WHERE name = 'Medication Management';
  
  SELECT id INTO medicaid_id FROM evv_funding_sources WHERE name = 'Medicaid';
  SELECT id INTO hcbs_id FROM evv_funding_sources WHERE name = 'HCBS';
  SELECT id INTO private_pay_id FROM evv_funding_sources WHERE name = 'Private Pay';
  SELECT id INTO regional_center_id FROM evv_funding_sources WHERE name = 'Regional Center';
  SELECT id INTO idd_id FROM evv_funding_sources WHERE name = 'IDD';
  
  -- Get employee and client IDs
  SELECT ARRAY(SELECT id FROM employees WHERE role = 'caregiver' AND status = 'active' LIMIT 10) INTO employee_ids;
  SELECT ARRAY(SELECT id FROM clients WHERE status = 'active' LIMIT 10) INTO client_ids;
  
  -- If not enough employees/clients, exit
  IF array_length(employee_ids, 1) < 10 OR array_length(client_ids, 1) < 10 THEN
    RAISE NOTICE 'Need at least 10 active caregivers and 10 active clients. Skipping seed.';
    RETURN;
  END IF;
  
  -- Visit 1: Verified, on-time, Personal Care, Medicaid
  INSERT INTO evv_visits (
    employee_id, client_id, service_type_id, funding_source_id,
    scheduled_start, scheduled_end,
    clock_in, clock_out,
    break_minutes, overtime_minutes,
    gps_status, gps_distance_meters,
    arrival_status, verification_status, timesheet_status,
    care_notes_completed, care_notes_text, signature_captured
  ) VALUES (
    employee_ids[1], client_ids[1], personal_care_id, medicaid_id,
    now() - interval '6 hours', now() - interval '2 hours',
    now() - interval '6 hours 5 minutes', now() - interval '2 hours',
    30, 0,
    'verified', 25,
    'on-time', 'verified', 'pending',
    true, 'Client was in good spirits. Assisted with personal care, meal preparation, and light housekeeping.', true
  );
  
  -- Visit 2: Exception (late), Companion, HCBS
  WITH new_visit AS (
    INSERT INTO evv_visits (
      employee_id, client_id, service_type_id, funding_source_id,
      scheduled_start, scheduled_end,
      clock_in, clock_out,
      break_minutes, overtime_minutes,
      gps_status, gps_distance_meters,
      arrival_status, verification_status, timesheet_status,
      care_notes_completed, care_notes_text, signature_captured
    ) VALUES (
      employee_ids[2], client_ids[2], companion_id, hcbs_id,
      now() - interval '8 hours', now() - interval '4 hours',
      now() - interval '7 hours 45 minutes', now() - interval '4 hours',
      0, 0,
      'verified', 18,
      'late', 'exception', 'pending',
      true, 'Accompanied client to medical appointment and social activities.', true
    ) RETURNING id
  )
  INSERT INTO evv_exceptions (visit_id, type, severity, description)
  SELECT id, 'Late Arrival (15 min)', 'warning', 'Clock-in was 15 minutes after scheduled start time.'
  FROM new_visit;
  
  -- Visit 3: Exception (no-show), Respite Care, Regional Center
  WITH new_visit AS (
    INSERT INTO evv_visits (
      employee_id, client_id, service_type_id, funding_source_id,
      scheduled_start, scheduled_end,
      clock_in, clock_out,
      break_minutes, overtime_minutes,
      gps_status, gps_distance_meters,
      arrival_status, verification_status, timesheet_status,
      care_notes_completed, signature_captured
    ) VALUES (
      employee_ids[3], client_ids[3], respite_id, regional_center_id,
      now() - interval '10 hours', now() - interval '2 hours',
      NULL, NULL,
      0, 0,
      'missing', NULL,
      'no-show', 'exception', 'flagged',
      false, false
    ) RETURNING id
  )
  INSERT INTO evv_exceptions (visit_id, type, severity, description)
  SELECT id, 'No-Show', 'critical', 'Caregiver did not clock in for scheduled shift.'
  FROM new_visit
  UNION ALL
  SELECT id, 'Missed Clock-In', 'critical', 'Clock-in time not recorded.'
  FROM new_visit;
  
  -- Visit 4: Exception (outside geofence), Personal Care, Private Pay
  WITH new_visit AS (
    INSERT INTO evv_visits (
      employee_id, client_id, service_type_id, funding_source_id,
      scheduled_start, scheduled_end,
      clock_in, clock_out,
      break_minutes, overtime_minutes,
      gps_status, gps_distance_meters,
      arrival_status, verification_status, timesheet_status,
      care_notes_completed, care_notes_text, signature_captured
    ) VALUES (
      employee_ids[4], client_ids[4], personal_care_id, private_pay_id,
      now() - interval '12 hours', now() - interval '4 hours',
      now() - interval '12 hours', now() - interval '3 hours 30 minutes',
      30, 30,
      'outside', 120,
      'on-time', 'exception', 'approved',
      true, 'Completed all scheduled tasks. Client requested extended care time.', true
    ) RETURNING id
  )
  INSERT INTO evv_exceptions (visit_id, type, severity, description)
  SELECT id, 'Outside Geofence (120m)', 'warning', 'Clock-in location was 120m from client address, exceeding the 100m radius.'
  FROM new_visit;
  
  -- Visit 5: Verified, Skilled Nursing, Medicaid
  INSERT INTO evv_visits (
    employee_id, client_id, service_type_id, funding_source_id,
    scheduled_start, scheduled_end,
    clock_in, clock_out,
    break_minutes, overtime_minutes,
    gps_status, gps_distance_meters,
    arrival_status, verification_status, timesheet_status,
    care_notes_completed, care_notes_text, signature_captured
  ) VALUES (
    employee_ids[5], client_ids[5], skilled_nursing_id, medicaid_id,
    now() - interval '14 hours', now() - interval '6 hours',
    now() - interval '14 hours', now() - interval '6 hours',
    60, 0,
    'verified', 12,
    'on-time', 'verified', 'approved',
    true, 'Administered medications, vital sign checks, wound care completed.', true
  );
  
  -- Visit 6: Pending (active shift), Companion, HCBS
  INSERT INTO evv_visits (
    employee_id, client_id, service_type_id, funding_source_id,
    scheduled_start, scheduled_end,
    clock_in, clock_out,
    break_minutes, overtime_minutes,
    gps_status, gps_distance_meters,
    arrival_status, verification_status, timesheet_status,
    care_notes_completed, signature_captured
  ) VALUES (
    employee_ids[6], client_ids[6], companion_id, hcbs_id,
    now() - interval '2 hours', now() + interval '2 hours',
    now() - interval '1 hours 55 minutes', NULL,
    0, 0,
    'verified', 45,
    'on-time', 'pending', 'pending',
    false, false
  );
  
  -- Visit 7: Pending, Personal Care, Medicaid
  INSERT INTO evv_visits (
    employee_id, client_id, service_type_id, funding_source_id,
    scheduled_start, scheduled_end,
    clock_in, clock_out,
    break_minutes, overtime_minutes,
    gps_status, gps_distance_meters,
    arrival_status, verification_status, timesheet_status,
    care_notes_completed, care_notes_text, signature_captured
  ) VALUES (
    employee_ids[7], client_ids[7], personal_care_id, medicaid_id,
    now() - interval '18 hours', now() - interval '10 hours',
    now() - interval '18 hours', now() - interval '10 hours',
    45, 0,
    'verified', 8,
    'on-time', 'pending', 'pending',
    true, 'Assisted with bathing, dressing, and meal preparation.', false
  );
  
  -- Visit 8: Exception (missing care notes), Medication Management, IDD
  WITH new_visit AS (
    INSERT INTO evv_visits (
      employee_id, client_id, service_type_id, funding_source_id,
      scheduled_start, scheduled_end,
      clock_in, clock_out,
      break_minutes, overtime_minutes,
      gps_status, gps_distance_meters,
      arrival_status, verification_status, timesheet_status,
      care_notes_completed, signature_captured
    ) VALUES (
      employee_ids[8], client_ids[8], medication_id, idd_id,
      now() - interval '20 hours', now() - interval '16 hours',
      now() - interval '20 hours', now() - interval '16 hours',
      0, 0,
      'verified', 32,
      'on-time', 'exception', 'pending',
      true, true
    ) RETURNING id
  )
  INSERT INTO evv_exceptions (visit_id, type, severity, description)
  SELECT id, 'Missing Care Notes', 'warning', 'Care notes were not completed after the visit.'
  FROM new_visit;
  
  -- Visit 9: Verified, Respite Care, Regional Center
  INSERT INTO evv_visits (
    employee_id, client_id, service_type_id, funding_source_id,
    scheduled_start, scheduled_end,
    clock_in, clock_out,
    break_minutes, overtime_minutes,
    gps_status, gps_distance_meters,
    arrival_status, verification_status, timesheet_status,
    care_notes_completed, care_notes_text, signature_captured
  ) VALUES (
    employee_ids[9], client_ids[9], respite_id, regional_center_id,
    now() - interval '22 hours', now() - interval '18 hours',
    now() - interval '22 hours', now() - interval '18 hours',
    0, 0,
    'verified', 15,
    'on-time', 'verified', 'approved',
    true, 'Provided respite care. Client participated in activities.', true
  );
  
  -- Visit 10: Exception (outside geofence + missing signature), Companion, Private Pay
  WITH new_visit AS (
    INSERT INTO evv_visits (
      employee_id, client_id, service_type_id, funding_source_id,
      scheduled_start, scheduled_end,
      clock_in, clock_out,
      break_minutes, overtime_minutes,
      gps_status, gps_distance_meters,
      arrival_status, verification_status, timesheet_status,
      care_notes_completed, care_notes_text, signature_captured
    ) VALUES (
      employee_ids[10], client_ids[10], companion_id, private_pay_id,
      now() - interval '24 hours', now() - interval '20 hours',
      now() - interval '24 hours', now() - interval '20 hours',
      0, 0,
      'outside', 180,
      'on-time', 'exception', 'pending',
      true, 'Accompanied client to community activities and appointments.', false
    ) RETURNING id
  )
  INSERT INTO evv_exceptions (visit_id, type, severity, description)
  SELECT id, 'Outside Geofence (180m)', 'warning', 'Clock-in location was 180m from client address, exceeding the 100m radius.'
  FROM new_visit
  UNION ALL
  SELECT id, 'Missing Signature', 'error', 'Client signature was not captured at visit completion.'
  FROM new_visit;
  
  RAISE NOTICE 'Successfully created 10 test EVV visits';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to seed EVV test data: %', SQLERRM;
    RAISE NOTICE 'Make sure you have at least 10 active caregivers and 10 active clients';
END $$;
