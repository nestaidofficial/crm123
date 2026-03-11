import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateKanbanTaskSchema } from "@/lib/validation/task.schema";
import {
  mapTaskRowToTask,
  mapEmployeeRowToEmployee,
  mapUpdateTaskToRow,
  type KanbanTaskRow,
  type EmployeeRow,
} from "@/lib/db/task.mapper";

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
 * PATCH /api/tasks/[id]
 * Update a task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const taskId = params.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = UpdateKanbanTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    // Verify task exists and belongs to agency
    const { data: existingTask, error: fetchError } = await supabase
      .from("kanban_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (fetchError || !existingTask) {
      return errorResponse("Task not found or access denied", 404);
    }

    // If column is changing, verify new column belongs to agency
    if (input.columnId && input.columnId !== existingTask.column_id) {
      const { data: column, error: columnError } = await supabase
        .from("kanban_columns")
        .select("id")
        .eq("id", input.columnId)
        .eq("agency_id", agencyId)
        .maybeSingle();

      if (columnError || !column) {
        return errorResponse("Column not found or access denied", 404);
      }
    }

    const updateRow = mapUpdateTaskToRow(input);

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from("kanban_tasks")
      .update(updateRow)
      .eq("id", taskId)
      .eq("agency_id", agencyId)
      .select()
      .single();

    if (updateError) {
      return errorResponse(updateError.message || "Failed to update task", 500);
    }

    // Fetch assignees
    const { data: assigneeRows } = await supabase
      .from("kanban_task_assignees")
      .select("employee_id")
      .eq("task_id", taskId);

    const employeeIds = (assigneeRows || []).map((a: { employee_id: string }) => a.employee_id);

    const { data: employeeRows } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, avatar_url")
      .in("id", employeeIds);

    const assignees = (employeeRows || []).map((e: EmployeeRow) => mapEmployeeRowToEmployee(e));

    const task = mapTaskRowToTask(updatedTask as KanbanTaskRow, assignees, 0);

    return jsonResponse({ data: task }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const taskId = params.id;

    // Verify task exists and belongs to agency
    const { data: existingTask, error: fetchError } = await supabase
      .from("kanban_tasks")
      .select("id")
      .eq("id", taskId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (fetchError || !existingTask) {
      return errorResponse("Task not found or access denied", 404);
    }

    // Delete task (cascade will handle assignees, comments, etc.)
    const { error: deleteError } = await supabase
      .from("kanban_tasks")
      .delete()
      .eq("id", taskId)
      .eq("agency_id", agencyId);

    if (deleteError) {
      return errorResponse(deleteError.message || "Failed to delete task", 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
