import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateClaimSchema } from "@/lib/validation/billing.schema";
import {
  mapClaimRowToApi,
  generateClaimNumber,
  type BillingClaimRow,
  type BillingProviderConfigRow,
  type BillingPayerRow,
  type ClientPayerAssignmentRow,
} from "@/lib/db/billing.mapper";
import type { ClientRow } from "@/lib/db/client.mapper";

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
 * GET /api/billing/claims
 * List claims with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const payerId = searchParams.get("payerId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    let query = supabase
      .from("billing_claims")
      .select(`
        *,
        client:clients(id, first_name, last_name),
        payer:billing_payers(id, name, payer_type, state)
      `)
      .order("billing_period_start", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    if (payerId) {
      query = query.eq("payer_id", payerId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (startDate) {
      query = query.gte("billing_period_start", startDate);
    }

    if (endDate) {
      query = query.lte("billing_period_end", endDate);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Failed to list claims:", error);
      return errorResponse("Failed to list claims", 500);
    }

    const claims = (rows ?? []).map((row) => ({
      ...mapClaimRowToApi(row as BillingClaimRow),
      client: row.client,
      payer: row.payer,
    }));

    return jsonResponse({ data: claims }, 200);
  } catch (e) {
    console.error("Unexpected error in GET /api/billing/claims:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/billing/claims
 * Create a new Medicaid claim with 837P generation
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreateClaimSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const [
      { data: providerConfigRow },
      { data: payer },
      { data: client },
      { data: payerAssignment },
    ] = await Promise.all([
      supabase
        .from("billing_provider_config")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("billing_payers")
        .select("*")
        .eq("id", input.payerId)
        .single(),
      supabase
        .from("clients")
        .select("*")
        .eq("id", input.clientId)
        .single(),
      input.clientPayerAssignmentId
        ? supabase
            .from("client_payer_assignments")
            .select("*")
            .eq("id", input.clientPayerAssignmentId)
            .single()
        : { data: null },
    ]);

    if (!payer) {
      return errorResponse("Payer not found. Ensure the Medicaid payer is configured.", 400);
    }
    if (!client) {
      return errorResponse("Client not found.", 400);
    }

    // Use found config or a placeholder so EDI generation doesn't crash
    const providerConfig = providerConfigRow ?? {
      id: "00000000-0000-0000-0000-000000000001",
      provider_name: "Your Home Care Agency",
      npi: "1234567890",
      tax_id: "12-3456789",
      taxonomy_code: "251E00000X",
      billing_address: { street: "123 Main St", city: "Boston", state: "MA", zip: "02101" },
      billing_phone: null,
      billing_contact_name: null,
      state_provider_ids: {},
      default_place_of_service: "12",
      edi_submitter_id: null,
      edi_receiver_id: null,
      updated_at: new Date().toISOString(),
    };

    const { count } = await supabase
      .from("billing_claims")
      .select("*", { count: "exact", head: true });

    const claimNumber = generateClaimNumber((count ?? 0) + 1);

    const totalAmount = input.lineItems.reduce((sum, item) => sum + item.amount, 0);

    const firstServiceDate = input.lineItems[0].serviceDate;
    const filingDeadline = new Date(firstServiceDate);
    filingDeadline.setDate(filingDeadline.getDate() + (payer as BillingPayerRow).timely_filing_days);

    const { data: inserted, error: claimError } = await supabase
      .from("billing_claims")
      .insert({
        claim_number: claimNumber,
        agency_id: agencyId,
        client_id: input.clientId,
        payer_id: input.payerId,
        client_payer_assignment_id: input.clientPayerAssignmentId ?? null,
        billing_period_start: input.billingPeriodStart,
        billing_period_end: input.billingPeriodEnd,
        total_amount: totalAmount,
        paid_amount: 0,
        status: "generated",
        submission_date: null,
        response_date: null,
        rejection_reason: null,
        edi_content: null,
        filing_deadline: filingDeadline.toISOString().split("T")[0],
      })
      .select()
      .single();

    if (claimError) {
      console.error("Failed to create claim:", claimError);
      return errorResponse("Failed to create claim", 500);
    }

    const claimId = (inserted as BillingClaimRow).id;

    const lineRows = input.lineItems.map((item, index) => ({
      claim_id: claimId,
      agency_id: agencyId,
      evv_visit_id: item.evvVisitId,
      service_code: item.serviceCode,
      modifier: item.modifier ?? null,
      service_date: item.serviceDate,
      units: item.units,
      rate: item.rate,
      amount: item.amount,
      diagnosis_code: item.diagnosisCode ?? null,
      place_of_service: item.placeOfService,
      rendering_provider_npi: item.renderingProviderNpi ?? null,
      evv_clock_in: null,
      evv_clock_out: null,
      evv_gps_lat_in: null,
      evv_gps_lon_in: null,
      evv_gps_lat_out: null,
      evv_gps_lon_out: null,
      sort_order: index,
    }));

    const { error: linesError } = await supabase
      .from("billing_claim_lines")
      .insert(lineRows);

    if (linesError) {
      console.error("Failed to create claim lines:", linesError);
      await supabase.from("billing_claims").delete().eq("id", claimId);
      return errorResponse("Failed to create claim lines", 500);
    }

    const claim = mapClaimRowToApi(inserted as BillingClaimRow);
    return jsonResponse({ data: claim }, 201);
  } catch (e) {
    console.error("Unexpected error in POST /api/billing/claims:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
