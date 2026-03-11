import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import {
  CreateScheduleEventTaskSchema,
  UpdateScheduleEventTaskSchema,
} from "@/lib/validation/schedule.schema";
import {
  mapCreateTaskToRow,
  mapRowToTask,
  type ScheduleEventTaskRow,
} from "@/lib/db/schedule.mapper";

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
 * GET /api/schedule/[id]/tasks
 * List tasks for a schedule event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: rows, error } = await supabase
      .from("schedule_event_tasks")
      .select("*")
      .eq("event_id", id)
      .eq("agency_id", agencyId)
      .order("sort_order", { ascending: true });

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to fetch tasks";
      return errorResponse(message, 500);
    }

    const tasks = (rows ?? []).map((row) => mapRowToTask(row as ScheduleEventTaskRow));
    return jsonResponse({ data: tasks }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/schedule/[id]/tasks
 * Delete all tasks for a schedule event (used for bulk replace on save)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { error } = await supabase
      .from("schedule_event_tasks")
      .delete()
      .eq("event_id", id)
      .eq("agency_id", agencyId);

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to delete tasks";
      return errorResponse(message, 500);
    }

    return jsonResponse({ data: null }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/schedule/[id]/tasks
 * Create a new task for a schedule event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    // Inject eventId from route params
    const bodyWithEventId = { ...body as object, eventId: id };

    const parsed = CreateScheduleEventTaskSchema.safeParse(bodyWithEventId);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const row = { ...mapCreateTaskToRow(input), agency_id: agencyId };
    const { data: inserted, error } = await supabase
      .from("schedule_event_tasks")
      .insert(row)
      .select()
      .single();

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to create task";
      return errorResponse(message, 500);
    }

    const task = mapRowToTask(inserted as ScheduleEventTaskRow);
    return jsonResponse({ data: task }, 201);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
