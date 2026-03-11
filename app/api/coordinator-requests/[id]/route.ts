import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

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
  const { error: updateErr } = await supabase
    .from("coverage_requests")
    .update({
      status: newStatus,
      reviewed_by: userId,
      reviewed_at: now,
    })
    .eq("id", id);

  if (updateErr) {
    console.error("[coordinator-requests] PATCH update error:", updateErr);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }

  let warning: string | null = null;

  // If approving, execute the action
  if (action === "approve") {
    const payload = reqRow.action_payload as Record<string, unknown> | null;

    if (payload?.action === "cancel" && payload?.event_id) {
      const eventId = payload.event_id as string;

      // Fetch the schedule event
      const { data: evt, error: evtErr } = await supabase
        .from("schedule_events")
        .select("id, status")
        .eq("id", eventId)
        .single();

      if (evtErr || !evt) {
        warning = "Shift not found — it may have been deleted. Request approved but no schedule change made.";
      } else if (evt.status === "cancelled") {
        warning = "Shift was already cancelled. Request approved.";
      } else if (evt.status !== "scheduled" && evt.status !== "confirmed") {
        warning = `Shift status is "${evt.status}" — cannot cancel. Request approved but no schedule change made.`;
      } else {
        // Cancel the shift
        const { error: cancelErr } = await supabase
          .from("schedule_events")
          .update({ status: "cancelled" })
          .eq("id", eventId);

        if (cancelErr) {
          console.error("[coordinator-requests] Cancel event error:", cancelErr);
          warning = "Failed to cancel the shift. Please cancel it manually.";
        } else {
          // Audit log
          await supabase.from("schedule_audit_log").insert({
            event_id: eventId,
            agency_id: agencyId,
            action: "cancelled",
            field_changed: "status",
            old_value: JSON.stringify({ status: evt.status }),
            new_value: JSON.stringify({ status: "cancelled" }),
            actor_id: userId,
          });
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
