import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

/**
 * POST /api/tasks/replies/[replyId]/like
 * Toggle like on a reply
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { replyId: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId, userId } = auth;

    const replyId = params.replyId;

    // Verify reply exists and belongs to agency
    const { data: reply, error: replyError } = await supabase
      .from("kanban_comment_replies")
      .select("id, comment_id")
      .eq("id", replyId)
      .maybeSingle();

    if (replyError || !reply) {
      return errorResponse("Reply not found", 404);
    }

    const { data: comment } = await supabase
      .from("kanban_task_comments")
      .select("task_id")
      .eq("id", reply.comment_id)
      .maybeSingle();

    if (!comment) {
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

    // Check if like exists
    const { data: existingLike } = await supabase
      .from("kanban_reply_likes")
      .select("*")
      .eq("reply_id", replyId)
      .eq("employee_id", employee.id)
      .maybeSingle();

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from("kanban_reply_likes")
        .delete()
        .eq("reply_id", replyId)
        .eq("employee_id", employee.id);

      if (deleteError) {
        return errorResponse(deleteError.message || "Failed to unlike reply", 500);
      }

      return jsonResponse({ liked: false }, 200);
    } else {
      // Like
      const { error: insertError } = await supabase
        .from("kanban_reply_likes")
        .insert({
          reply_id: replyId,
          employee_id: employee.id,
        });

      if (insertError) {
        return errorResponse(insertError.message || "Failed to like reply", 500);
      }

      return jsonResponse({ liked: true }, 200);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
