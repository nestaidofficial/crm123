import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { ReorderTasksSchema } from "@/lib/validation/task.schema";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number, details?: unknown): NextResponse {
  return jsonResponse(
    status === 400 && details ? { error: message, details } : { error: message },
    status
  );
}

/**
 * POST /api/tasks/reorder
 * Batch update task sort_order and column_id after drag-drop
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = ReorderTasksSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const { updates } = parsed.data;

    // Verify all tasks belong to agency
    const taskIds = updates.map((u) => u.taskId);
    const { data: tasks, error: tasksError } = await supabase
      .from("kanban_tasks")
      .select("id")
      .in("id", taskIds)
      .eq("agency_id", agencyId);

    if (tasksError || !tasks || tasks.length !== taskIds.length) {
      return errorResponse("One or more tasks not found or access denied", 404);
    }

    // Verify all columns belong to agency
    const columnIds = Array.from(new Set(updates.map((u) => u.columnId)));
    const { data: columns, error: columnsError } = await supabase
      .from("kanban_columns")
      .select("id")
      .in("id", columnIds)
      .eq("agency_id", agencyId);

    if (columnsError || !columns || columns.length !== columnIds.length) {
      return errorResponse("One or more columns not found or access denied", 404);
    }

    // Update each task
    const updatePromises = updates.map((update) =>
      supabase
        .from("kanban_tasks")
        .update({
          column_id: update.columnId,
          sort_order: update.sortOrder,
        })
        .eq("id", update.taskId)
        .eq("agency_id", agencyId)
    );

    const results = await Promise.all(updatePromises);

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      return errorResponse("Failed to update some tasks", 500, errors.map((e) => e.error));
    }

    return jsonResponse({ success: true, updated: updates.length }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
