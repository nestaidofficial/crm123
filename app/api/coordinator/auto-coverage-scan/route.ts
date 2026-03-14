import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { triggerAutoCoverage } from "@/lib/auto-scheduler/trigger";
import { findUncoveredVacantShifts } from "@/lib/auto-scheduler/scan";

/**
 * POST /api/coordinator/auto-coverage-scan
 *
 * Client-side periodic scan for auto-scheduler.
 * Finds vacant shifts for the current agency and triggers auto-coverage.
 * Only runs if auto_scheduler_enabled is true for the agency.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { agencyId } = auth;

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

  // Find uncovered vacant shifts for this agency
  const uncoveredShifts = await findUncoveredVacantShifts(serviceSupabase, [agencyId]);

  if (uncoveredShifts.length === 0) {
    return NextResponse.json({ data: { triggered: 0 } });
  }

  // Trigger auto-coverage for each uncovered shift (fire-and-forget)
  let triggered = 0;
  for (const shift of uncoveredShifts) {
    triggerAutoCoverage({
      agencyId: shift.agency_id,
      eventId: shift.id,
      supabase: serviceSupabase,
    }).catch((err) =>
      console.error(`[auto-coverage-scan] Trigger failed for event ${shift.id}:`, err)
    );
    triggered++;
  }

  console.log(`[auto-coverage-scan] Agency ${agencyId}: triggered ${triggered} auto-coverage sessions`);
  return NextResponse.json({ data: { triggered } });
}