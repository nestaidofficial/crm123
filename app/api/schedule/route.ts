import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateScheduleEventSchema } from "@/lib/validation/schedule.schema";
import {
  mapCreateEventToRow,
  mapRowToEvent,
  type ScheduleEventRow,
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
 * GET /api/schedule
 * List schedule events with optional filters:
 * - startDate, endDate: filter by date range (YYYY-MM-DD)
 * - caregiverId, clientId: filter by employee or client
 * - status: filter by event status
 * - isOpenShift: filter for open shifts
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const caregiverId = searchParams.get("caregiverId");
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const isOpenShift = searchParams.get("isOpenShift");

    const needCount = searchParams.get("count") === "true";
    let query = supabase
      .from("schedule_events")
      .select("*", { count: needCount ? "exact" : undefined })
      .eq("agency_id", agencyId)
      .order("start_at", { ascending: true })
      .range(offset, offset + limit - 1);

    // Date range filter
    if (startDate) {
      query = query.gte("start_at", `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      query = query.lte("start_at", `${endDate}T23:59:59Z`);
    }

    // Entity filters
    if (caregiverId) {
      query = query.eq("caregiver_id", caregiverId);
    }
    if (clientId) {
      query = query.eq("client_id", clientId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (isOpenShift === "true") {
      query = query.eq("is_open_shift", true);
    }

    const { data: rows, error, count } = await query;

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to list schedule events";
      return errorResponse(message, 500);
    }

    const events = (rows ?? []).map((row) => mapRowToEvent(row as ScheduleEventRow));
    return jsonResponse({ data: events, count: count ?? 0 }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/schedule
 * Create a new schedule event
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId, userId } = auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreateScheduleEventSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const row = { ...mapCreateEventToRow(input), agency_id: agencyId };

    const { data: inserted, error } = await supabase
      .from("schedule_events")
      .insert(row)
      .select()
      .single();

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to create schedule event";
      return errorResponse(message, 500);
    }

    // Resolve actor_id from auth user
    const { data: actorEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    // Log creation to audit log
    await supabase.from("schedule_audit_log").insert({
      event_id: (inserted as ScheduleEventRow).id,
      agency_id: agencyId,
      action: "created",
      field_changed: null,
      old_value: null,
      new_value: JSON.stringify(row),
      actor_id: actorEmployee?.id ?? null,
    });

    const event = mapRowToEvent(inserted as ScheduleEventRow);
    return jsonResponse({ data: event }, 201);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
