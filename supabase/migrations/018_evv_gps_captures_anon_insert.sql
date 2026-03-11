-- =============================================================================
-- Allow anon INSERT on evv_gps_captures
-- =============================================================================
-- Migration 016 added anon write policies for corrections, audit log, and
-- visits but omitted evv_gps_captures. This migration adds the missing policy
-- so GPS locations can be saved when the caregiver clocks in/out.
-- =============================================================================

CREATE POLICY evv_gps_captures_insert_anon
  ON evv_gps_captures
  FOR INSERT
  TO anon
  WITH CHECK (true);
