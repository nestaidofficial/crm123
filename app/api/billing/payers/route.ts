import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreatePayerSchema } from "@/lib/validation/billing.schema";
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
 * GET /api/billing/payers
 * List all payers with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const payerType = searchParams.get("payerType");
    const state = searchParams.get("state");
    const isActive = searchParams.get("isActive");

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    let query = supabase
      .from("billing_payers")
      .select("*")
      .order("name", { ascending: true });

    if (payerType) {
      query = query.eq("payer_type", payerType);
    }

    if (state) {
      query = query.eq("state", state);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Failed to list payers:", error);
      return errorResponse("Failed to list payers", 500);
    }

    const payers = (rows ?? []).map((row) => mapPayerRowToApi(row as BillingPayerRow));
    return jsonResponse({ data: payers }, 200);
  } catch (e) {
    console.error("Unexpected error in GET /api/billing/payers:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/billing/payers
 * Create a new payer
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreatePayerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: inserted, error } = await supabase
      .from("billing_payers")
      .insert({
        name: input.name,
        agency_id: agencyId,
        payer_type: input.payerType,
        state: input.state ?? null,
        electronic_payer_id: input.electronicPayerId ?? null,
        address: input.address ?? null,
        phone: input.phone ?? null,
        timely_filing_days: input.timelyFilingDays,
        billing_frequency: input.billingFrequency,
        is_active: input.isActive,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create payer:", error);
      return errorResponse("Failed to create payer", 500);
    }

    const payer = mapPayerRowToApi(inserted as BillingPayerRow);
    return jsonResponse({ data: payer }, 201);
  } catch (e) {
    console.error("Unexpected error in POST /api/billing/payers:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
