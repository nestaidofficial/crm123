import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

/**
 * GET /api/coordinator/available-caregivers?eventId=X
 *
 * Returns ranked caregivers for a specific vacant shift.
 * Computes a simple matchScore based on role, availability,
 * prior client history, and existing outreach attempts.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { supabase, agencyId } = auth;
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  // 1. Fetch the target shift
  const { data: shift, error: shiftError } = await supabase
    .from("schedule_events")
    .select("id, start_at, end_at, care_type, client_id")
    .eq("id", eventId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (shiftError || !shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  // 2. Fetch active employees (caregivers)
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, first_name, last_name, role, phone, is_archived")
    .eq("agency_id", agencyId)
    .eq("is_archived", false);

  if (empError) {
    console.error("[available-caregivers] employees error:", empError);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }

  const caregiverRoles = new Set(["CNA", "HHA", "LPN", "RN", "PCA", "caregiver"]);
  const caregivers = (employees ?? []).filter(
    (e: any) => caregiverRoles.has(e.role) || e.role?.toLowerCase().includes("caregiver")
  );

  // 3. Fetch conflicting shifts on the same date
  const shiftStart = new Date(shift.start_at);
  const shiftEnd = new Date(shift.end_at);
  const dayStart = new Date(shiftStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(shiftStart);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: conflictingShifts } = await supabase
    .from("schedule_events")
    .select("caregiver_id, start_at, end_at")
    .eq("agency_id", agencyId)
    .not("status", "eq", "cancelled")
    .gte("start_at", dayStart.toISOString())
    .lte("start_at", dayEnd.toISOString());

  const busyCaregiverIds = new Set<string>();
  for (const cs of conflictingShifts ?? []) {
    if (!cs.caregiver_id) continue;
    const csStart = new Date(cs.start_at);
    const csEnd = new Date(cs.end_at);
    // Check time overlap
    if (csStart < shiftEnd && csEnd > shiftStart) {
      busyCaregiverIds.add(cs.caregiver_id);
    }
  }

  // 4. Fetch existing outreach attempts for this event
  const { data: existingAttempts } = await supabase
    .from("outreach_attempts")
    .select("caregiver_id, status")
    .eq("event_id", eventId);

  const attemptsByCaregiver = new Map<string, string>();
  for (const a of existingAttempts ?? []) {
    attemptsByCaregiver.set(a.caregiver_id, a.status);
  }

  // 5. Fetch prior shifts with same client (for "worked with" scoring)
  const priorClientWorkers = new Set<string>();
  if (shift.client_id) {
    const { data: priorShifts } = await supabase
      .from("schedule_events")
      .select("caregiver_id")
      .eq("client_id", shift.client_id)
      .eq("agency_id", agencyId)
      .not("caregiver_id", "is", null)
      .limit(100);

    for (const ps of priorShifts ?? []) {
      if (ps.caregiver_id) priorClientWorkers.add(ps.caregiver_id);
    }
  }

  // 6. Compute matchScore and build response
  const avatarColors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-cyan-100 text-cyan-700",
    "bg-rose-100 text-rose-700",
  ];

  const mapped = caregivers.map((emp: any, idx: number) => {
    const isAvailable = !busyCaregiverIds.has(emp.id);
    const workedWithClient = priorClientWorkers.has(emp.id);
    const existingAttemptStatus = attemptsByCaregiver.get(emp.id);
    const noPendingAttempt = !existingAttemptStatus || existingAttemptStatus === "declined" || existingAttemptStatus === "no_answer";

    // Simple scoring
    let matchScore = 0;
    const careType = shift.care_type ?? "";
    const roleMatchMap: Record<string, string[]> = {
      skilled_nursing: ["RN", "LPN"],
      personal_care: ["CNA", "HHA", "PCA"],
      companion_care: ["CNA", "HHA", "PCA"],
      respite_care: ["CNA", "HHA", "PCA", "LPN"],
    };
    const matchingRoles = roleMatchMap[careType] ?? [];
    if (matchingRoles.includes(emp.role)) matchScore += 30;

    if (isAvailable) matchScore += 30;
    if (workedWithClient) matchScore += 20;
    if (noPendingAttempt) matchScore += 20;

    const firstName = emp.first_name ?? "";
    const lastName = emp.last_name ?? "";
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    return {
      id: emp.id,
      firstName,
      lastName,
      role: emp.role ?? "Caregiver",
      initials,
      avatarColor: avatarColors[idx % avatarColors.length],
      matchScore,
      distance: null,
      availability: isAvailable ? "available" as const : "unavailable" as const,
      lastWorkedWith: workedWithClient ? "Previously" : "Never",
      existingAttemptStatus: existingAttemptStatus ?? null,
    };
  });

  // Sort by matchScore descending
  mapped.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

  return NextResponse.json({ data: mapped });
}
