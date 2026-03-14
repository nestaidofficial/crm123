import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

/**
 * GET /api/coordinator/vacant-shifts
 *
 * Returns schedule_events that are vacant (open/unassigned or cancelled)
 * and have a future start_at. Joined with clients for names.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { supabase, agencyId } = auth;

  const { data, error } = await supabase
    .from("schedule_events")
    .select("*, clients(id, first_name, last_name, address)")
    .eq("agency_id", agencyId)
    .gt("start_at", new Date().toISOString())
    .or("caregiver_id.is.null,status.eq.cancelled")
    .order("start_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[vacant-shifts] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch vacant shifts" }, { status: 500 });
  }

  // Fetch agency timezone
  const { data: coordConfig } = await supabase
    .from("coordinator_config")
    .select("agency_timezone")
    .eq("agency_id", agencyId)
    .maybeSingle();

  const agencyTimezone = coordConfig?.agency_timezone ?? "America/New_York";
  const now = Date.now();

  const mapped = (data ?? []).map((row: any) => {
    const startAt = new Date(row.start_at);
    const endAt = new Date(row.end_at);
    const hoursUntil = (startAt.getTime() - now) / (1000 * 60 * 60);

    const urgency: "urgent" | "high" | "normal" =
      hoursUntil < 24 ? "urgent" : hoursUntil < 72 ? "high" : "normal";

    const clientName = row.clients
      ? `${row.clients.first_name ?? ""} ${row.clients.last_name ?? ""}`.trim()
      : row.title ?? "Unknown Client";

    const clientCity = row.clients?.address?.city ?? null;

    const dateStr = startAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: agencyTimezone,
    });
    const timeStr = `${startAt.toLocaleTimeString("en-US", {
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
      other: "Other",
    };

    return {
      id: row.id,
      clientName,
      clientId: row.client_id,
      clientCity,
      date: dateStr,
      time: timeStr,
      fullDateTime: `${dateStr} • ${timeStr}`,
      startAt: row.start_at,
      endAt: row.end_at,
      careType: careTypeLabels[row.care_type] ?? row.care_type ?? null,
      urgency,
      requiredRole: null,
      payRate: row.pay_rate ? `$${Number(row.pay_rate).toFixed(0)}/hr` : null,
      clientAddress: null,
      specialInstructions: row.instructions ?? null,
    };
  });

  return NextResponse.json({ data: mapped });
}
