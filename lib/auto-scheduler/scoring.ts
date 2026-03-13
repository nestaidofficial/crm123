// =============================================================================
// Auto Scheduler: Shared Caregiver Scoring Logic
// =============================================================================
// Extracted from app/api/coordinator/available-caregivers/route.ts
// Used by both the manual available-caregivers API and the auto-scheduler trigger.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeAddress } from "@/lib/geo/geocode";
import { haversineDistance } from "@/lib/geo/distance";

export interface ScoredCaregiver {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  matchScore: number;
  availability: "available" | "unavailable";
  distance?: number; // Distance in miles
}

/**
 * Fetch and score available caregivers for a given shift event.
 * Returns a ranked list sorted by matchScore descending.
 */
export async function getAvailableCaregivers(
  supabase: SupabaseClient,
  agencyId: string,
  eventId: string
): Promise<ScoredCaregiver[]> {
  // 1. Fetch the target shift with client address
  const { data: shift } = await supabase
    .from("schedule_events")
    .select("id, start_at, end_at, care_type, client_id, clients(address)")
    .eq("id", eventId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (!shift) return [];

  // 2. Fetch active employees (caregivers) with addresses
  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name, role, phone, is_archived, address")
    .eq("agency_id", agencyId)
    .eq("is_archived", false);

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

  // 5. Fetch prior shifts with same client
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

  // 6. Geocode client address for distance calculations
  let clientCoords = null;
  const client = Array.isArray(shift.clients) ? shift.clients[0] : shift.clients;
  if (client?.address) {
    const clientAddress = client.address;
    if (clientAddress.street && clientAddress.city && clientAddress.state && clientAddress.zip) {
      clientCoords = await geocodeAddress(clientAddress);
    }
  }

  // 7. Score and rank
  const scored: ScoredCaregiver[] = await Promise.all(caregivers.map(async (emp: any) => {
    const isAvailable = !busyCaregiverIds.has(emp.id);
    const workedWithClient = priorClientWorkers.has(emp.id);
    const existingAttemptStatus = attemptsByCaregiver.get(emp.id);
    const noPendingAttempt =
      !existingAttemptStatus ||
      existingAttemptStatus === "declined" ||
      existingAttemptStatus === "no_answer" ||
      existingAttemptStatus === "voicemail";

    let matchScore = 0;
    const careType = shift.care_type ?? "";
    const roleMatchMap: Record<string, string[]> = {
      skilled_nursing: ["RN", "LPN"],
      personal_care: ["CNA", "HHA", "PCA"],
      companion_care: ["CNA", "HHA", "PCA"],
      respite_care: ["CNA", "HHA", "PCA", "LPN"],
      live_in: ["CNA", "HHA", "PCA", "LPN", "RN"],
    };
    const matchingRoles = roleMatchMap[careType] ?? [];
    if (matchingRoles.includes(emp.role)) matchScore += 30;
    if (isAvailable) matchScore += 30;
    if (workedWithClient) matchScore += 20;
    if (noPendingAttempt) matchScore += 20;

    // Calculate distance and add distance scoring
    let distanceMiles = null;
    if (clientCoords && emp.address) {
      const empAddress = emp.address;
      if (empAddress.street && empAddress.city && empAddress.state && empAddress.zip) {
        const empCoords = await geocodeAddress(empAddress);
        if (empCoords) {
          distanceMiles = haversineDistance(
            clientCoords.lat, clientCoords.lng,
            empCoords.lat, empCoords.lng
          );
          
          // Distance scoring tiers
          if (distanceMiles <= 5) matchScore += 25;
          else if (distanceMiles <= 10) matchScore += 20;
          else if (distanceMiles <= 20) matchScore += 15;
          else if (distanceMiles <= 30) matchScore += 10;
          // 30+ miles or unknown: +0
        }
      }
    }

    return {
      id: emp.id,
      firstName: emp.first_name ?? "",
      lastName: emp.last_name ?? "",
      role: emp.role ?? "Caregiver",
      phone: emp.phone ?? null,
      matchScore,
      availability: isAvailable ? ("available" as const) : ("unavailable" as const),
      distance: distanceMiles ?? undefined,
    };
  }));

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored;
}
