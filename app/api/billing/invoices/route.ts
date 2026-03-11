import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateInvoiceSchema } from "@/lib/validation/billing.schema";
import {
  mapInvoiceRowToApi,
  mapInvoiceLineRowToApi,
  generateInvoiceNumber,
  type BillingInvoiceRow,
  type BillingInvoiceLineRow,
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
 * GET /api/billing/invoices
 * List invoices with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    let query = supabase
      .from("billing_invoices")
      .select(`
        *,
        client:clients(id, first_name, last_name)
      `)
      .eq("agency_id", agencyId)
      .order("billing_period_start", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
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
      console.error("Failed to list invoices:", error);
      return errorResponse("Failed to list invoices", 500);
    }

    const invoices = (rows ?? []).map((row) => ({
      ...mapInvoiceRowToApi(row as BillingInvoiceRow),
      client: row.client,
    }));

    return jsonResponse({ data: invoices }, 200);
  } catch (e) {
    console.error("Unexpected error in GET /api/billing/invoices:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/billing/invoices
 * Create a new invoice with line items
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { count } = await supabase
      .from("billing_invoices")
      .select("*", { count: "exact", head: true });

    const invoiceNumber = generateInvoiceNumber((count ?? 0) + 1);

    const subtotal = input.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = 0;
    const total = subtotal + tax;

    const { data: inserted, error: invoiceError } = await supabase
      .from("billing_invoices")
      .insert({
        invoice_number: invoiceNumber,
        agency_id: agencyId,
        client_id: input.clientId,
        payer_id: input.payerId ?? null,
        billing_period_start: input.billingPeriodStart,
        billing_period_end: input.billingPeriodEnd,
        subtotal,
        tax,
        total,
        paid: 0,
        balance: total,
        status: "draft",
        due_date: input.dueDate ?? null,
        sent_date: null,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Failed to create invoice:", invoiceError);
      return errorResponse("Failed to create invoice", 500);
    }

    const invoiceId = (inserted as BillingInvoiceRow).id;

    const lineRows = input.lineItems.map((item, index) => ({
      invoice_id: invoiceId,
      agency_id: agencyId,
      evv_visit_id: item.evvVisitId,
      service_code_id: null,
      description: item.description,
      service_date: item.serviceDate,
      units: item.units,
      rate: item.rate,
      amount: item.amount,
      sort_order: index,
    }));

    const { error: linesError } = await supabase
      .from("billing_invoice_lines")
      .insert(lineRows);

    if (linesError) {
      console.error("Failed to create invoice lines:", linesError);
      await supabase.from("billing_invoices").delete().eq("id", invoiceId);
      return errorResponse("Failed to create invoice lines", 500);
    }

    const invoice = mapInvoiceRowToApi(inserted as BillingInvoiceRow);
    return jsonResponse({ data: invoice }, 201);
  } catch (e) {
    console.error("Unexpected error in POST /api/billing/invoices:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
