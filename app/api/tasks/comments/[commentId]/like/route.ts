import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

/**
 * POST /api/tasks/comments/[commentId]/like
 * Toggle like on a comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId, userId } = auth;

    const { commentId } = await params;

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

    // Check if like exists
    const { data: existingLike } = await supabase
      .from("kanban_comment_likes")
      .select("*")
      .eq("comment_id", commentId)
      .eq("employee_id", employee.id)
      .maybeSingle();

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from("kanban_comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("employee_id", employee.id);

      if (deleteError) {
        return errorResponse(deleteError.message || "Failed to unlike comment", 500);
      }

      return jsonResponse({ liked: false }, 200);
    } else {
      // Like
      const { error: insertError } = await supabase
        .from("kanban_comment_likes")
        .insert({
          comment_id: commentId,
          employee_id: employee.id,
        });

      if (insertError) {
        return errorResponse(insertError.message || "Failed to like comment", 500);
      }

      return jsonResponse({ liked: true }, 200);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
