import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

interface GPSCaptureBody {
  visitId: string;
  captureType: "clock_in" | "clock_out";
  lat: number;
  lng: number;
  accuracy?: number | null;
  capturedAt: string;
  agencyId?: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { supabase, agencyId, userId } = auth;

  let body: GPSCaptureBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { visitId, captureType, lat, lng, accuracy, capturedAt } = body;

  if (!visitId || !captureType || lat == null || lng == null) {
    return NextResponse.json(
      { error: "visitId, captureType, lat, and lng are required." },
      { status: 400 }
    );
  }

  // Resolve actor employee id
  const { data: actorEmployee } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  const actorId = actorEmployee?.id ?? null;

  // Save GPS coordinates
  const { error: gpsError } = await supabase.from("evv_gps_captures").insert({
    visit_id: visitId,
    agency_id: agencyId,
    capture_type: captureType,
    latitude: lat,
    longitude: lng,
    accuracy_meters: accuracy ?? null,
    captured_at: capturedAt,
  });

  if (gpsError) {
    return NextResponse.json({ error: gpsError.message }, { status: 400 });
  }

  // Update visit: mark GPS verified and record the clock time
  const clockTimeField = captureType === "clock_in" ? "clock_in" : "clock_out";
  const { error: visitError } = await supabase
    .from("evv_visits")
    .update({
      gps_status: "verified",
      updated_at: capturedAt,
      [clockTimeField]: capturedAt,
    })
    .eq("id", visitId)
    .eq("agency_id", agencyId);

  if (visitError) {
    return NextResponse.json({ error: visitError.message }, { status: 400 });
  }

  // Write audit log
  const label =
    captureType === "clock_in" ? "Clocked in with GPS" : "Clocked out with GPS";
  const detail = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}${accuracy ? `, ±${Math.round(accuracy)}m` : ""}`;

  await supabase.from("evv_audit_log").insert({
    visit_id: visitId,
    agency_id: agencyId,
    event_type: captureType,
    label,
    detail,
    actor_id: actorId,
  });

  return NextResponse.json({ ok: true });
}
