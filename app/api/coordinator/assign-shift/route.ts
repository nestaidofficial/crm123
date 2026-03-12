import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

/**
 * POST /api/coordinator/assign-shift
 *
 * Assigns a caregiver to a vacant shift.
 * Body: { eventId: string, caregiverId: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { supabase, agencyId, userId } = auth;

  let body: { eventId: string; caregiverId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId, caregiverId } = body;
  if (!eventId || !caregiverId) {
    return NextResponse.json({ error: "eventId and caregiverId are required" }, { status: 400 });
  }

  // Verify shift belongs to agency
  const { data: shift } = await supabase
    .from("schedule_events")
    .select("id, agency_id")
    .eq("id", eventId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  // Update the shift
  const { error: updateError } = await supabase
    .from("schedule_events")
    .update({
      caregiver_id: caregiverId,
      status: "scheduled",
      is_open_shift: false,
    })
    .eq("id", eventId);

  if (updateError) {
    console.error("[assign-shift] update error:", updateError);
    return NextResponse.json({ error: "Failed to assign shift" }, { status: 500 });
  }

  // Insert audit log entry
  await supabase.from("schedule_audit_log").insert({
    event_id: eventId,
    action: "reassigned",
    field_changed: "caregiver_id",
    old_value: null,
    new_value: caregiverId,
    actor_id: null, // Could use userId if it maps to employees table
  });

  return NextResponse.json({ success: true });
}
