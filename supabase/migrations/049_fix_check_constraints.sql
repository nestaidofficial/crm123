-- ==========================================
-- Migration 049: Fix CHECK Constraints for Auto-Scheduler
-- ==========================================
-- Fixes critical database constraint violations in auto-scheduler:
-- 1. Add 'cancelled' to outreach_attempts.status CHECK constraint
-- 2. Add 'auto_assigned' and 'caregiver_removed' to schedule_audit_log.action CHECK constraint

-- Fix outreach_attempts status CHECK to include 'cancelled'
-- This is needed for assign.ts and auto-scheduler-timeout.ts which set status to 'cancelled'
ALTER TABLE outreach_attempts DROP CONSTRAINT IF EXISTS outreach_attempts_status_check;
ALTER TABLE outreach_attempts ADD CONSTRAINT outreach_attempts_status_check
  CHECK (status IN ('pending','in_progress','accepted','declined','no_answer','voicemail','failed','cancelled'));

-- Fix schedule_audit_log action CHECK to include new auto-scheduler actions
-- This is needed for assign.ts ('auto_assigned') and cancel-shift.ts ('caregiver_removed')
ALTER TABLE schedule_audit_log DROP CONSTRAINT IF EXISTS schedule_audit_log_action_check;
ALTER TABLE schedule_audit_log ADD CONSTRAINT schedule_audit_log_action_check
  CHECK (action IN ('created','updated','time_changed','reassigned','status_changed','cancelled','deleted','auto_assigned','caregiver_removed'));