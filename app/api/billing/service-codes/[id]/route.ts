import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateServiceCodeSchema } from "@/lib/validation/billing.schema";
import { mapServiceCodeRowToApi, type BillingServiceCodeRow } from "@/lib/db/billing.mapper";

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
 * PATCH /api/billing/service-codes/[id]
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

    const parsed = UpdateServiceCodeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const updateRow: Record<string, unknown> = {};

    if (input.payerId !== undefined) updateRow.payer_id = input.payerId;
    if (input.serviceTypeId !== undefined) updateRow.service_type_id = input.serviceTypeId;
    if (input.code !== undefined) updateRow.code = input.code;
    if (input.modifier !== undefined) updateRow.modifier = input.modifier;
    if (input.description !== undefined) updateRow.description = input.description;
    if (input.rate !== undefined) updateRow.rate = input.rate;
    if (input.unitType !== undefined) updateRow.unit_type = input.unitType;
    if (input.effectiveDate !== undefined) updateRow.effective_date = input.effectiveDate;
    if (input.endDate !== undefined) updateRow.end_date = input.endDate;
    if (input.isActive !== undefined) updateRow.is_active = input.isActive;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: updated, error } = await supabase
      .from("billing_service_codes")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Service code not found", 404);
      }
      return errorResponse("Failed to update service code", 500);
    }

    const code = mapServiceCodeRowToApi(updated as BillingServiceCodeRow);
    return jsonResponse({ data: code }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/billing/service-codes/[id]
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

    const { error } = await supabase.from("billing_service_codes").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Service code not found", 404);
      }
      return errorResponse("Failed to delete service code", 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
