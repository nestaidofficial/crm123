import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { triggerAutoCoverage } from "@/lib/auto-scheduler/trigger";
import { findUncoveredVacantShifts } from "@/lib/auto-scheduler/scan";

/**
 * GET /api/cron/auto-coverage-scan
 *
 * Vercel cron running every 2 minutes.
 * Finds vacant future shifts for agencies with auto_scheduler_enabled,
 * excludes shifts already covered by an active auto_coverage_session,
 * and triggers auto-coverage outreach for each.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  // 1. Find agencies with auto_scheduler_enabled
  const { data: agencies, error: agencyError } = await supabase
    .from("coordinator_config")
    .select("agency_id")
    .eq("auto_scheduler_enabled", true);

  if (agencyError) {
    console.error("[auto-coverage-scan] Agency query error:", agencyError);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!agencies || agencies.length === 0) {
    return NextResponse.json({ triggered: 0 });
  }

  const agencyIds = agencies.map((a) => a.agency_id);

  // 2. Find uncovered vacant shifts across all enabled agencies
  const uncoveredShifts = await findUncoveredVacantShifts(supabase, agencyIds);

  if (uncoveredShifts.length === 0) {
    return NextResponse.json({ triggered: 0 });
  }

  // 3. Trigger auto-coverage for each uncovered shift (fire-and-forget)
  let triggered = 0;
  for (const shift of uncoveredShifts) {
    triggerAutoCoverage({
      agencyId: shift.agency_id,
      eventId: shift.id,
      supabase,
    }).catch((err) =>
      console.error(`[auto-coverage-scan] Trigger failed for event ${shift.id}:`, err)
    );
    triggered++;
  }

  console.log(`[auto-coverage-scan] Triggered ${triggered} auto-coverage sessions`);
  return NextResponse.json({ triggered });
}
