import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdatePayerSchema } from "@/lib/validation/billing.schema";
import { mapPayerRowToApi, type BillingPayerRow } from "@/lib/db/billing.mapper";

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
 * GET /api/billing/payers/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: row, error } = await supabase
      .from("billing_payers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Payer not found", 404);
      }
      return errorResponse("Failed to fetch payer", 500);
    }

    const payer = mapPayerRowToApi(row as BillingPayerRow);
    return jsonResponse({ data: payer }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/billing/payers/[id]
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

    const parsed = UpdatePayerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const updateRow: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.name !== undefined) updateRow.name = input.name;
    if (input.payerType !== undefined) updateRow.payer_type = input.payerType;
    if (input.state !== undefined) updateRow.state = input.state;
    if (input.electronicPayerId !== undefined) updateRow.electronic_payer_id = input.electronicPayerId;
    if (input.address !== undefined) updateRow.address = input.address;
    if (input.phone !== undefined) updateRow.phone = input.phone;
    if (input.timelyFilingDays !== undefined) updateRow.timely_filing_days = input.timelyFilingDays;
    if (input.billingFrequency !== undefined) updateRow.billing_frequency = input.billingFrequency;
    if (input.isActive !== undefined) updateRow.is_active = input.isActive;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: updated, error } = await supabase
      .from("billing_payers")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Payer not found", 404);
      }
      return errorResponse("Failed to update payer", 500);
    }

    const payer = mapPayerRowToApi(updated as BillingPayerRow);
    return jsonResponse({ data: payer }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/billing/payers/[id]
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

    const { error } = await supabase.from("billing_payers").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Payer not found", 404);
      }
      return errorResponse("Failed to delete payer", 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
