import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { triggerAutoCoverage } from "@/lib/auto-scheduler/trigger";

/**
 * POST /api/coordinator/trigger-coverage
 *
 * Kicks off the auto-scheduler pipeline for a single vacant shift.
 * Only runs if auto_scheduler_enabled is true for the agency.
 *
 * Body: { eventId: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { agencyId } = auth;

  let body: { eventId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId } = body;
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  // Use service client so trigger can write to protected tables
  const serviceSupabase = createServerSupabaseServiceClient();
  if (!serviceSupabase) {
    return NextResponse.json({ error: "Service client unavailable" }, { status: 500 });
  }

  // Verify auto_scheduler_enabled for this agency
  const { data: config } = await serviceSupabase
    .from("coordinator_config")
    .select("auto_scheduler_enabled")
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (!config?.auto_scheduler_enabled) {
    return NextResponse.json({ data: { skipped: true, reason: "auto_scheduler_disabled" } });
  }

  // Fire-and-forget: triggerAutoCoverage handles its own session dedup guard
  triggerAutoCoverage({ agencyId, eventId, supabase: serviceSupabase }).catch((err) => {
    console.error("[trigger-coverage] Error:", err);
  });

  return NextResponse.json({ data: { triggered: true, eventId } });
}
