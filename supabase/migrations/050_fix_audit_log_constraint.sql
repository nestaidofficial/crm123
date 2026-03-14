-- ==========================================
-- Migration 050: Fix schedule_audit_log CHECK constraint for auto-scheduler
-- ==========================================
-- Adds 'auto_reassigned' to the schedule_audit_log.action CHECK constraint.
-- This is needed by app/api/cron/auto-scheduler-timeout/route.ts which inserts
-- action='auto_reassigned' when no coverage is found within the deadline.

-- Fix schedule_audit_log action CHECK to include 'auto_reassigned'
ALTER TABLE schedule_audit_log DROP CONSTRAINT IF EXISTS schedule_audit_log_action_check;
ALTER TABLE schedule_audit_log ADD CONSTRAINT schedule_audit_log_action_check
  CHECK (action IN ('created','updated','time_changed','reassigned','status_changed','cancelled','deleted','auto_assigned','caregiver_removed','auto_reassigned'));