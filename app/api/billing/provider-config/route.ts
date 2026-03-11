import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateProviderConfigSchema } from "@/lib/validation/billing.schema";
import { mapProviderConfigRowToApi, type BillingProviderConfigRow } from "@/lib/db/billing.mapper";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number, details?: unknown): NextResponse {
  return jsonResponse(
    status === 400 && details ? { error: message, details } : { error: message },
    status
  );
}

// Returns an empty default config shape for agencies that haven't configured billing yet
function defaultConfig(agencyId: string): BillingProviderConfigRow {
  return {
    id: agencyId, // use agency_id as the config id
    provider_name: "",
    npi: "",
    tax_id: "",
    taxonomy_code: null,
    billing_address: { street: "", city: "", state: "", zip: "" },
    billing_phone: null,
    billing_contact_name: null,
    state_provider_ids: {},
    default_place_of_service: "12",
    edi_submitter_id: null,
    edi_receiver_id: null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * GET /api/billing/provider-config
 * Fetch the provider config for the current agency.
 * Returns empty defaults if not yet configured.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { data: row, error } = await supabase
      .from("billing_provider_config")
      .select("*")
      .eq("id", agencyId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch provider config:", error);
      return errorResponse("Failed to fetch provider config", 500);
    }

    // No config yet — return blank defaults so the form renders empty
    const config = mapProviderConfigRowToApi(
      (row as BillingProviderConfigRow | null) ?? defaultConfig(agencyId)
    );
    return jsonResponse({ data: config }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/billing/provider-config
 * Upsert the provider config for the current agency.
 */
export async function PATCH(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = UpdateProviderConfigSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const input = parsed.data;

    // Normalize empty strings to null for optional fields
    const norm = (v: string | null | undefined) =>
      v === "" ? null : v ?? null;

    const upsertRow: Record<string, unknown> = {
      id: agencyId,
      updated_at: new Date().toISOString(),
      provider_name: norm(input.providerName),
      npi: norm(input.npi),
      tax_id: norm(input.taxId),
      taxonomy_code: norm(input.taxonomyCode),
      billing_address: input.billingAddress ?? { street: "", city: "", state: "", zip: "" },
      billing_phone: norm(input.billingPhone),
      billing_contact_name: norm(input.billingContactName),
      state_provider_ids: input.stateProviderIds ?? {},
      default_place_of_service: input.defaultPlaceOfService ?? "12",
      edi_submitter_id: norm(input.ediSubmitterId),
      edi_receiver_id: norm(input.ediReceiverId),
    };

    // Upsert: insert if new agency, update if existing
    const { data: updated, error } = await supabase
      .from("billing_provider_config")
      .upsert(upsertRow, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Failed to upsert provider config:", error);
      return errorResponse("Failed to save provider config", 500);
    }

    const config = mapProviderConfigRowToApi(updated as BillingProviderConfigRow);
    return jsonResponse({ data: config }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
