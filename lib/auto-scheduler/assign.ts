// =============================================================================
// Auto Scheduler: Auto-Assignment on Acceptance
// =============================================================================
// Called from webhook handler when an outreach call response is "accepted".
// Assigns the caregiver to the vacant shift if it's still open.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Handle auto-assignment when a caregiver accepts an outreach call.
 * Uses optimistic concurrency: only assigns if the shift is still vacant.
 */
export async function handleAutoAssignment(
  supabase: SupabaseClient,
  attemptId: string
): Promise<void> {
  try {
    // 1. Fetch the outreach attempt
    const { data: attempt } = await supabase
      .from("outreach_attempts")
      .select("event_id, caregiver_id, agency_id")
      .eq("id", attemptId)
      .maybeSingle();

    if (!attempt) {
      console.warn(`[auto-assign] Attempt ${attemptId} not found`);
      return;
    }

    // 2. Check for an active auto_coverage_session for this event
    const { data: session } = await supabase
      .from("auto_coverage_sessions")
      .select("id")
      .eq("event_id", attempt.event_id)
      .eq("status", "outreach")
      .maybeSingle();

    if (!session) {
      // Not an auto-scheduler outreach — skip
      return;
    }

    // 3. Attempt to assign: only succeeds if shift is still vacant (caregiver_id IS NULL)
    const { data: updated, error: updateError } = await supabase
      .from("schedule_events")
      .update({ caregiver_id: attempt.caregiver_id, status: "scheduled", is_open_shift: false })
      .eq("id", attempt.event_id)
      .is("caregiver_id", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[auto-assign] Failed to update shift:", updateError);
      return;
    }

    if (!updated) {
      // Shift already filled (race condition) — log and skip
      console.log(`[auto-assign] Shift ${attempt.event_id} already filled, skipping assignment for ${attempt.caregiver_id}`);
      return;
    }

    // 4. Assignment succeeded - perform remaining operations in sequence
    console.log(`[auto-assign] Assigned caregiver ${attempt.caregiver_id} to shift ${attempt.event_id}`);

    try {
      // Audit log
      await supabase.from("schedule_audit_log").insert({
        event_id: attempt.event_id,
        agency_id: attempt.agency_id,
        action: "auto_assigned",
        field_changed: "caregiver_id",
        old_value: JSON.stringify({ caregiver_id: null }),
        new_value: JSON.stringify({ caregiver_id: attempt.caregiver_id }),
        actor_id: null,
      });

      // Update session: filled
      await supabase
        .from("auto_coverage_sessions")
        .update({
          status: "filled",
          assigned_caregiver_id: attempt.caregiver_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      // Cancel remaining pending/in_progress outreach attempts for this event
      await supabase
        .from("outreach_attempts")
        .update({ status: "cancelled" })
        .eq("event_id", attempt.event_id)
        .neq("id", attemptId)
        .in("status", ["pending", "in_progress"]);
    } catch (postAssignError) {
      console.error("[auto-assign] Error in post-assignment operations:", postAssignError);
      // Assignment already succeeded, so we don't revert the shift assignment
      // but we should log this for monitoring
    }
  } catch (err) {
    console.error("[auto-assign] Error:", err);
  }
}
