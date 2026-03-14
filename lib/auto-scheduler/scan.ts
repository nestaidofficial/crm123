// =============================================================================
// Auto Scheduler: Scan for Uncovered Vacant Shifts
// =============================================================================
// Shared logic used by both the cron job and the toggle-on immediate trigger.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

interface UncoveredShift {
  id: string;
  agency_id: string;
}

/**
 * Find vacant future shifts that don't have an active auto_coverage_session.
 *
 * @param supabase  Service-role client
 * @param agencyIds One or more agency IDs to scan
 * @returns Array of uncovered shifts (id + agency_id)
 */
export async function findUncoveredVacantShifts(
  supabase: SupabaseClient,
  agencyIds: string[]
): Promise<UncoveredShift[]> {
  if (agencyIds.length === 0) return [];

  // 1. Find vacant future shifts (caregiver_id IS NULL, not cancelled)
  const { data: vacantShifts, error: shiftError } = await supabase
    .from("schedule_events")
    .select("id, agency_id")
    .in("agency_id", agencyIds)
    .is("caregiver_id", null)
    .gt("start_at", new Date().toISOString())
    .in("status", ["scheduled", "confirmed"])
    .limit(50);

  if (shiftError) {
    console.error("[auto-scheduler/scan] Shift query error:", shiftError);
    return [];
  }

  if (!vacantShifts || vacantShifts.length === 0) return [];

  // 2. Exclude shifts that already have an active auto_coverage_session
  const shiftIds = vacantShifts.map((s) => s.id);
  const now = new Date().toISOString();
  
  // First, expire any stale outreach sessions (past their deadline)
  await supabase
    .from("auto_coverage_sessions")
    .update({ status: "expired", updated_at: now })
    .in("event_id", shiftIds)
    .eq("status", "outreach")
    .lt("deadline_at", now);

  // Then find truly active sessions: filled OR outreach with future deadline
  const { data: activeSessions } = await supabase
    .from("auto_coverage_sessions")
    .select("event_id")
    .in("event_id", shiftIds)
    .or(`status.eq.filled,and(status.eq.outreach,deadline_at.gt.${now})`);

  const coveredIds = new Set((activeSessions ?? []).map((s) => s.event_id));
  return vacantShifts.filter((s) => !coveredIds.has(s.id));
}
