-- Migration: 042_enable_schedule_realtime
-- Enable Supabase Realtime for schedule_events and coverage_requests tables
-- so the UI updates instantly when the AI coordinator modifies schedules.

-- Enable full replica identity so UPDATE/DELETE events include the full row
ALTER TABLE schedule_events REPLICA IDENTITY FULL;
ALTER TABLE coverage_requests REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE schedule_events;
ALTER PUBLICATION supabase_realtime ADD TABLE coverage_requests;
