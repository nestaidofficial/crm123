import { NextRequest, NextResponse } from "next/server";
import Retell from "retell-sdk";
import { getRetellClient } from "@/lib/retell/client";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/retell/tools/cancel-shift
 *
 * Retell custom tool endpoint — called mid-conversation when the AI coordinator
 * invokes the cancel_shift tool. Looks up the caregiver and their shift in the
 * schedule_events table and sets status = 'cancelled'.
 *
 * Only available when auto_fill_shifts is ON in the coordinator config.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // ── Verify Retell signature ───────────────────────────────────
    const apiKey = process.env.RETELL_API_KEY;
    if (apiKey) {
      const signature = request.headers.get("x-retell-signature") ?? "";
      const isValid = await Retell.verify(body, apiKey, signature);
      if (!isValid) {
        console.warn("[cancel-shift] Invalid Retell signature");
        return NextResponse.json({ result: "error", message: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const callId: string = payload.call_id;
    const toolInput = payload.tool_input ?? {};

    const caregiverFirstName: string = (toolInput.caregiver_first_name ?? "").trim();
    const caregiverLastName: string = (toolInput.caregiver_last_name ?? "").trim();
    const shiftDate: string = (toolInput.shift_date ?? "").trim();
    const shiftTime: string = (toolInput.shift_time ?? "").trim();

    if (!caregiverFirstName || !shiftDate) {
      return NextResponse.json({
        result: "error",
        message: "Missing required fields: caregiver_first_name and shift_date.",
      });
    }

    // ── Resolve agency from call → agent → coordinator_config ─────
    const retell = getRetellClient();
    if (!retell) {
      return NextResponse.json({ result: "error", message: "Retell client not configured" });
    }

    const supabase = createServerSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ result: "error", message: "Database not configured" });
    }

    let agentId: string | undefined;
    try {
      const call = await retell.call.retrieve(callId);
      agentId = call.agent_id;
    } catch (e) {
      console.error("[cancel-shift] Failed to retrieve call:", e);
      return NextResponse.json({ result: "error", message: "Could not retrieve call details" });
    }

    const { data: coordConfig } = await supabase
      .from("coordinator_config")
      .select("agency_id, auto_fill_shifts, assignment_mode")
      .eq("retell_agent_id", agentId)
      .maybeSingle();

    if (!coordConfig) {
      return NextResponse.json({ result: "error", message: "No coordinator config found for this agent" });
    }

    const agencyId: string = coordConfig.agency_id;
    const isAutoAssign =
      coordConfig.auto_fill_shifts && coordConfig.assignment_mode === "auto-assign";

    // ── Find caregiver ───────────────────────────────────────────
    let employeeQuery = supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("agency_id", agencyId)
      .eq("status", "active")
      .eq("is_archived", false)
      .ilike("first_name", caregiverFirstName);

    if (caregiverLastName) {
      employeeQuery = employeeQuery.ilike("last_name", caregiverLastName);
    }

    const { data: employees, error: empError } = await employeeQuery;

    if (empError) {
      console.error("[cancel-shift] Employee lookup error:", empError);
      return NextResponse.json({ result: "error", message: "Error looking up caregiver" });
    }

    if (!employees || employees.length === 0) {
      await logToSyncLog(supabase, agencyId, callId, "not_found", { caregiverFirstName, caregiverLastName });
      return NextResponse.json({
        result: "not_found",
        message: `No caregiver named ${caregiverFirstName}${caregiverLastName ? " " + caregiverLastName : ""} found.`,
      });
    }

    if (employees.length > 1 && !caregiverLastName) {
      const names = employees.map((e) => `${e.first_name} ${e.last_name}`).join(", ");
      return NextResponse.json({
        result: "multiple_matches",
        message: `Multiple caregivers found: ${names}. Please ask for the last name to narrow it down.`,
      });
    }

    // If multiple matches even with last name, take the first
    const caregiver = employees[0];

    // ── Find shift on that date ──────────────────────────────────
    const dateStart = `${shiftDate}T00:00:00`;
    const dateEnd = `${shiftDate}T23:59:59`;

    const { data: shifts, error: shiftError } = await supabase
      .from("schedule_events")
      .select("id, start_at, end_at, status, client_id")
      .eq("caregiver_id", caregiver.id)
      .eq("agency_id", agencyId)
      .in("status", ["scheduled", "confirmed"])
      .gte("start_at", dateStart)
      .lte("start_at", dateEnd)
      .order("start_at", { ascending: true });

    if (shiftError) {
      console.error("[cancel-shift] Shift lookup error:", shiftError);
      return NextResponse.json({ result: "error", message: "Error looking up shifts" });
    }

    if (!shifts || shifts.length === 0) {
      await logToSyncLog(supabase, agencyId, callId, "no_shift", {
        caregiverId: caregiver.id,
        shiftDate,
      });
      return NextResponse.json({
        result: "no_shift",
        message: `No upcoming shift found for ${caregiver.first_name} on ${shiftDate}.`,
      });
    }

    // Pick the best matching shift
    let targetShift = shifts[0];
    if (shiftTime && shifts.length > 1) {
      const [targetH, targetM] = shiftTime.split(":").map(Number);
      const targetMinutes = (targetH || 0) * 60 + (targetM || 0);

      let bestDiff = Infinity;
      for (const s of shifts) {
        const sDate = new Date(s.start_at);
        const sMinutes = sDate.getHours() * 60 + sDate.getMinutes();
        const diff = Math.abs(sMinutes - targetMinutes);
        if (diff < bestDiff) {
          bestDiff = diff;
          targetShift = s;
        }
      }
    }

    // ── Format human-readable time ───────────────────────────────
    const startTime = formatTime(targetShift.start_at);
    const endTime = formatTime(targetShift.end_at);

    if (isAutoAssign) {
      // ── Direct cancel (auto-assign mode) ───────────────────────
      const { error: updateError } = await supabase
        .from("schedule_events")
        .update({ status: "cancelled" })
        .eq("id", targetShift.id);

      if (updateError) {
        console.error("[cancel-shift] Update error:", updateError);
        return NextResponse.json({ result: "error", message: "Failed to cancel shift" });
      }

      // Audit log
      await supabase.from("schedule_audit_log").insert({
        event_id: targetShift.id,
        agency_id: agencyId,
        action: "cancelled",
        field_changed: "status",
        old_value: JSON.stringify({ status: targetShift.status }),
        new_value: JSON.stringify({ status: "cancelled" }),
        actor_id: null,
      });

      // Insert approved request row (audit trail)
      await supabase.from("coverage_requests").insert({
        agency_id: agencyId,
        request_type: "cancel_shift",
        caregiver_name: `${caregiver.first_name} ${caregiver.last_name}`,
        caregiver_id: caregiver.id,
        event_id: targetShift.id,
        shift_date: shiftDate,
        shift_time: shiftTime || null,
        reason: "Call-out via phone",
        status: "approved",
        retell_call_id: callId,
        action_payload: {
          action: "cancel",
          event_id: targetShift.id,
          original_status: targetShift.status,
        },
      });

      await logToSyncLog(supabase, agencyId, callId, "success", {
        caregiverId: caregiver.id,
        caregiverName: `${caregiver.first_name} ${caregiver.last_name}`,
        eventId: targetShift.id,
        shiftDate,
      });

      return NextResponse.json({
        result: "success",
        message: `Cancelled shift for ${caregiver.first_name} on ${shiftDate} (${startTime} - ${endTime}). The scheduling team has been notified.`,
      });
    }

    // ── Approval mode — create pending request, don't cancel yet ──
    await supabase.from("coverage_requests").insert({
      agency_id: agencyId,
      request_type: "cancel_shift",
      caregiver_name: `${caregiver.first_name} ${caregiver.last_name}`,
      caregiver_id: caregiver.id,
      event_id: targetShift.id,
      shift_date: shiftDate,
      shift_time: shiftTime || null,
      reason: "Call-out via phone",
      status: "pending",
      retell_call_id: callId,
      action_payload: {
        action: "cancel",
        event_id: targetShift.id,
        original_status: targetShift.status,
      },
    });

    await logToSyncLog(supabase, agencyId, callId, "pending_approval", {
      caregiverId: caregiver.id,
      caregiverName: `${caregiver.first_name} ${caregiver.last_name}`,
      eventId: targetShift.id,
      shiftDate,
    });

    return NextResponse.json({
      result: "success",
      message: `I've logged your call-out for ${shiftDate} (${startTime} - ${endTime}). The scheduling team will review and confirm the cancellation.`,
    });
  } catch (err) {
    console.error("[cancel-shift] Unhandled error:", err);
    return NextResponse.json({ result: "error", message: "An unexpected error occurred" });
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function logToSyncLog(
  supabase: ReturnType<typeof createServerSupabaseServiceClient>,
  agencyId: string,
  callId: string,
  status: string,
  details: Record<string, unknown>
) {
  if (!supabase) return;
  await supabase.from("retell_sync_log").insert({
    agency_id: agencyId,
    action: "tool.cancel_shift",
    status,
    request_payload: { call_id: callId, ...details },
  });
}
