import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateTimeOffSchema } from "@/lib/validation/schedule.schema";
import {
  mapUpdateTimeOffToRow,
  mapRowToTimeOff,
  type TimeOffRow,
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
 * GET /api/schedule/time-off/[id]
 * Get a single time-off block by ID
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
    const { data: row, error } = await supabase
      .from("schedule_time_off")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Time-off block not found", 404);
      }
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to fetch time-off block";
      return errorResponse(message, 500);
    }

    const timeOff = mapRowToTimeOff(row as TimeOffRow);
    return jsonResponse({ data: timeOff }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/schedule/time-off/[id]
 * Update a time-off block
 */
export async function PATCH(
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

    const parsed = UpdateTimeOffSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const updateRow = mapUpdateTimeOffToRow(input);

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: updated, error } = await supabase
      .from("schedule_time_off")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Time-off block not found", 404);
      }
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to update time-off block";
      return errorResponse(message, 500);
    }

    const timeOff = mapRowToTimeOff(updated as TimeOffRow);
    return jsonResponse({ data: timeOff }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/schedule/time-off/[id]
 * Delete a time-off block
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
      .from("schedule_time_off")
      .delete()
      .eq("id", id);

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to delete time-off block";
      return errorResponse(message, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
