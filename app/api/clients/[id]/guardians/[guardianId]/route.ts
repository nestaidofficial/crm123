import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** DELETE /api/clients/[id]/guardians/[guardianId] — delete a guardian */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; guardianId: string }> }
) {
  try {
    const { id: clientId, guardianId } = await params;
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { error } = await supabase
      .from("client_guardians")
      .delete()
      .eq("id", guardianId)
      .eq("client_id", clientId);

    if (error) {
      return errorResponse(
        typeof error.message === "string" ? error.message : "Failed to delete guardian",
        500
      );
    }
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
