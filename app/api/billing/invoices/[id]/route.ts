import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateInvoiceSchema } from "@/lib/validation/billing.schema";
import {
  mapInvoiceRowToApi,
  mapInvoiceLineRowToApi,
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
 * GET /api/billing/invoices/[id]
 * Fetch a single invoice with line items
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

    const { data: invoiceRow, error: invoiceError } = await supabase
      .from("billing_invoices")
      .select(`
        *,
        client:clients(id, first_name, last_name)
      `)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (invoiceError) {
      if (invoiceError.code === "PGRST116") {
        return errorResponse("Invoice not found", 404);
      }
      return errorResponse("Failed to fetch invoice", 500);
    }

    const { data: lineRows, error: linesError } = await supabase
      .from("billing_invoice_lines")
      .select("*")
      .eq("invoice_id", id)
      .eq("agency_id", agencyId)
      .order("sort_order", { ascending: true });

    if (linesError) {
      console.error("Failed to fetch invoice lines:", linesError);
      return errorResponse("Failed to fetch invoice lines", 500);
    }

    const invoice = mapInvoiceRowToApi(invoiceRow as BillingInvoiceRow);
    const lines = (lineRows ?? []).map((row) => mapInvoiceLineRowToApi(row as BillingInvoiceLineRow));

    return jsonResponse({ data: { invoice, lines, client: invoiceRow.client } }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/billing/invoices/[id]
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

    const parsed = UpdateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const updateRow: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.status !== undefined) updateRow.status = input.status;
    if (input.dueDate !== undefined) updateRow.due_date = input.dueDate;
    if (input.sentDate !== undefined) updateRow.sent_date = input.sentDate;
    if (input.notes !== undefined) updateRow.notes = input.notes;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: updated, error } = await supabase
      .from("billing_invoices")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Invoice not found", 404);
      }
      return errorResponse("Failed to update invoice", 500);
    }

    const invoice = mapInvoiceRowToApi(updated as BillingInvoiceRow);
    return jsonResponse({ data: invoice }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/billing/invoices/[id]
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

    const { error } = await supabase.from("billing_invoices").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Invoice not found", 404);
      }
      return errorResponse("Failed to delete invoice", 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
