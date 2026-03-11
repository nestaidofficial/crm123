import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

/**
 * GET /api/dashboard/visit-stats
 * Returns visit completion statistics for charts:
 * - This week completion rate
 * - This month completion rate
 * - Weekly breakdown for chart
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const today = new Date();
    
    // Calculate date ranges
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);

    // Fetch this week's visits
    const [thisWeekResult, thisMonthResult, lastWeekResult, lastMonthResult] = await Promise.all([
      // This week
      supabase
        .from("schedule_events")
        .select("id, status")
        .eq("agency_id", agencyId)
        .gte("start_at", weekStart.toISOString())
        .lt("start_at", weekEnd.toISOString()),

      // This month
      supabase
        .from("schedule_events")
        .select("id, status")
        .eq("agency_id", agencyId)
        .gte("start_at", monthStart.toISOString())
        .lt("start_at", monthEnd.toISOString()),

      // Last week
      supabase
        .from("schedule_events")
        .select("id, status")
        .eq("agency_id", agencyId)
        .gte("start_at", lastWeekStart.toISOString())
        .lt("start_at", weekStart.toISOString()),

      // Last month
      supabase
        .from("schedule_events")
        .select("id, status")
        .eq("agency_id", agencyId)
        .gte("start_at", lastMonthStart.toISOString())
        .lt("start_at", lastMonthEnd.toISOString()),
    ]);

    // Calculate completion rates
    const calculateRate = (visits: Array<{ status: string }>) => {
      if (visits.length === 0) return 0;
      const completed = visits.filter((v) => v.status === "completed").length;
      return (completed / visits.length) * 100;
    };

    const thisWeekVisits = thisWeekResult.data ?? [];
    const thisMonthVisits = thisMonthResult.data ?? [];
    const lastWeekVisits = lastWeekResult.data ?? [];
    const lastMonthVisits = lastMonthResult.data ?? [];

    const thisWeekRate = calculateRate(thisWeekVisits);
    const thisMonthRate = calculateRate(thisMonthVisits);
    const lastWeekRate = calculateRate(lastWeekVisits);
    const lastMonthRate = calculateRate(lastMonthVisits);

    const weekChange = lastWeekRate > 0 ? thisWeekRate - lastWeekRate : 0;
    const monthChange = lastMonthRate > 0 ? thisMonthRate - lastMonthRate : 0;

    // Weekly breakdown for chart (last 7 days)
    const weeklyBreakdown = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const { data: dayVisits } = await supabase
        .from("schedule_events")
        .select("id, status")
        .eq("agency_id", agencyId)
        .gte("start_at", dayStart.toISOString())
        .lt("start_at", dayEnd.toISOString());

      const visits = dayVisits ?? [];
      const rate = calculateRate(visits);
      
      weeklyBreakdown.push({
        date: dayStart.toISOString().split("T")[0],
        day: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        scheduled: visits.length,
        completed: visits.filter((v) => v.status === "completed").length,
        rate: rate.toFixed(1),
      });
    }

    const stats = {
      thisWeek: {
        rate: thisWeekRate.toFixed(1),
        change: weekChange.toFixed(1),
        scheduled: thisWeekVisits.length,
        completed: thisWeekVisits.filter((v) => v.status === "completed").length,
      },
      thisMonth: {
        rate: thisMonthRate.toFixed(1),
        change: monthChange.toFixed(1),
        scheduled: thisMonthVisits.length,
        completed: thisMonthVisits.filter((v) => v.status === "completed").length,
      },
      weeklyBreakdown,
    };

    return jsonResponse({ data: stats }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
