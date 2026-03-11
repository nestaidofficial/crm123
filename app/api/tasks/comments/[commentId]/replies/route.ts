import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateReplySchema } from "@/lib/validation/task.schema";
import {
  mapReplyRowToReply,
  mapEmployeeRowToEmployee,
  mapCreateReplyToRow,
  type KanbanCommentReplyRow,
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
 * POST /api/tasks/comments/[commentId]/replies
 * Add a reply to a comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId, userId } = auth;

    const commentId = params.commentId;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreateReplySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    // Verify comment exists and belongs to agency
    const { data: comment, error: commentError } = await supabase
      .from("kanban_task_comments")
      .select("id, task_id")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError || !comment) {
      return errorResponse("Comment not found", 404);
    }

    const { data: task } = await supabase
      .from("kanban_tasks")
      .select("id")
      .eq("id", comment.task_id)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (!task) {
      return errorResponse("Access denied", 403);
    }

    // Get current user's employee record
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (employeeError || !employee) {
      return errorResponse("Employee record not found", 404);
    }

    const replyRow = mapCreateReplyToRow({ commentId, content: input.content }, employee.id);

    // Insert reply
    const { data: insertedReply, error: insertError } = await supabase
      .from("kanban_comment_replies")
      .insert(replyRow)
      .select()
      .single();

    if (insertError) {
      return errorResponse(insertError.message || "Failed to create reply", 500);
    }

    // Fetch author details
    const { data: authorRow } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, avatar_url")
      .eq("id", employee.id)
      .single();

    const author = mapEmployeeRowToEmployee(authorRow as EmployeeRow);
    const reply = mapReplyRowToReply(insertedReply as KanbanCommentReplyRow, author, []);

    return jsonResponse({ data: reply }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
