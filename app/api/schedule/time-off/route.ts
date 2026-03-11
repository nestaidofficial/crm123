import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateTimeOffSchema } from "@/lib/validation/schedule.schema";
import {
  mapCreateTimeOffToRow,
  mapRowToTimeOff,
  type TimeOffRow,
} from "@/lib/db/schedule.mapper";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  return jsonResponse(
    status === 400 && details
      ? { error: message, details }
      : { error: message },
    status
  );
}

/**
 * GET /api/schedule/time-off
 * List time-off blocks with optional filters:
 * - employeeId: filter by employee
 * - status: filter by approval status
 * - startDate, endDate: filter by date range
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
    
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate"); // YYYY-MM-DD
    const endDate = searchParams.get("endDate"); // YYYY-MM-DD

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    let query = supabase
      .from("schedule_time_off")
      .select("*", { count: "exact" })
      .eq("agency_id", agencyId)
      .order("start_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (startDate) {
      query = query.gte("start_at", `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      query = query.lte("end_at", `${endDate}T23:59:59Z`);
    }

    const { data: rows, error, count } = await query;

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to list time-off blocks";
      return errorResponse(message, 500);
    }

    const timeOffs = (rows ?? []).map((row) => mapRowToTimeOff(row as TimeOffRow));
    return jsonResponse({ data: timeOffs, count: count ?? 0 }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/schedule/time-off
 * Create a new time-off block
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreateTimeOffSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const row = { ...mapCreateTimeOffToRow(input), agency_id: agencyId };
    const { data: inserted, error } = await supabase
      .from("schedule_time_off")
      .insert(row)
      .select()
      .single();

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to create time-off block";
      return errorResponse(message, 500);
    }

    const timeOff = mapRowToTimeOff(inserted as TimeOffRow);
    return jsonResponse({ data: timeOff }, 201);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
