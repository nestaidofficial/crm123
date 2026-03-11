import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateCommentSchema } from "@/lib/validation/task.schema";
import {
  mapCommentRowToComment,
  mapReplyRowToReply,
  mapEmployeeRowToEmployee,
  mapCreateCommentToRow,
  type KanbanTaskCommentRow,
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
 * GET /api/tasks/[id]/comments
 * List all comments for a task with replies and likes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const taskId = params.id;

    // Verify task exists and belongs to agency
    const { data: task, error: taskError } = await supabase
      .from("kanban_tasks")
      .select("id")
      .eq("id", taskId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (taskError || !task) {
      return errorResponse("Task not found or access denied", 404);
    }

    // Fetch comments
    const { data: commentRows, error: commentsError } = await supabase
      .from("kanban_task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (commentsError) {
      return errorResponse(commentsError.message || "Failed to fetch comments", 500);
    }

    if (!commentRows || commentRows.length === 0) {
      return jsonResponse({ data: [] }, 200);
    }

    const commentIds = commentRows.map((c: KanbanTaskCommentRow) => c.id);

    // Fetch comment likes
    const { data: commentLikes } = await supabase
      .from("kanban_comment_likes")
      .select("comment_id, employee_id")
      .in("comment_id", commentIds);

    const commentLikesMap = new Map<string, string[]>();
    (commentLikes || []).forEach((like: { comment_id: string; employee_id: string }) => {
      if (!commentLikesMap.has(like.comment_id)) {
        commentLikesMap.set(like.comment_id, []);
      }
      commentLikesMap.get(like.comment_id)!.push(like.employee_id);
    });

    // Fetch replies
    const { data: replyRows } = await supabase
      .from("kanban_comment_replies")
      .select("*")
      .in("comment_id", commentIds)
      .order("created_at", { ascending: true });

    const replyIds = (replyRows || []).map((r: KanbanCommentReplyRow) => r.id);

    // Fetch reply likes
    const { data: replyLikes } = await supabase
      .from("kanban_reply_likes")
      .select("reply_id, employee_id")
      .in("reply_id", replyIds);

    const replyLikesMap = new Map<string, string[]>();
    (replyLikes || []).forEach((like: { reply_id: string; employee_id: string }) => {
      if (!replyLikesMap.has(like.reply_id)) {
        replyLikesMap.set(like.reply_id, []);
      }
      replyLikesMap.get(like.reply_id)!.push(like.employee_id);
    });

    // Get all unique employee IDs
    const employeeIds = Array.from(
      new Set([
        ...commentRows.map((c: KanbanTaskCommentRow) => c.author_id),
        ...(replyRows || []).map((r: KanbanCommentReplyRow) => r.author_id),
      ])
    );

    // Fetch employees
    const { data: employeeRows } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, avatar_url")
      .in("id", employeeIds);

    const employeeMap = new Map(
      (employeeRows || []).map((e: EmployeeRow) => [e.id, mapEmployeeRowToEmployee(e)])
    );

    // Build replies map
    const repliesMap = new Map<string, any[]>();
    (replyRows || []).forEach((replyRow: KanbanCommentReplyRow) => {
      const author = employeeMap.get(replyRow.author_id);
      if (author) {
        const reply = mapReplyRowToReply(
          replyRow,
          author,
          replyLikesMap.get(replyRow.id) || []
        );
        if (!repliesMap.has(replyRow.comment_id)) {
          repliesMap.set(replyRow.comment_id, []);
        }
        repliesMap.get(replyRow.comment_id)!.push(reply);
      }
    });

    // Map comments
    const comments = commentRows
      .map((commentRow: KanbanTaskCommentRow) => {
        const author = employeeMap.get(commentRow.author_id);
        if (!author) return null;

        return mapCommentRowToComment(
          commentRow,
          author,
          commentLikesMap.get(commentRow.id) || [],
          repliesMap.get(commentRow.id) || []
        );
      })
      .filter(Boolean);

    return jsonResponse({ data: comments }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/tasks/[id]/comments
 * Add a comment to a task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId, userId } = auth;

    const taskId = params.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    // Verify task exists and belongs to agency
    const { data: task, error: taskError } = await supabase
      .from("kanban_tasks")
      .select("id")
      .eq("id", taskId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (taskError || !task) {
      return errorResponse("Task not found or access denied", 404);
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

    const commentRow = mapCreateCommentToRow({ taskId, content: input.content }, employee.id);

    // Insert comment
    const { data: insertedComment, error: insertError } = await supabase
      .from("kanban_task_comments")
      .insert(commentRow)
      .select()
      .single();

    if (insertError) {
      return errorResponse(insertError.message || "Failed to create comment", 500);
    }

    // Fetch author details
    const { data: authorRow } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, avatar_url")
      .eq("id", employee.id)
      .single();

    const author = mapEmployeeRowToEmployee(authorRow as EmployeeRow);
    const comment = mapCommentRowToComment(
      insertedComment as KanbanTaskCommentRow,
      author,
      [],
      []
    );

    return jsonResponse({ data: comment }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
