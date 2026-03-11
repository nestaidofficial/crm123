import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateClaimSchema } from "@/lib/validation/billing.schema";
import {
  mapClaimRowToApi,
  mapClaimLineRowToApi,
  type BillingClaimRow,
  type BillingClaimLineRow,
} from "@/lib/db/billing.mapper";

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
 * GET /api/billing/claims/[id]
 * Fetch a single claim with line items
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

    const { data: claimRow, error: claimError } = await supabase
      .from("billing_claims")
      .select(`
        *,
        client:clients(id, first_name, last_name),
        payer:billing_payers(id, name, payer_type, state)
      `)
      .eq("id", id)
      .single();

    if (claimError) {
      if (claimError.code === "PGRST116") {
        return errorResponse("Claim not found", 404);
      }
      return errorResponse("Failed to fetch claim", 500);
    }

    const { data: lineRows, error: linesError } = await supabase
      .from("billing_claim_lines")
      .select("*")
      .eq("claim_id", id)
      .order("sort_order", { ascending: true });

    if (linesError) {
      console.error("Failed to fetch claim lines:", linesError);
      return errorResponse("Failed to fetch claim lines", 500);
    }

    const claim = mapClaimRowToApi(claimRow as BillingClaimRow);
    const lines = (lineRows ?? []).map((row) => mapClaimLineRowToApi(row as BillingClaimLineRow));

    return jsonResponse({
      data: {
        claim,
        lines,
        client: claimRow.client,
        payer: claimRow.payer,
      },
    }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/billing/claims/[id]
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

    const parsed = UpdateClaimSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const updateRow: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.status !== undefined) updateRow.status = input.status;
    if (input.submissionDate !== undefined) updateRow.submission_date = input.submissionDate;
    if (input.responseDate !== undefined) updateRow.response_date = input.responseDate;
    if (input.rejectionReason !== undefined) updateRow.rejection_reason = input.rejectionReason;
    if ((input as any).ediContent !== undefined) updateRow.edi_content = (input as any).ediContent;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: updated, error } = await supabase
      .from("billing_claims")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Claim not found", 404);
      }
      return errorResponse("Failed to update claim", 500);
    }

    const claim = mapClaimRowToApi(updated as BillingClaimRow);
    return jsonResponse({ data: claim }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/billing/claims/[id]
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

    const { error } = await supabase.from("billing_claims").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Claim not found", 404);
      }
      return errorResponse("Failed to delete claim", 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
