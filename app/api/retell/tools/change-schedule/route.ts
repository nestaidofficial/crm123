import { NextRequest, NextResponse } from "next/server";
import Retell from "retell-sdk";
import { getRetellClient } from "@/lib/retell/client";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { normalizeShortId } from "@/lib/utils";

/**
 * POST /api/retell/tools/change-schedule
 *
 * Retell custom tool endpoint — called mid-conversation when the AI coordinator
 * invokes the change_schedule tool. Looks up the caregiver's shift and reschedules
 * it to a new date/time.
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
        console.warn("[change-schedule] Invalid Retell signature");
        return NextResponse.json({ result: "error", message: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const callId: string = payload.call_id;
    const toolInput = payload.tool_input ?? {};

    const caregiverFirstName: string = (toolInput.caregiver_first_name ?? "").trim();
    const caregiverLastName: string = (toolInput.caregiver_last_name ?? "").trim();
    const currentShiftDate: string = (toolInput.current_shift_date ?? "").trim();
    const currentShiftTime: string = (toolInput.current_shift_time ?? "").trim();
    const newDate: string = (toolInput.new_date ?? "").trim();
    const newStartTime: string = (toolInput.new_start_time ?? "").trim();
    const newEndTime: string = (toolInput.new_end_time ?? "").trim();
    const reason: string = (toolInput.reason ?? "").trim();

    const caregiverShortIdInput: string = normalizeShortId(toolInput.caregiver_short_id ?? "") ?? "";

    if (!caregiverShortIdInput && !caregiverFirstName) {
      return NextResponse.json({
        result: "error",
        message: "Either employee ID or caregiver name is required.",
      });
    }
    if (!currentShiftDate) {
      return NextResponse.json({
        result: "error",
        message: "Missing required field: current_shift_date.",
      });
    }

    if (!newDate && !newStartTime) {
      return NextResponse.json({
        result: "error",
        message: "At least one of new_date or new_start_time must be provided.",
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
      console.error("[change-schedule] Failed to retrieve call:", e);
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
    const caregiverShortId = caregiverShortIdInput;
    let employees: { id: string; first_name: string; last_name: string; short_id?: string }[] | null = null;

    // Try exact short_id lookup first
    if (caregiverShortId) {
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name, short_id")
        .eq("agency_id", agencyId)
        .eq("short_id", caregiverShortId)
        .eq("status", "active")
        .eq("is_archived", false)
        .maybeSingle();
      if (data) employees = [data];
    }

    // Fall through to name-based lookup if no short_id match
    if (!employees || employees.length === 0) {
      let employeeQuery = supabase
        .from("employees")
        .select("id, first_name, last_name, short_id")
        .eq("agency_id", agencyId)
        .eq("status", "active")
        .eq("is_archived", false)
        .ilike("first_name", caregiverFirstName);

      if (caregiverLastName) {
        employeeQuery = employeeQuery.ilike("last_name", caregiverLastName);
      }

      const { data, error: empError } = await employeeQuery;
      employees = data;

      if (empError) {
        console.error("[change-schedule] Employee lookup error:", empError);
        return NextResponse.json({ result: "error", message: "Error looking up caregiver" });
      }
    }

    // Full-name fallback: if no results and first_name contains spaces,
    // Retell may have put the full name in caregiver_first_name
    if ((!employees || employees.length === 0) && !caregiverLastName) {
      const parts = caregiverFirstName.split(/\s+/);
      if (parts.length >= 2) {
        const fallbackFirst = parts[0];
        const fallbackLast = parts.slice(1).join(" ");
        const { data: retryEmployees } = await supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("agency_id", agencyId)
          .eq("status", "active")
          .eq("is_archived", false)
          .ilike("first_name", fallbackFirst)
          .ilike("last_name", fallbackLast);

        if (retryEmployees && retryEmployees.length > 0) {
          employees = retryEmployees;
        }
      }
    }

    if (!employees || employees.length === 0) {
      await logToSyncLog(supabase, agencyId, callId, "not_found", { caregiverShortId, caregiverFirstName, caregiverLastName });
      const identifier = caregiverShortId
        ? `employee ID ${caregiverShortId}`
        : `${caregiverFirstName}${caregiverLastName ? " " + caregiverLastName : ""}`;
      return NextResponse.json({
        result: "not_found",
        message: `No caregiver found with ${identifier}.`,
      });
    }

    if (employees.length > 1 && !caregiverLastName) {
      const names = employees.map((e) => `${e.first_name} ${e.last_name}`).join(", ");
      return NextResponse.json({
        result: "multiple_matches",
        message: `Multiple caregivers found: ${names}. Please ask for the last name to narrow it down.`,
      });
    }

    const caregiver = employees[0];

    // ── Find existing shift on the current date ──────────────────
    const dateStart = `${currentShiftDate}T00:00:00`;
    const dateEnd = `${currentShiftDate}T23:59:59`;

    const { data: shifts, error: shiftError } = await supabase
      .from("schedule_events")
      .select("id, title, start_at, end_at, status, client_id")
      .eq("caregiver_id", caregiver.id)
      .eq("agency_id", agencyId)
      .in("status", ["scheduled", "confirmed"])
      .gte("start_at", dateStart)
      .lte("start_at", dateEnd)
      .order("start_at", { ascending: true });

    if (shiftError) {
      console.error("[change-schedule] Shift lookup error:", shiftError);
      return NextResponse.json({ result: "error", message: "Error looking up shifts" });
    }

    if (!shifts || shifts.length === 0) {
      await logToSyncLog(supabase, agencyId, callId, "no_shift", {
        caregiverId: caregiver.id,
        currentShiftDate,
      });
      return NextResponse.json({
        result: "no_shift",
        message: `No upcoming shift found for ${caregiver.first_name} on ${currentShiftDate}.`,
      });
    }

    // Pick the best matching shift by time
    let targetShift = shifts[0];
    if (currentShiftTime && shifts.length > 1) {
      const [targetH, targetM] = currentShiftTime.split(":").map(Number);
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

    // ── Calculate new start/end times ─────────────────────────────
    const oldStart = new Date(targetShift.start_at);
    const oldEnd = new Date(targetShift.end_at);
    const shiftDurationMs = oldEnd.getTime() - oldStart.getTime();

    // Determine new date (use current date if not changing)
    const effectiveNewDate = newDate || currentShiftDate;

    // Determine new start time
    let newStartIso: string;
    if (newStartTime) {
      newStartIso = `${effectiveNewDate}T${newStartTime}:00`;
    } else {
      // Keep same time, just change date
      const oldTimeStr = oldStart.toISOString().split("T")[1];
      newStartIso = `${effectiveNewDate}T${oldTimeStr}`;
    }

    // Determine new end time
    let newEndIso: string;
    if (newEndTime) {
      newEndIso = `${effectiveNewDate}T${newEndTime}:00`;
    } else {
      // Preserve original shift duration
      const newStartDate = new Date(newStartIso);
      const newEndDate = new Date(newStartDate.getTime() + shiftDurationMs);
      newEndIso = newEndDate.toISOString();
    }

    const oldStartFormatted = formatTime(targetShift.start_at);
    const oldEndFormatted = formatTime(targetShift.end_at);
    const newStartFormatted = formatTime(newStartIso);
    const newEndFormatted = formatTime(newEndIso);

    if (isAutoAssign) {
      // ── Direct reschedule (auto-assign mode) ────────────────────
      const { error: updateError } = await supabase
        .from("schedule_events")
        .update({
          start_at: newStartIso,
          end_at: newEndIso,
        })
        .eq("id", targetShift.id);

      if (updateError) {
        console.error("[change-schedule] Update error:", updateError);
        return NextResponse.json({ result: "error", message: "Failed to update shift" });
      }

      // Audit log
      await supabase.from("schedule_audit_log").insert({
        event_id: targetShift.id,
        agency_id: agencyId,
        action: "time_changed",
        field_changed: "start_at,end_at",
        old_value: JSON.stringify({ start_at: targetShift.start_at, end_at: targetShift.end_at }),
        new_value: JSON.stringify({ start_at: newStartIso, end_at: newEndIso }),
        actor_id: null,
      });

      // Insert approved request row (audit trail)
      await supabase.from("coverage_requests").insert({
        agency_id: agencyId,
        request_type: "schedule_change",
        caregiver_name: `${caregiver.first_name} ${caregiver.last_name}`,
        caregiver_id: caregiver.id,
        event_id: targetShift.id,
        shift_date: effectiveNewDate,
        shift_time: newStartTime || null,
        reason: reason || "Schedule change via phone",
        status: "approved",
        retell_call_id: callId,
        action_payload: {
          action: "reschedule",
          event_id: targetShift.id,
          old_start: targetShift.start_at,
          old_end: targetShift.end_at,
          new_start: newStartIso,
          new_end: newEndIso,
        },
      });

      await logToSyncLog(supabase, agencyId, callId, "success", {
        caregiverId: caregiver.id,
        caregiverName: `${caregiver.first_name} ${caregiver.last_name}`,
        eventId: targetShift.id,
        oldDate: currentShiftDate,
        newDate: effectiveNewDate,
        newStartTime,
        newEndTime,
      });

      return NextResponse.json({
        result: "success",
        message: `Shift for ${caregiver.first_name} has been rescheduled from ${currentShiftDate} (${oldStartFormatted} - ${oldEndFormatted}) to ${effectiveNewDate} (${newStartFormatted} - ${newEndFormatted}). The scheduling team has been notified.`,
      });
    }

    // ── Approval mode — create pending request ────────────────────
    await supabase.from("coverage_requests").insert({
      agency_id: agencyId,
      request_type: "schedule_change",
      caregiver_name: `${caregiver.first_name} ${caregiver.last_name}`,
      caregiver_id: caregiver.id,
      event_id: targetShift.id,
      shift_date: effectiveNewDate,
      shift_time: newStartTime || null,
      reason: reason || "Schedule change via phone",
      status: "pending",
      retell_call_id: callId,
      action_payload: {
        action: "reschedule",
        event_id: targetShift.id,
        old_start: targetShift.start_at,
        old_end: targetShift.end_at,
        new_start: newStartIso,
        new_end: newEndIso,
      },
    });

    await logToSyncLog(supabase, agencyId, callId, "pending_approval", {
      caregiverId: caregiver.id,
      caregiverName: `${caregiver.first_name} ${caregiver.last_name}`,
      eventId: targetShift.id,
      oldDate: currentShiftDate,
      newDate: effectiveNewDate,
      newStartTime,
      newEndTime,
    });

    return NextResponse.json({
      result: "success",
      message: `I've logged your request to reschedule from ${currentShiftDate} (${oldStartFormatted} - ${oldEndFormatted}) to ${effectiveNewDate} (${newStartFormatted} - ${newEndFormatted}). The scheduling team will review and confirm.`,
    });
  } catch (err) {
    console.error("[change-schedule] Unhandled error:", err);
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
    action: "tool.change_schedule",
    status,
    request_payload: { call_id: callId, ...details },
  });
}
