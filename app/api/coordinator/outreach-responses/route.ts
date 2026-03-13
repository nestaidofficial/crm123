import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { geocodeAddress } from "@/lib/geo/geocode";
import { haversineDistance, formatDistance } from "@/lib/geo/distance";

/**
 * GET /api/coordinator/outreach-responses?eventId=X
 *
 * Fetches outreach_attempts joined with employee names for a given event.
 * Returns data shaped for the Responses panel in the Coverage Coordinator UI.
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

  // Fetch outreach attempts with employee details
  const { data, error } = await supabase
    .from("outreach_attempts")
    .select("*, employees(id, first_name, last_name, role, address)")
    .eq("agency_id", agencyId)
    .eq("event_id", eventId)
    .order("initiated_at", { ascending: true });

  if (error) {
    console.error("[outreach-responses] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 });
  }

  // Fetch the event and client details for distance calculation
  const { data: eventData } = await supabase
    .from("schedule_events")
    .select("client_id, clients(address)")
    .eq("id", eventId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  // Geocode client address once for distance calculations
  let clientCoords = null;
  if (eventData?.clients?.address) {
    const clientAddress = eventData.clients.address;
    if (clientAddress.street && clientAddress.city && clientAddress.state && clientAddress.zip) {
      clientCoords = await geocodeAddress(clientAddress);
    }
  }

  // Group attempts by caregiver to create a single response per person
  const byCaregiverId = new Map<string, any[]>();
  for (const row of data ?? []) {
    const cgId = row.caregiver_id;
    if (!byCaregiverId.has(cgId)) byCaregiverId.set(cgId, []);
    byCaregiverId.get(cgId)!.push(row);
  }

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

  const statusPriority: Record<string, number> = {
    accepted: 1,
    declined: 2,
    no_answer: 3,
    voicemail: 4,
    in_progress: 5,
    pending: 6,
    failed: 7,
  };

  const mapped: any[] = [];
  let colorIdx = 0;

  for (const [, attempts] of byCaregiverId) {
    const emp = attempts[0].employees;
    if (!emp) continue;

    const firstName = emp.first_name ?? "";
    const lastName = emp.last_name ?? "";
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    // Determine overall status (best status from all attempts)
    const sortedAttempts = [...attempts].sort(
      (a, b) => (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99)
    );
    const bestAttempt = sortedAttempts[0];

    // Determine contact method
    const channels = new Set(attempts.map((a: any) => a.channel));
    const contactMethod = channels.has("call") && channels.has("sms")
      ? "both"
      : channels.has("call")
        ? "call"
        : "text";

    // Map DB status to UI status
    const uiStatus: "accepted" | "declined" | "no-answer" =
      bestAttempt.status === "accepted"
        ? "accepted"
        : bestAttempt.status === "declined"
          ? "declined"
          : "no-answer";

    const respondedAt = bestAttempt.responded_at
      ? new Date(bestAttempt.responded_at)
      : null;
    const initiatedAt = new Date(bestAttempt.initiated_at);
    const responseTime = respondedAt
      ? `${Math.round((respondedAt.getTime() - initiatedAt.getTime()) / 60000)} min`
      : "—";

    // Calculate distance to client
    let distanceString = null;
    if (clientCoords && emp.address) {
      const empAddress = emp.address;
      if (empAddress.street && empAddress.city && empAddress.state && empAddress.zip) {
        const empCoords = await geocodeAddress(empAddress);
        if (empCoords) {
          const distanceMiles = haversineDistance(
            clientCoords.lat, clientCoords.lng,
            empCoords.lat, empCoords.lng
          );
          distanceString = formatDistance(distanceMiles);
        }
      }
    }

    mapped.push({
      id: emp.id,
      firstName,
      lastName,
      role: emp.role ?? "Caregiver",
      initials,
      avatarColor: avatarColors[colorIdx % avatarColors.length],
      status: uiStatus,
      matchScore: null,
      distance: distanceString,
      responseTime,
      availability: uiStatus === "accepted" ? "Available" : uiStatus === "declined" ? "Unavailable" : "Unknown",
      contactMethod,
      responseDetails: {
        timestamp: respondedAt
          ? respondedAt.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : initiatedAt.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
        duration: bestAttempt.call_duration_ms
          ? `${Math.floor(bestAttempt.call_duration_ms / 60000)}m ${Math.floor((bestAttempt.call_duration_ms % 60000) / 1000)}s`
          : undefined,
        message: bestAttempt.response_message ?? undefined,
        notes: bestAttempt.response_notes ?? undefined,
      },
    });

    colorIdx++;
  }

  // Sort: accepted first, then declined, then no-answer
  mapped.sort((a, b) => {
    const order = { accepted: 0, declined: 1, "no-answer": 2 };
    return (order[a.status as keyof typeof order] ?? 2) - (order[b.status as keyof typeof order] ?? 2);
  });

  return NextResponse.json({ data: mapped });
}
