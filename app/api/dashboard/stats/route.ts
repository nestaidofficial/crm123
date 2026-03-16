import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

/**
 * GET /api/dashboard/stats
 * Returns real-time dashboard statistics:
 * - Total clients (active)
 * - Active caregivers
 * - Scheduled visits today
 * - Pending tasks
 * - Revenue this month (from billing_invoices)
 * - Compliance status (percentage of employees with complete verifications)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    // Get today's date range
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get this month's date range
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Parallel queries for all stats
    const [
      clientsResult,
      newClientsThisMonthResult,
      caregiversResult,
      todayVisitsResult,
      openShiftsResult,
      completedEventsThisMonthResult,
      pendingTasksResult,
      monthRevenueResult,
      employeesResult,
      verificationsResult,
    ] = await Promise.all([
      // Total active clients
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("is_archived", false)
        .eq("status", "active"),

      // New clients created this month
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("is_archived", false)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString()),

      // Active caregivers (caregiver roles only)
      supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("is_archived", false)
        .eq("status", "active")
        .in("role", ["caregiver", "cna", "hha", "lpn", "rn"]),

      // Scheduled visits today
      supabase
        .from("schedule_events")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .gte("start_at", todayStart.toISOString())
        .lt("start_at", todayEnd.toISOString())
        .in("status", ["scheduled", "confirmed", "in_progress"]),

      // Open shifts (unassigned shifts not yet cancelled/completed)
      supabase
        .from("schedule_events")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("is_open_shift", true)
        .not("status", "in", '("cancelled","completed","no_show")'),

      // Completed events this month — for care hours calculation
      supabase
        .from("schedule_events")
        .select("start_at, end_at")
        .eq("agency_id", agencyId)
        .eq("status", "completed")
        .gte("start_at", monthStart.toISOString())
        .lt("start_at", monthEnd.toISOString()),

      // Pending tasks (from schedule_event_tasks)
      supabase
        .from("schedule_event_tasks")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("is_completed", false),

      // Revenue this month (sum of invoice amounts)
      supabase
        .from("billing_invoices")
        .select("total_amount")
        .eq("agency_id", agencyId)
        .gte("invoice_date", monthStart.toISOString())
        .lt("invoice_date", monthEnd.toISOString())
        .in("status", ["draft", "sent", "paid"]),

      // All employees for compliance calculation
      supabase
        .from("employees")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("is_archived", false)
        .eq("status", "active"),

      // All verifications for compliance calculation
      supabase
        .from("employee_verifications")
        .select("employee_id, status")
        .eq("agency_id", agencyId),
    ]);

    // Calculate stats
    const totalClients = clientsResult.count ?? 0;
    const newClientsThisMonth = newClientsThisMonthResult.count ?? 0;
    const activeCaregivers = caregiversResult.count ?? 0;
    const scheduledVisitsToday = todayVisitsResult.count ?? 0;
    const openShifts = openShiftsResult.count ?? 0;
    const pendingTasks = pendingTasksResult.count ?? 0;

    // Calculate care hours delivered this month (sum of completed event durations)
    const completedEvents = completedEventsThisMonthResult.data ?? [];
    const careHoursThisMonth = completedEvents.reduce((sum, evt) => {
      const start = new Date(evt.start_at).getTime();
      const end = new Date(evt.end_at).getTime();
      return sum + Math.max(0, (end - start) / (1000 * 60 * 60));
    }, 0);

    // Calculate revenue
    const invoices = monthRevenueResult.data ?? [];
    const monthRevenue = invoices.reduce(
      (sum, inv) => sum + (parseFloat(inv.total_amount?.toString() ?? "0") || 0),
      0
    );

    // Calculate compliance status
    const employees = employeesResult.data ?? [];
    const verifications = verificationsResult.data ?? [];
    
    let compliantCount = 0;
    if (employees.length > 0) {
      const verificationsByEmployee = new Map<string, Array<{ status: string }>>();
      verifications.forEach((v) => {
        if (!verificationsByEmployee.has(v.employee_id)) {
          verificationsByEmployee.set(v.employee_id, []);
        }
        verificationsByEmployee.get(v.employee_id)!.push({ status: v.status });
      });

      employees.forEach((emp) => {
        const empVerifications = verificationsByEmployee.get(emp.id) ?? [];
        const allComplete = empVerifications.length > 0 && 
          empVerifications.every((v) => v.status === "complete");
        if (allComplete) compliantCount++;
      });
    }

    const compliancePercentage = employees.length > 0 
      ? (compliantCount / employees.length) * 100 
      : 100;

    // Get previous period stats for comparison
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);

    const [lastMonthClientsResult, lastMonthRevenueResult] = await Promise.all([
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("is_archived", false)
        .eq("status", "active")
        .lt("created_at", lastMonthEnd.toISOString()),

      supabase
        .from("billing_invoices")
        .select("total_amount")
        .eq("agency_id", agencyId)
        .gte("invoice_date", lastMonthStart.toISOString())
        .lt("invoice_date", lastMonthEnd.toISOString())
        .in("status", ["draft", "sent", "paid"]),
    ]);

    const lastMonthClients = lastMonthClientsResult.count ?? 0;
    const lastMonthInvoices = lastMonthRevenueResult.data ?? [];
    const lastMonthRevenue = lastMonthInvoices.reduce(
      (sum, inv) => sum + (parseFloat(inv.total_amount?.toString() ?? "0") || 0),
      0
    );

    // Calculate changes
    const clientsChange = lastMonthClients > 0 
      ? ((totalClients - lastMonthClients) / lastMonthClients) * 100 
      : 0;
    const revenueChange = lastMonthRevenue > 0 
      ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    const stats = {
      totalClients: {
        value: totalClients,
        change: clientsChange,
        changeLabel: `${clientsChange >= 0 ? "+" : ""}${clientsChange.toFixed(1)}% from last month`,
      },
      newClientsThisMonth: {
        value: newClientsThisMonth,
        change: 0,
        changeLabel: `${newClientsThisMonth} added this month`,
      },
      activeCaregivers: {
        value: activeCaregivers,
        change: 0,
        changeLabel: `${activeCaregivers} active`,
      },
      scheduledVisitsToday: {
        value: scheduledVisitsToday,
        change: 0,
        changeLabel: `${scheduledVisitsToday} scheduled today`,
      },
      openShifts: {
        value: openShifts,
        change: 0,
        changeLabel: openShifts === 0 ? "All shifts filled" : `${openShifts} need coverage`,
      },
      careHoursThisMonth: {
        value: Math.round(careHoursThisMonth),
        change: 0,
        changeLabel: `${Math.round(careHoursThisMonth)}h delivered this month`,
      },
      pendingTasks: {
        value: pendingTasks,
        change: 0,
        changeLabel: `${pendingTasks} pending`,
      },
      monthRevenue: {
        value: monthRevenue,
        change: revenueChange,
        changeLabel: `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% from last month`,
      },
      complianceStatus: {
        value: compliancePercentage,
        change: 0,
        changeLabel: compliancePercentage >= 95 ? "All systems compliant" : "Action required",
      },
    };

    return jsonResponse({ data: stats }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
