// =============================================================================
// Auto Scheduler: Trigger Auto-Coverage After Callout
// =============================================================================
// Called fire-and-forget from cancel-shift/route.ts when auto_scheduler_enabled
// is ON. Orchestrates: create session → find caregivers → dispatch outreach.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAvailableCaregivers } from "./scoring";
import { dispatchOutreach } from "./outreach";
import { getRetellClient } from "@/lib/retell/client";
import { ensureOutboundAgent } from "@/lib/retell/outbound-sync";
import { toE164 } from "@/lib/phone";

interface TriggerParams {
  agencyId: string;
  eventId: string;
  originalCaregiverId?: string;
  originalCallId?: string;
  supabase: SupabaseClient;
}

/**
 * Trigger the full auto-coverage pipeline:
 * 1. Fetch original caregiver's phone
 * 2. Score and rank available caregivers
 * 3. Create auto_coverage_sessions row
 * 4. Dispatch outreach calls to all available caregivers
 */
export async function triggerAutoCoverage(params: TriggerParams): Promise<void> {
  const { agencyId, eventId, originalCaregiverId, originalCallId, supabase } = params;

  try {
    // 0. Check if an active auto-coverage session already exists for this shift
    // Only block if the session is still within its deadline (not expired/stale)
    const { data: existingSession } = await supabase
      .from("auto_coverage_sessions")
      .select("id, status, deadline_at")
      .eq("event_id", eventId)
      .in("status", ["outreach", "filled"])
      .maybeSingle();

    if (existingSession) {
      const isStillActive =
        existingSession.status === "filled" ||
        (existingSession.deadline_at && new Date(existingSession.deadline_at) > new Date());

      if (isStillActive) {
        console.warn(`[auto-scheduler] Active session exists for event ${eventId} (status: ${existingSession.status})`);
        await supabase.from("retell_sync_log").insert({
          agency_id: agencyId,
          action: "auto_scheduler.trigger",
          status: "skipped_active_session",
          request_payload: {
            event_id: eventId,
            existing_session_id: existingSession.id,
            existing_status: existingSession.status,
            deadline_at: existingSession.deadline_at,
          },
        });
        return;
      }

      // Session is in "outreach" but past its deadline — mark it expired and proceed
      console.warn(`[auto-scheduler] Stale session for event ${eventId} — deadline passed, re-triggering`);
      await supabase
        .from("auto_coverage_sessions")
        .update({ status: "expired" })
        .eq("id", existingSession.id);
    }

    // 1. Fetch original caregiver's phone number (if applicable)
    let originalPhone: string | null = null;
    if (originalCaregiverId) {
      const { data: originalCaregiver } = await supabase
        .from("employees")
        .select("phone, first_name, last_name")
        .eq("id", originalCaregiverId)
        .maybeSingle();

      originalPhone = originalCaregiver?.phone ? toE164(originalCaregiver.phone) : null;
    }

    // 2. Get available caregivers (exclude original caregiver from outreach)
    const scored = await getAvailableCaregivers(
      supabase, agencyId, eventId,
      originalCaregiverId ? [originalCaregiverId] : undefined
    );
    const available = scored.filter((c) => c.matchScore > 0 && c.availability === "available");

    // Limit to top 10 caregivers to prevent too many concurrent calls
    const maxOutreachPerShift = 10;
    const topCaregivers = available.slice(0, maxOutreachPerShift);

    if (topCaregivers.length === 0) {
      console.warn(`[auto-scheduler] No available caregivers for event ${eventId}`);
      await supabase.from("retell_sync_log").insert({
        agency_id: agencyId,
        action: "auto_scheduler.trigger",
        status: "no_caregivers",
        request_payload: { event_id: eventId, original_caregiver_id: originalCaregiverId ?? null },
      });
      return;
    }

    // 3. Create auto_coverage_sessions row
    const deadlineAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // now + 10 min

    const { data: session, error: sessionError } = await supabase
      .from("auto_coverage_sessions")
      .insert({
        agency_id: agencyId,
        event_id: eventId,
        original_caregiver_id: originalCaregiverId ?? null,
        original_call_id: originalCallId ?? null,
        original_caregiver_phone: originalPhone,
        status: "outreach",
        deadline_at: deadlineAt,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("[auto-scheduler] Failed to create session:", sessionError);
      return;
    }

    // 4. Fetch shift + agency details for outreach
    const { data: shift } = await supabase
      .from("schedule_events")
      .select("*, clients(first_name, last_name)")
      .eq("id", eventId)
      .maybeSingle();

    const { data: agency } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", agencyId)
      .maybeSingle();

    const { data: coordConfig } = await supabase
      .from("coordinator_config")
      .select("coverage_line, agency_timezone")
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (!shift) {
      console.error("[auto-scheduler] Shift not found:", eventId);
      await supabase.from("retell_sync_log").insert({
        agency_id: agencyId,
        action: "auto_scheduler.trigger",
        status: "shift_not_found",
        request_payload: { event_id: eventId },
      });
      return;
    }

    const clientName = shift.clients
      ? `${shift.clients.first_name ?? ""} ${shift.clients.last_name ?? ""}`.trim()
      : "a client";
    const agencyTimezone = coordConfig?.agency_timezone ?? "America/New_York";
    const startAt = new Date(shift.start_at);
    const endAt = new Date(shift.end_at);
    const shiftDate = startAt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: agencyTimezone,
    });
    const shiftTime = `${startAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: agencyTimezone,
    })} - ${endAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: agencyTimezone,
    })}`;
    const careTypeLabels: Record<string, string> = {
      personal_care: "Personal Care",
      companion_care: "Companion Care",
      skilled_nursing: "Skilled Nursing",
      respite_care: "Respite Care",
      live_in: "Live-In",
    };
    const careType = careTypeLabels[shift.care_type] ?? shift.care_type ?? "Care";
    const payRate = shift.pay_rate ? `$${Number(shift.pay_rate).toFixed(0)}/hr` : "standard rate";
    const agencyName = agency?.name ?? "your agency";
    const coverageLine = coordConfig?.coverage_line ? toE164(coordConfig.coverage_line) : null;

    // 5. Pre-flight: ensure Retell client, outbound agent, and coverage line are configured
    const retell = getRetellClient();
    const outboundAgentId = await ensureOutboundAgent(agencyId, supabase);

    if (!retell || !outboundAgentId || !coverageLine) {
      const missing = [
        !retell && "RETELL_API_KEY",
        !outboundAgentId && "outbound_agent",
        !coverageLine && "coverage_line",
      ].filter(Boolean);

      console.error(`[auto-scheduler] Config missing for outreach: ${missing.join(", ")}`);
      await supabase.from("retell_sync_log").insert({
        agency_id: agencyId,
        action: "auto_scheduler.trigger",
        status: "config_missing",
        error_message: `Missing: ${missing.join(", ")}`,
        request_payload: {
          event_id: eventId,
          session_id: session.id,
          has_retell: !!retell,
          has_outbound_agent: !!outboundAgentId,
          has_coverage_line: !!coverageLine,
        },
      });
      return;
    }

    // 6. Dispatch outreach to all available caregivers
    const results = await dispatchOutreach(
      supabase,
      retell,
      outboundAgentId,
      coverageLine,
      {
        agencyId,
        eventId,
        caregivers: topCaregivers.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
        })),
        autoCoverageSessionId: session.id,
      },
      { agencyName, clientName, shiftDate, shiftTime, careType, payRate }
    );

    const successCount = results.filter((r) => r.success).length;
    const noPhoneCount = results.filter((r) => r.error === "No phone number").length;
    console.log(`[auto-scheduler] Dispatched ${successCount}/${topCaregivers.length} outreach calls for event ${eventId} (${available.length} total available, ${noPhoneCount} missing phone)`);

    await supabase.from("retell_sync_log").insert({
      agency_id: agencyId,
      action: "auto_scheduler.trigger",
      status: "success",
      request_payload: {
        event_id: eventId,
        session_id: session.id,
        original_caregiver_id: originalCaregiverId ?? null,
        caregivers_contacted: successCount,
        caregivers_no_phone: noPhoneCount,
        total_available: available.length,
        max_outreach_limit: maxOutreachPerShift,
      },
    });
  } catch (err) {
    console.error("[auto-scheduler] Trigger failed:", err);
    await supabase.from("retell_sync_log").insert({
      agency_id: agencyId,
      action: "auto_scheduler.trigger",
      status: "error",
      error_message: err instanceof Error ? err.message : "Unknown error",
      request_payload: { event_id: eventId },
    });
  }
}
