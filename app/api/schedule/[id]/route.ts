import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateScheduleEventSchema, DragUpdateSchema } from "@/lib/validation/schedule.schema";
import {
  mapUpdateEventToRow,
  mapRowToEvent,
  type ScheduleEventRow,
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
 * GET /api/schedule/[id]
 * Get a single schedule event by ID
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
      .from("schedule_events")
      .select("*")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Schedule event not found", 404);
      }
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to fetch schedule event";
      return errorResponse(message, 500);
    }

    const event = mapRowToEvent(row as ScheduleEventRow);
    return jsonResponse({ data: event }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/schedule/[id]
 * Update a schedule event
 * Supports both full updates and drag-drop time changes
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

    // Try drag update schema first (lightweight for drag-and-drop)
    const dragParsed = DragUpdateSchema.safeParse(body);
    const isDragUpdate = dragParsed.success;

    // Use appropriate schema
    const parsed = isDragUpdate
      ? dragParsed
      : UpdateScheduleEventSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    // Fetch existing event for audit trail
    const { data: existingRow, error: fetchError } = await supabase
      .from("schedule_events")
      .select("*")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return errorResponse("Schedule event not found", 404);
      }
      return errorResponse("Failed to fetch existing event", 500);
    }

    const existing = existingRow as ScheduleEventRow;
    const updateRow = mapUpdateEventToRow(input as any);

    // Update the event
    const { data: updated, error: updateError } = await supabase
      .from("schedule_events")
      .update(updateRow)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select()
      .single();

    if (updateError) {
      const message =
        typeof updateError.message === "string"
          ? updateError.message
          : "Failed to update schedule event";
      return errorResponse(message, 500);
    }

    // Audit logging
    if (isDragUpdate) {
      // Log drag-and-drop time change specifically
      await supabase.from("schedule_audit_log").insert({
        event_id: id,
        agency_id: agencyId,
        action: "time_changed",
        field_changed: "start_at,end_at",
        old_value: JSON.stringify({
          start_at: existing.start_at,
          end_at: existing.end_at,
        }),
        new_value: JSON.stringify({
          start_at: updateRow.start_at,
          end_at: updateRow.end_at,
        }),
        actor_id: null,
      });
    } else {
      // Log general update
      const changedFields: string[] = [];
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};

      Object.keys(updateRow).forEach((key) => {
        const oldVal = (existing as unknown as Record<string, unknown>)[key];
        const newVal = (updateRow as unknown as Record<string, unknown>)[key];
        if (oldVal !== newVal) {
          changedFields.push(key);
          oldValues[key] = oldVal;
          newValues[key] = newVal;
        }
      });

      if (changedFields.length > 0) {
        let action = "updated";
        if (changedFields.includes("caregiver_id")) action = "reassigned";
        if (changedFields.includes("status")) action = "status_changed";
        if (changedFields.includes("status") && (input as any).status === "cancelled") action = "cancelled";

        await supabase.from("schedule_audit_log").insert({
          event_id: id,
          agency_id: agencyId,
          action,
          field_changed: changedFields.join(","),
          old_value: JSON.stringify(oldValues),
          new_value: JSON.stringify(newValues),
          actor_id: null,
        });
      }
    }

    const event = mapRowToEvent(updated as ScheduleEventRow);
    return jsonResponse({ data: event }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/schedule/[id]
 * Delete a schedule event
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

    // Log deletion before deleting
    await supabase.from("schedule_audit_log").insert({
      event_id: id,
      agency_id: agencyId,
      action: "deleted",
      field_changed: null,
      old_value: null,
      new_value: null,
      actor_id: null,
    });

    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to delete schedule event";
      return errorResponse(message, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
