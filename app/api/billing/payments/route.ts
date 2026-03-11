import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreatePaymentSchema } from "@/lib/validation/billing.schema";
import { mapPaymentRowToApi, type BillingPaymentRow } from "@/lib/db/billing.mapper";

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
 * GET /api/billing/payments
 * List payments with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const claimId = searchParams.get("claimId");
    const payerId = searchParams.get("payerId");

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    let query = supabase
      .from("billing_payments")
      .select("*")
      .order("payment_date", { ascending: false });

    if (invoiceId) {
      query = query.eq("invoice_id", invoiceId);
    }

    if (claimId) {
      query = query.eq("claim_id", claimId);
    }

    if (payerId) {
      query = query.eq("payer_id", payerId);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Failed to list payments:", error);
      return errorResponse("Failed to list payments", 500);
    }

    const payments = (rows ?? []).map((row) => mapPaymentRowToApi(row as BillingPaymentRow));
    return jsonResponse({ data: payments }, 200);
  } catch (e) {
    console.error("Unexpected error in GET /api/billing/payments:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/billing/payments
 * Record a new payment and update invoice/claim balance
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { data: inserted, error: paymentError } = await supabase
      .from("billing_payments")
      .insert({
        payment_date: input.paymentDate,
        agency_id: agencyId,
        amount: input.amount,
        method: input.method,
        reference_number: input.referenceNumber ?? null,
        payer_id: input.payerId ?? null,
        invoice_id: input.invoiceId ?? null,
        claim_id: input.claimId ?? null,
        notes: input.notes ?? null,
        recorded_by: input.recordedBy ?? null,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Failed to create payment:", paymentError);
      return errorResponse("Failed to record payment", 500);
    }

    if (input.invoiceId) {
      const { data: invoice } = await supabase
        .from("billing_invoices")
        .select("paid, balance")
        .eq("id", input.invoiceId)
        .single();

      if (invoice) {
        const newPaid = (invoice.paid || 0) + input.amount;
        const newBalance = (invoice.balance || 0) - input.amount;
        let newStatus: string = "unpaid";

        if (newBalance <= 0) {
          newStatus = "paid";
        } else if (newPaid > 0) {
          newStatus = "partially_paid";
        }

        await supabase
          .from("billing_invoices")
          .update({
            paid: newPaid,
            balance: Math.max(0, newBalance),
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.invoiceId);
      }
    }

    if (input.claimId) {
      const { data: claim } = await supabase
        .from("billing_claims")
        .select("paid_amount, total_amount")
        .eq("id", input.claimId)
        .single();

      if (claim) {
        const newPaidAmount = (claim.paid_amount || 0) + input.amount;
        const fullyPaid = newPaidAmount >= claim.total_amount;

        await supabase
          .from("billing_claims")
          .update({
            paid_amount: newPaidAmount,
            status: fullyPaid ? "paid" : "accepted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.claimId);
      }
    }

    const payment = mapPaymentRowToApi(inserted as BillingPaymentRow);
    return jsonResponse({ data: payment }, 201);
  } catch (e) {
    console.error("Unexpected error in POST /api/billing/payments:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
