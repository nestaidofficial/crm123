import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateServiceCodeSchema } from "@/lib/validation/billing.schema";
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
 * GET /api/billing/service-codes
 * List service codes with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const payerId = searchParams.get("payerId");
    const serviceTypeId = searchParams.get("serviceTypeId");
    const isActive = searchParams.get("isActive");

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    let query = supabase
      .from("billing_service_codes")
      .select("*")
      .order("effective_date", { ascending: false });

    if (payerId) {
      query = query.eq("payer_id", payerId);
    }

    if (serviceTypeId) {
      query = query.eq("service_type_id", serviceTypeId);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Failed to list service codes:", error);
      return errorResponse("Failed to list service codes", 500);
    }

    const codes = (rows ?? []).map((row) => mapServiceCodeRowToApi(row as BillingServiceCodeRow));
    return jsonResponse({ data: codes }, 200);
  } catch (e) {
    console.error("Unexpected error in GET /api/billing/service-codes:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/billing/service-codes
 * Create a new service code
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreateServiceCodeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: inserted, error } = await supabase
      .from("billing_service_codes")
      .insert({
        payer_id: input.payerId,
        agency_id: agencyId,
        service_type_id: input.serviceTypeId,
        code: input.code,
        modifier: input.modifier ?? null,
        description: input.description ?? null,
        rate: input.rate,
        unit_type: input.unitType,
        effective_date: input.effectiveDate,
        end_date: input.endDate ?? null,
        is_active: input.isActive,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create service code:", error);
      return errorResponse("Failed to create service code", 500);
    }

    const code = mapServiceCodeRowToApi(inserted as BillingServiceCodeRow);
    return jsonResponse({ data: code }, 201);
  } catch (e) {
    console.error("Unexpected error in POST /api/billing/service-codes:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
