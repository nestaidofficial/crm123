import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateClientPayerAssignmentSchema } from "@/lib/validation/billing.schema";
import { mapClientPayerAssignmentRowToApi, type ClientPayerAssignmentRow } from "@/lib/db/billing.mapper";

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
 * PATCH /api/billing/client-payer-assignments/[id]
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

    const parsed = UpdateClientPayerAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const updateRow: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.clientId !== undefined) updateRow.client_id = input.clientId;
    if (input.payerId !== undefined) updateRow.payer_id = input.payerId;
    if (input.memberId !== undefined) updateRow.member_id = input.memberId;
    if (input.groupNumber !== undefined) updateRow.group_number = input.groupNumber;
    if (input.isPrimary !== undefined) updateRow.is_primary = input.isPrimary;
    if (input.authorizationNumber !== undefined) updateRow.authorization_number = input.authorizationNumber;
    if (input.authorizedUnits !== undefined) updateRow.authorized_units = input.authorizedUnits;
    if (input.usedUnits !== undefined) updateRow.used_units = input.usedUnits;
    if (input.authorizationStart !== undefined) updateRow.authorization_start = input.authorizationStart;
    if (input.authorizationEnd !== undefined) updateRow.authorization_end = input.authorizationEnd;
    if (input.effectiveDate !== undefined) updateRow.effective_date = input.effectiveDate;
    if (input.endDate !== undefined) updateRow.end_date = input.endDate;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: updated, error } = await supabase
      .from("client_payer_assignments")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Assignment not found", 404);
      }
      return errorResponse("Failed to update assignment", 500);
    }

    const assignment = mapClientPayerAssignmentRowToApi(updated as ClientPayerAssignmentRow);
    return jsonResponse({ data: assignment }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/billing/client-payer-assignments/[id]
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
      .from("client_payer_assignments")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Assignment not found", 404);
      }
      return errorResponse("Failed to delete assignment", 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
