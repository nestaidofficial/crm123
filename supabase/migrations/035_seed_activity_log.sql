-- =============================================================================
-- Seed Activity Log with sample data for testing
-- =============================================================================
-- This migration adds sample activity log entries for dashboard testing
-- Run this after 034_create_activity_log.sql
-- =============================================================================

-- Note: This uses a placeholder agency_id. 
-- In production, these should be created via the API when actual events occur.
-- For testing, you can replace 'YOUR_AGENCY_ID_HERE' with your actual agency UUID.

DO $$
DECLARE
  sample_agency_id UUID;
  sample_client_id UUID;
  sample_employee_id UUID;
BEGIN
  -- Try to get an existing agency ID (first one found)
  SELECT id INTO sample_agency_id FROM agencies LIMIT 1;
  
  -- Only insert sample data if an agency exists
  IF sample_agency_id IS NOT NULL THEN
    -- Get sample client and employee IDs
    SELECT id INTO sample_client_id FROM clients WHERE agency_id = sample_agency_id LIMIT 1;
    SELECT id INTO sample_employee_id FROM employees WHERE agency_id = sample_agency_id LIMIT 1;
    
    -- Insert sample activities (only if they don't exist)
    INSERT INTO activity_log (agency_id, type, title, description, actor_name, status, client_id, employee_id, created_at)
    SELECT 
      sample_agency_id,
      'care_note',
      'Care note completed',
      'Visit notes for ' || COALESCE((SELECT first_name || ' ' || last_name FROM clients WHERE id = sample_client_id), 'client'),
      'Emily Chen',
      'completed',
      sample_client_id,
      NULL,
      NOW() - INTERVAL '15 minutes'
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_log WHERE title = 'Care note completed' AND created_at > NOW() - INTERVAL '1 hour'
    );

    INSERT INTO activity_log (agency_id, type, title, description, actor_name, status, schedule_event_id, created_at)
    SELECT 
      sample_agency_id,
      'schedule',
      'Schedule updated',
      'New shift assigned to caregiver',
      'Michael Brown',
      'completed',
      NULL,
      NOW() - INTERVAL '45 minutes'
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_log WHERE title = 'Schedule updated' AND created_at > NOW() - INTERVAL '1 hour'
    );

    INSERT INTO activity_log (agency_id, type, title, description, actor_name, status, client_id, created_at)
    SELECT 
      sample_agency_id,
      'client',
      'New client registered',
      COALESCE((SELECT first_name || ' ' || last_name FROM clients WHERE id = sample_client_id), 'New client') || ' added to system',
      'Sarah Davis',
      'pending',
      sample_client_id,
      NOW() - INTERVAL '2 hours'
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_log WHERE title = 'New client registered' AND created_at > NOW() - INTERVAL '3 hours'
    );

    INSERT INTO activity_log (agency_id, type, title, description, actor_name, status, created_at)
    SELECT 
      sample_agency_id,
      'visit',
      'Visit completed',
      'EVV check-out verified',
      'Jennifer Lee',
      'completed',
      NOW() - INTERVAL '3 hours'
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_log WHERE title = 'Visit completed' AND created_at > NOW() - INTERVAL '4 hours'
    );

    INSERT INTO activity_log (agency_id, type, title, description, actor_name, status, employee_id, created_at)
    SELECT 
      sample_agency_id,
      'alert',
      'Compliance alert',
      'Missing documentation for recent visit',
      'System',
      'urgent',
      sample_employee_id,
      NOW() - INTERVAL '4 hours'
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_log WHERE title = 'Compliance alert' AND created_at > NOW() - INTERVAL '5 hours'
    );

    INSERT INTO activity_log (agency_id, type, title, description, actor_name, status, created_at)
    SELECT 
      sample_agency_id,
      'task',
      'Task pending',
      'Follow-up required for client assessment',
      'David Wilson',
      'pending',
      NOW() - INTERVAL '5 hours'
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_log WHERE title = 'Task pending' AND created_at > NOW() - INTERVAL '6 hours'
    );
  END IF;
END $$;
