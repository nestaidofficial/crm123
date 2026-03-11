import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

/** GET /api/employees/[id]/verifications — list all verification items for employee */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    // Verify employee exists and belongs to agency
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (empError || !employee) {
      return errorResponse("Employee not found", 404);
    }

    const { data: verifications, error } = await supabase
      .from("employee_verifications")
      .select("*")
      .eq("employee_id", id)
      .eq("agency_id", agencyId)
      .order("sort_order", { ascending: true });

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to fetch verifications";
      return errorResponse(message, 500);
    }

    return jsonResponse({ data: verifications ?? [] }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/** PATCH /api/employees/[id]/verifications — update verification status */
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

    const { verificationId, status, completedAt } = body as {
      verificationId: string;
      status: "complete" | "pending" | "missing";
      completedAt?: string;
    };

    if (!verificationId || !status) {
      return errorResponse("Missing required fields: verificationId, status", 400);
    }

    if (!["complete", "pending", "missing"].includes(status)) {
      return errorResponse("Invalid status. Must be: complete, pending, or missing", 400);
    }

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    // Verify employee exists
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("id", id)
      .single();

    if (empError || !employee) {
      return errorResponse("Employee not found", 404);
    }

    const updateData: {
      status: string;
      completed_at?: string | null;
      updated_at: string;
    } = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at if status is complete
    if (status === "complete") {
      updateData.completed_at = completedAt ?? new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    const { data: verification, error } = await supabase
      .from("employee_verifications")
      .update(updateData)
      .eq("id", verificationId)
      .eq("employee_id", id)
      .select()
      .single();

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to update verification";
      return errorResponse(message, 500);
    }

    if (!verification) {
      return errorResponse("Verification not found", 404);
    }

    return jsonResponse({ data: verification }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
