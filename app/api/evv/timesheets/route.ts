import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { mapVisitToTimesheetEntry, type TimesheetEntry, type EVVVisitJoinedRow } from "@/lib/db/evv.mapper";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

interface TimesheetSummary {
  totalHours: number;
  totalPay: number;
  shiftCount: number;
  unpaidCount: number;
  paidCount: number;
}

/**
 * GET /api/evv/timesheets
 * Fetch approved timesheets with pay calculations
 * 
 * Query params:
 * - caregiverId: filter by specific caregiver
 * - q: search caregiver name
 * - startDate: ISO date (YYYY-MM-DD)
 * - endDate: ISO date (YYYY-MM-DD)
 * - paymentStatus: unpaid | paid | processing | all
 * - timesheetStatus: defaults to 'approved'
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caregiverId = searchParams.get("caregiverId");
    const q = searchParams.get("q")?.trim();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const paymentStatus = searchParams.get("paymentStatus") ?? "all";
    const timesheetStatus = searchParams.get("timesheetStatus") ?? "approved";

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    // Build query with joins — filtered by agency_id via RLS + explicit filter
    let query = supabase
      .from("evv_visits")
      .select(`
        *,
        employee:employees!fk_evv_visits_employee_agency(
          id,
          first_name,
          last_name,
          avatar_url,
          pay_rate,
          pay_type
        ),
        client:clients!fk_evv_visits_client_agency(
          id,
          first_name,
          last_name,
          avatar_url,
          address
        ),
        service_type:evv_service_types(name),
        funding_source:evv_funding_sources(name)
      `)
      .eq("agency_id", agencyId)
      .not("clock_in", "is", null)
      .not("clock_out", "is", null)
      .order("scheduled_start", { ascending: false });

    // Filter by timesheet status
    if (timesheetStatus !== "all") {
      query = query.eq("timesheet_status", timesheetStatus);
    }

    // Filter by payment status
    if (paymentStatus !== "all") {
      query = query.eq("payment_status", paymentStatus);
    }

    // Filter by caregiver ID
    if (caregiverId) {
      query = query.eq("employee_id", caregiverId);
    }

    // Filter by date range
    if (startDate) {
      query = query.gte("scheduled_start", `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      query = query.lte("scheduled_start", `${endDate}T23:59:59Z`);
    }

    // Search by caregiver name (if q provided and no specific caregiverId)
    if (q && !caregiverId) {
      // We'll filter in-memory after fetching since Supabase doesn't support filtering on joined columns easily
      // For now, fetch all and filter client-side
    }

    const { data: visitsData, error: visitsError } = await query;

    if (visitsError) {
      console.error("Failed to fetch timesheets:", visitsError);
      return errorResponse("Failed to fetch timesheets", 500);
    }

    // Fetch exceptions for these visits
    const visitIds = visitsData?.map((v) => v.id) ?? [];
    const { data: exceptionsData } = visitIds.length > 0
      ? await supabase.from("evv_exceptions").select("*").in("visit_id", visitIds)
      : { data: [] };

    // Map exceptions by visit_id
    const exceptionsByVisit = (exceptionsData ?? []).reduce((acc, ex) => {
      if (!acc[ex.visit_id]) acc[ex.visit_id] = [];
      acc[ex.visit_id].push(ex);
      return acc;
    }, {} as Record<string, typeof exceptionsData>);

    // Transform to TimesheetEntry[]
    let timesheetEntries: TimesheetEntry[] = [];
    
    for (const row of visitsData ?? []) {
      try {
        const joinedRow: EVVVisitJoinedRow = {
          ...row,
          employee_first_name: row.employee?.first_name ?? "",
          employee_last_name: row.employee?.last_name ?? "",
          employee_avatar_url: row.employee?.avatar_url ?? null,
          employee_pay_rate: row.employee?.pay_rate ?? 0,
          employee_pay_type: row.employee?.pay_type ?? "hourly",
          client_first_name: row.client?.first_name ?? "",
          client_last_name: row.client?.last_name ?? "",
          client_avatar_url: row.client?.avatar_url ?? null,
          client_address: row.client?.address ?? { street: "", city: "", state: "", zip: "" },
          service_type_name: row.service_type?.name ?? "",
          funding_source_name: row.funding_source?.name ?? "",
          exceptions: exceptionsByVisit[row.id] ?? [],
        };

        const entry = mapVisitToTimesheetEntry(joinedRow);
        timesheetEntries.push(entry);
      } catch (err) {
        console.error("Failed to map visit to timesheet entry:", err);
        // Skip visits that can't be mapped (e.g., missing clock times)
      }
    }

    // Filter by caregiver name search if provided
    if (q && timesheetEntries.length > 0) {
      const lowerQ = q.toLowerCase();
      timesheetEntries = timesheetEntries.filter((entry) =>
        entry.caregiver.name.toLowerCase().includes(lowerQ)
      );
    }

    // Calculate summary
    const summary: TimesheetSummary = {
      totalHours: timesheetEntries.reduce((sum, e) => sum + e.billableHours, 0),
      totalPay: timesheetEntries.reduce((sum, e) => sum + e.payAmount, 0),
      shiftCount: timesheetEntries.length,
      unpaidCount: timesheetEntries.filter((e) => e.paymentStatus === "unpaid").length,
      paidCount: timesheetEntries.filter((e) => e.paymentStatus === "paid").length,
    };

    // Round summary values
    summary.totalHours = parseFloat(summary.totalHours.toFixed(2));
    summary.totalPay = parseFloat(summary.totalPay.toFixed(2));

    return jsonResponse({ data: timesheetEntries, summary }, 200);
  } catch (e) {
    console.error("Unexpected error in GET /api/evv/timesheets:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/evv/timesheets
 * Update payment status for multiple visits
 * 
 * Body: { ids: string[], paymentStatus: 'paid' | 'unpaid' | 'processing' }
 */
export async function PATCH(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { ids, paymentStatus } = body as { ids?: string[]; paymentStatus?: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse("Invalid or missing 'ids' array", 400);
    }

    if (!paymentStatus || !["paid", "unpaid", "processing"].includes(paymentStatus)) {
      return errorResponse("Invalid 'paymentStatus'. Must be 'paid', 'unpaid', or 'processing'", 400);
    }

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { error } = await supabase
      .from("evv_visits")
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) {
      console.error("Failed to update payment status:", error);
      return errorResponse("Failed to update payment status", 500);
    }

    return jsonResponse({ success: true, updatedCount: ids.length }, 200);
  } catch (e) {
    console.error("Unexpected error in PATCH /api/evv/timesheets:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
