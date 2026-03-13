import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

/**
 * GET /api/coordinator-requests
 *
 * Lists coordinator requests (coverage_requests with request_type set)
 * for the authenticated user's agency.
 *
 * Query params:
 *   status — "pending" | "approved" | "rejected" | "all" (default "all")
 *   limit  — number (default 50)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { supabase, agencyId } = auth;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

  let query = supabase
    .from("coverage_requests")
    .select("*, employees!caregiver_id(short_id)")
    .eq("agency_id", agencyId)
    .not("request_type", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[coordinator-requests] GET error:", JSON.stringify(error));
    return NextResponse.json({ error: "Failed to fetch requests", details: error.message, code: error.code }, { status: 500 });
  }

  const mapped = (data ?? []).map((r: any) => ({
    id: r.id,
    requestType: r.request_type,
    caregiverName: r.caregiver_name ?? null,
    caregiverId: r.caregiver_id ?? null,
    caregiverShortId: r.employees?.short_id ?? null,
    clientName: r.client_name ?? null,
    eventId: r.event_id ?? null,
    shiftDate: r.shift_date ?? null,
    shiftTime: r.shift_time ?? null,
    reason: r.reason ?? null,
    status: r.status,
    actionPayload: r.action_payload ?? {},
    reviewedBy: r.reviewed_by ?? null,
    reviewedAt: r.reviewed_at ?? null,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ data: mapped });
}
