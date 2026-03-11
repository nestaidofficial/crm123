import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** GET /api/clients/[id]/guardians — list guardians for a client */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: rows, error } = await supabase
      .from("client_guardians")
      .select("id, name, relationship, phone, email, is_primary, created_at, updated_at")
      .eq("client_id", clientId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      return errorResponse(
        typeof error.message === "string" ? error.message : "Failed to list guardians",
        500
      );
    }

    const data = (rows ?? []).map((row: { id: string; name: string; relationship: string; phone: string; email: string | null; is_primary?: boolean }) => ({
      id: row.id,
      name: row.name,
      relationship: row.relationship,
      phone: row.phone,
      email: row.email ?? undefined,
      isPrimary: row.is_primary === true,
    }));
    return jsonResponse({ data }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/** POST /api/clients/[id]/guardians — create a guardian */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const b = body as Record<string, unknown>;
    const name = typeof b.name === "string" ? b.name.trim() : "";
    const relationship = typeof b.relationship === "string" ? b.relationship.trim() : "";
    const phone = typeof b.phone === "string" ? b.phone.trim() : "";
    const email = typeof b.email === "string" ? b.email.trim() || null : null;

    if (!name || !relationship || !phone) {
      return errorResponse("Name, relationship, and phone are required", 400);
    }

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { data: inserted, error } = await supabase
      .from("client_guardians")
      .insert({
        client_id: clientId,
        agency_id: agencyId,
        name,
        relationship,
        phone,
        email,
      })
      .select("id, name, relationship, phone, email")
      .single();

    if (error) {
      if (error.code === "23503") {
        return errorResponse("Client not found", 404);
      }
      return errorResponse(
        typeof error.message === "string" ? error.message : "Failed to create guardian",
        500
      );
    }

    const data = {
      id: inserted.id,
      name: inserted.name,
      relationship: inserted.relationship,
      phone: inserted.phone,
      email: inserted.email ?? undefined,
    };
    return jsonResponse({ data }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
