import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateKanbanTaskSchema } from "@/lib/validation/task.schema";
import {
  mapTaskRowToTask,
  mapEmployeeRowToEmployee,
  mapCreateTaskToRow,
  type KanbanTaskRow,
  type EmployeeRow,
  type KanbanTaskAssigneeRow,
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
 * GET /api/tasks
 * List all tasks for the agency with assignees and comment counts
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { searchParams } = new URL(request.url);
    const columnId = searchParams.get("columnId");

    // Fetch tasks
    let tasksQuery = supabase
      .from("kanban_tasks")
      .select("*")
      .eq("agency_id", agencyId)
      .order("sort_order", { ascending: true });

    if (columnId) {
      tasksQuery = tasksQuery.eq("column_id", columnId);
    }

    const { data: taskRows, error: tasksError } = await tasksQuery;

    if (tasksError) {
      return errorResponse(tasksError.message || "Failed to fetch tasks", 500);
    }

    if (!taskRows || taskRows.length === 0) {
      return jsonResponse({ data: [] }, 200);
    }

    const taskIds = taskRows.map((t) => t.id);

    // Fetch assignees for all tasks
    const { data: assigneeRows, error: assigneesError } = await supabase
      .from("kanban_task_assignees")
      .select("task_id, employee_id")
      .in("task_id", taskIds);

    if (assigneesError) {
      return errorResponse(assigneesError.message || "Failed to fetch assignees", 500);
    }

    // Get unique employee IDs
    const employeeIds = Array.from(
      new Set((assigneeRows || []).map((a: KanbanTaskAssigneeRow) => a.employee_id))
    );

    // Fetch employee details
    const { data: employeeRows, error: employeesError } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, avatar_url")
      .in("id", employeeIds);

    if (employeesError) {
      return errorResponse(employeesError.message || "Failed to fetch employees", 500);
    }

    // Build employee map
    const employeeMap = new Map(
      (employeeRows || []).map((e: EmployeeRow) => [e.id, mapEmployeeRowToEmployee(e)])
    );

    // Build assignee map (task_id -> Employee[])
    const assigneeMap = new Map<string, any[]>();
    (assigneeRows || []).forEach((a: KanbanTaskAssigneeRow) => {
      const employee = employeeMap.get(a.employee_id);
      if (employee) {
        if (!assigneeMap.has(a.task_id)) {
          assigneeMap.set(a.task_id, []);
        }
        assigneeMap.get(a.task_id)!.push(employee);
      }
    });

    // Fetch comment counts
    const { data: commentCounts, error: commentCountsError } = await supabase
      .from("kanban_task_comments")
      .select("task_id")
      .in("task_id", taskIds);

    if (commentCountsError) {
      return errorResponse(commentCountsError.message || "Failed to fetch comment counts", 500);
    }

    const commentCountMap = new Map<string, number>();
    (commentCounts || []).forEach((c: { task_id: string }) => {
      commentCountMap.set(c.task_id, (commentCountMap.get(c.task_id) || 0) + 1);
    });

    // Map tasks
    const tasks = taskRows.map((row: KanbanTaskRow) =>
      mapTaskRowToTask(
        row,
        assigneeMap.get(row.id) || [],
        commentCountMap.get(row.id) || 0
      )
    );

    return jsonResponse({ data: tasks }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/tasks
 * Create a new task
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

    const parsed = CreateKanbanTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    // Verify column belongs to agency
    const { data: column, error: columnError } = await supabase
      .from("kanban_columns")
      .select("id")
      .eq("id", input.columnId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (columnError || !column) {
      return errorResponse("Column not found or access denied", 404);
    }

    // Get current user's employee record
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    // Get max sort_order for the column
    const { data: maxOrderRow } = await supabase
      .from("kanban_tasks")
      .select("sort_order")
      .eq("column_id", input.columnId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = maxOrderRow ? maxOrderRow.sort_order + 1 : 0;

    const taskRow = {
      ...mapCreateTaskToRow(input, agencyId, employee?.id || null),
      sort_order: nextSortOrder,
    };

    // Insert task
    const { data: insertedTask, error: insertError } = await supabase
      .from("kanban_tasks")
      .insert(taskRow)
      .select()
      .single();

    if (insertError) {
      return errorResponse(insertError.message || "Failed to create task", 500);
    }

    // Insert assignees
    if (input.assigneeIds.length > 0) {
      const assigneeRows = input.assigneeIds.map((empId) => ({
        task_id: (insertedTask as KanbanTaskRow).id,
        employee_id: empId,
      }));

      const { error: assigneesError } = await supabase
        .from("kanban_task_assignees")
        .insert(assigneeRows);

      if (assigneesError) {
        // Task created but assignees failed - still return success
        console.error("Failed to insert assignees:", assigneesError);
      }
    }

    // Fetch assignees for response
    const { data: assigneeRows } = await supabase
      .from("kanban_task_assignees")
      .select("employee_id")
      .eq("task_id", (insertedTask as KanbanTaskRow).id);

    const employeeIds = (assigneeRows || []).map((a: { employee_id: string }) => a.employee_id);

    const { data: employeeRows } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, avatar_url")
      .in("id", employeeIds);

    const assignees = (employeeRows || []).map((e: EmployeeRow) => mapEmployeeRowToEmployee(e));

    const task = mapTaskRowToTask(insertedTask as KanbanTaskRow, assignees, 0);

    return jsonResponse({ data: task }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
