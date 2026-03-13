import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { normalizeShortId } from "@/lib/utils";

/**
 * PATCH /api/coordinator-requests/[id]
 *
 * Approve or reject a coordinator request.
 * Body: { action: "approve" | "reject" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { supabase, agencyId, userId } = auth;
  const { id } = await params;

  const body = await request.json();
  const action: string = body.action;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: 'Invalid action. Must be "approve" or "reject".' },
      { status: 400 }
    );
  }

  // Fetch the request row
  const { data: reqRow, error: fetchErr } = await supabase
    .from("coverage_requests")
    .select("*")
    .eq("id", id)
    .eq("agency_id", agencyId)
    .single();

  if (fetchErr || !reqRow) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (reqRow.status === "approved" || reqRow.status === "rejected") {
    return NextResponse.json(
      { error: `Request already ${reqRow.status}` },
      { status: 409 }
    );
  }

  if (reqRow.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending requests can be approved or rejected" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const newStatus = action === "approve" ? "approved" : "rejected";

  // Update the request
  const { data: updateData, error: updateErr } = await supabase
    .from("coverage_requests")
    .update({
      status: newStatus,
      reviewed_by: userId,
      reviewed_at: now,
    })
    .eq("id", id)
    .select("id, status");

  if (updateErr) {
    console.error("[coordinator-requests] PATCH update error:", updateErr);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }

  if (!updateData || updateData.length === 0) {
    console.error(`[coordinator-requests] PATCH: no rows updated for id=${id}. Possible RLS issue.`);
    return NextResponse.json({ error: "Update failed — no rows affected. Check user permissions." }, { status: 403 });
  }

  console.log(`[coordinator-requests] PATCH: request ${id} → ${newStatus} (verified: ${updateData[0].status})`);

  let warning: string | null = null;

  // If approving, execute the action
  if (action === "approve") {
    const payload = reqRow.action_payload as Record<string, unknown> | null;

    if (payload?.action === "cancel" && payload?.event_id) {
      const eventId = payload.event_id as string;

      // Fetch the schedule event
      const { data: evt, error: evtErr } = await supabase
        .from("schedule_events")
        .select("id, status, caregiver_id")
        .eq("id", eventId)
        .single();

      if (evtErr || !evt) {
        console.error("[coordinator-requests] Event fetch error:", evtErr);
        warning = "Shift not found — it may have been deleted. Request approved but no schedule change made.";
      } else if (!evt.caregiver_id) {
        warning = "Shift already has no caregiver assigned. Request approved.";
      } else if (evt.status !== "scheduled" && evt.status !== "confirmed") {
        warning = `Shift status is "${evt.status}" — cannot modify. Request approved but no schedule change made.`;
      } else {
        // Remove caregiver from shift (makes it a vacant/open shift needing coverage)
        const { error: updateErr } = await supabase
          .from("schedule_events")
          .update({ caregiver_id: null })
          .eq("id", eventId);

        if (updateErr) {
          console.error("[coordinator-requests] Remove caregiver error:", updateErr);
          warning = "Failed to update the shift. Please remove the caregiver manually.";
        } else {
          // Audit log
          await supabase.from("schedule_audit_log").insert({
            event_id: eventId,
            agency_id: agencyId,
            action: "caregiver_removed",
            field_changed: "caregiver_id",
            old_value: JSON.stringify({ caregiver_id: evt.caregiver_id }),
            new_value: JSON.stringify({ caregiver_id: null }),
            actor_id: userId,
          });
        }
      }
    }

    // Handle unlinked callout requests (from webhook post-call analysis)
    // These have caregiver_name + shift_date but no event_id in payload
    if (
      !warning &&
      !payload?.event_id &&
      reqRow.request_type === "callout" &&
      reqRow.shift_date
    ) {
      let caregiver: { id: string; first_name: string; last_name: string } | null = null;

      // Try direct lookup by caregiver_id first (most reliable — skips name matching)
      if (reqRow.caregiver_id) {
        const { data: emp } = await supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("id", reqRow.caregiver_id)
          .single();
        if (emp) caregiver = emp;
      }

      // Fall back to short_id lookup from action_payload
      if (!caregiver) {
        const actionPayload = reqRow.action_payload as Record<string, unknown> | null;
        const rawShortId = actionPayload?.caregiver_short_id as string | undefined;
        if (rawShortId) {
          const normalized = normalizeShortId(rawShortId);
          if (normalized) {
            const { data: emp } = await supabase
              .from("employees")
              .select("id, first_name, last_name")
              .eq("agency_id", agencyId)
              .eq("short_id", normalized)
              .eq("status", "active")
              .eq("is_archived", false)
              .maybeSingle();
            if (emp) caregiver = emp;
          }
        }
      }

      // Fall back to name-based lookup
      if (!caregiver && reqRow.caregiver_name) {
        const nameParts = (reqRow.caregiver_name as string).trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

        let empQuery = supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("agency_id", agencyId)
          .eq("status", "active")
          .eq("is_archived", false)
          .ilike("first_name", firstName);

        if (lastName) {
          empQuery = empQuery.ilike("last_name", lastName);
        }

        const { data: employees, error: empErr } = await empQuery;

        if (empErr) {
          console.error("[coordinator-requests] Employee lookup error:", empErr);
          warning = "Failed to look up caregiver. Please cancel the shift manually.";
        } else if (!employees || employees.length === 0) {
          warning = `No active caregiver found matching "${reqRow.caregiver_name}". Request approved but no schedule change made.`;
        } else if (employees.length > 1) {
          warning = `Multiple caregivers match "${reqRow.caregiver_name}". Please cancel the correct shift manually.`;
        } else {
          caregiver = employees[0];
        }
      }

      if (!warning && !caregiver) {
        warning = "No caregiver linked to this request. Request approved but no schedule change made.";
      }

      if (!warning && caregiver) {
        // Find the shift on that date
        const shiftDate = reqRow.shift_date as string; // YYYY-MM-DD
        const dayStart = `${shiftDate}T00:00:00`;
        const dayEnd = `${shiftDate}T23:59:59`;

        const { data: shifts, error: shiftErr } = await supabase
          .from("schedule_events")
          .select("id, status, start_at")
          .eq("agency_id", agencyId)
          .eq("caregiver_id", caregiver.id)
          .gte("start_at", dayStart)
          .lte("start_at", dayEnd)
          .in("status", ["scheduled", "confirmed"]);

        if (shiftErr) {
          console.error("[coordinator-requests] Shift lookup error:", shiftErr);
          warning = "Failed to look up shift. Please cancel it manually.";
        } else if (!shifts || shifts.length === 0) {
          warning = `No scheduled shift found for ${caregiver.first_name} ${caregiver.last_name} on ${shiftDate}. Request approved but no schedule change made.`;
        } else {
          // Remove caregiver from matching shifts (makes them vacant/open for coverage)
          for (const shift of shifts) {
            const { error: updateErr } = await supabase
              .from("schedule_events")
              .update({ caregiver_id: null })
              .eq("id", shift.id);

            if (updateErr) {
              console.error("[coordinator-requests] Remove caregiver error:", updateErr);
              warning = "Failed to update the shift. Please remove the caregiver manually.";
              break;
            }

            // Audit log
            await supabase.from("schedule_audit_log").insert({
              event_id: shift.id,
              agency_id: agencyId,
              action: "caregiver_removed",
              field_changed: "caregiver_id",
              old_value: JSON.stringify({ caregiver_id: caregiver.id }),
              new_value: JSON.stringify({ caregiver_id: null }),
              actor_id: userId,
            });
          }
        }
      }
    }

    // Handle unlinked schedule_change requests (from post-call analysis, no event_id)
    if (
      !warning &&
      !payload?.event_id &&
      reqRow.request_type === "schedule_change" &&
      reqRow.shift_date
    ) {
      let caregiver: { id: string; first_name: string; last_name: string } | null = null;

      // Try direct lookup by caregiver_id first (most reliable — skips name matching)
      if (reqRow.caregiver_id) {
        const { data: emp } = await supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("id", reqRow.caregiver_id)
          .single();
        if (emp) caregiver = emp;
      }

      // Fall back to short_id lookup from action_payload
      if (!caregiver) {
        const actionPayload = reqRow.action_payload as Record<string, unknown> | null;
        const rawShortId = actionPayload?.caregiver_short_id as string | undefined;
        if (rawShortId) {
          const normalized = normalizeShortId(rawShortId);
          if (normalized) {
            const { data: emp } = await supabase
              .from("employees")
              .select("id, first_name, last_name")
              .eq("agency_id", agencyId)
              .eq("short_id", normalized)
              .eq("status", "active")
              .eq("is_archived", false)
              .maybeSingle();
            if (emp) caregiver = emp;
          }
        }
      }

      // Fall back to name-based lookup
      if (!caregiver && reqRow.caregiver_name) {
        const nameParts = (reqRow.caregiver_name as string).trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

        let empQuery = supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("agency_id", agencyId)
          .eq("status", "active")
          .eq("is_archived", false)
          .ilike("first_name", firstName);

        if (lastName) {
          empQuery = empQuery.ilike("last_name", lastName);
        }

        const { data: employees, error: empErr } = await empQuery;

        if (empErr) {
          console.error("[coordinator-requests] Employee lookup error:", empErr);
          warning = "Failed to look up caregiver. Please update the shift manually.";
        } else if (!employees || employees.length === 0) {
          warning = `No active caregiver found matching "${reqRow.caregiver_name}". Request approved but no schedule change made.`;
        } else if (employees.length > 1) {
          warning = `Multiple caregivers match "${reqRow.caregiver_name}". Please update the correct shift manually.`;
        } else {
          caregiver = employees[0];
        }
      }

      if (!warning && !caregiver) {
        warning = "No caregiver linked to this request. Request approved but no schedule change made.";
      }

      if (!warning && caregiver) {
        const shiftDate = reqRow.shift_date as string;
        const dayStart = `${shiftDate}T00:00:00`;
        const dayEnd = `${shiftDate}T23:59:59`;

        const { data: shifts, error: shiftErr } = await supabase
          .from("schedule_events")
          .select("id, status, start_at, end_at")
          .eq("agency_id", agencyId)
          .eq("caregiver_id", caregiver.id)
          .gte("start_at", dayStart)
          .lte("start_at", dayEnd)
          .in("status", ["scheduled", "confirmed"]);

        if (shiftErr) {
          console.error("[coordinator-requests] Shift lookup error:", shiftErr);
          warning = "Failed to look up shift. Please update it manually.";
        } else if (!shifts || shifts.length === 0) {
          warning = `No scheduled shift found for ${caregiver.first_name} ${caregiver.last_name} on ${shiftDate}. Request approved but no schedule change made.`;
        } else {
          const targetShift = shifts[0];
          const newStart = payload?.new_start as string | undefined;
          const newEnd = payload?.new_end as string | undefined;

          if (newStart && newEnd) {
            const { error: rescheduleErr } = await supabase
              .from("schedule_events")
              .update({ start_at: newStart, end_at: newEnd })
              .eq("id", targetShift.id);

            if (rescheduleErr) {
              console.error("[coordinator-requests] Reschedule shift error:", rescheduleErr);
              warning = "Failed to reschedule the shift. Please update it manually.";
            } else {
              await supabase.from("schedule_audit_log").insert({
                event_id: targetShift.id,
                agency_id: agencyId,
                action: "time_changed",
                field_changed: "start_at,end_at",
                old_value: JSON.stringify({ start_at: targetShift.start_at, end_at: targetShift.end_at }),
                new_value: JSON.stringify({ start_at: newStart, end_at: newEnd }),
                actor_id: userId,
              });
            }
          } else {
            warning = "Schedule change approved but missing new start/end times. Please update the shift manually.";
          }
        }
      }
    }

    if (payload?.action === "reschedule" && payload?.event_id) {
      const eventId = payload.event_id as string;
      const newStart = payload.new_start as string | undefined;
      const newEnd = payload.new_end as string | undefined;

      if (!newStart || !newEnd) {
        warning = "Reschedule approved but missing new start/end times in payload. Please update the shift manually.";
      } else {
        // Fetch the schedule event
        const { data: evt, error: evtErr } = await supabase
          .from("schedule_events")
          .select("id, status, start_at, end_at")
          .eq("id", eventId)
          .single();

        if (evtErr || !evt) {
          warning = "Shift not found — it may have been deleted. Request approved but no schedule change made.";
        } else if (evt.status !== "scheduled" && evt.status !== "confirmed") {
          warning = `Shift status is "${evt.status}" — cannot reschedule. Request approved but no schedule change made.`;
        } else {
          // Reschedule the shift
          const { error: rescheduleErr } = await supabase
            .from("schedule_events")
            .update({ start_at: newStart, end_at: newEnd })
            .eq("id", eventId);

          if (rescheduleErr) {
            console.error("[coordinator-requests] Reschedule event error:", rescheduleErr);
            warning = "Failed to reschedule the shift. Please update it manually.";
          } else {
            // Audit log
            await supabase.from("schedule_audit_log").insert({
              event_id: eventId,
              agency_id: agencyId,
              action: "time_changed",
              field_changed: "start_at,end_at",
              old_value: JSON.stringify({ start_at: evt.start_at, end_at: evt.end_at }),
              new_value: JSON.stringify({ start_at: newStart, end_at: newEnd }),
              actor_id: userId,
            });
          }
        }
      }
    }
  }

  const result = {
    id,
    status: newStatus,
    reviewedBy: userId,
    reviewedAt: now,
    ...(warning ? { warning } : {}),
  };

  return NextResponse.json({ data: result });
}
