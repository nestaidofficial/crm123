import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateClientPayerAssignmentSchema } from "@/lib/validation/billing.schema";
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
 * GET /api/billing/client-payer-assignments
 * List client payer assignments with optional client filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    let query = supabase
      .from("client_payer_assignments")
      .select(`
        *,
        payer:billing_payers(id, name, payer_type, state),
        client:clients(id, first_name, last_name)
      `)
      .order("is_primary", { ascending: false })
      .order("effective_date", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Failed to list client payer assignments:", error);
      return errorResponse("Failed to list assignments", 500);
    }

    const assignments = (rows ?? []).map((row) => ({
      ...mapClientPayerAssignmentRowToApi(row as ClientPayerAssignmentRow),
      // Normalize payer to camelCase so the wizard filter (payer?.payerType) works
      payer: row.payer
        ? {
            id: row.payer.id,
            name: row.payer.name,
            payerType: row.payer.payer_type,
            state: row.payer.state,
          }
        : null,
      // Include client name so the wizard can display it
      client: row.client ?? null,
    }));

    return jsonResponse({ data: assignments }, 200);
  } catch (e) {
    console.error("Unexpected error in GET /api/billing/client-payer-assignments:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/billing/client-payer-assignments
 * Create a new client payer assignment
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreateClientPayerAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: inserted, error } = await supabase
      .from("client_payer_assignments")
      .insert({
        client_id: input.clientId,
        agency_id: agencyId,
        payer_id: input.payerId,
        member_id: input.memberId ?? null,
        group_number: input.groupNumber ?? null,
        is_primary: input.isPrimary,
        authorization_number: input.authorizationNumber ?? null,
        authorized_units: input.authorizedUnits ?? null,
        used_units: input.usedUnits,
        authorization_start: input.authorizationStart ?? null,
        authorization_end: input.authorizationEnd ?? null,
        effective_date: input.effectiveDate,
        end_date: input.endDate ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create client payer assignment:", error);
      return errorResponse("Failed to create assignment", 500);
    }

    const assignment = mapClientPayerAssignmentRowToApi(inserted as ClientPayerAssignmentRow);
    return jsonResponse({ data: assignment }, 201);
  } catch (e) {
    console.error("Unexpected error in POST /api/billing/client-payer-assignments:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
