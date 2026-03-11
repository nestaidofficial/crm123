import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

const BUCKET = "client-documents";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** DELETE /api/clients/[id]/documents/[documentId] */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { id: clientId, documentId } = await params;
    if (!clientId || !documentId) return errorResponse("Missing client or document id", 400);

    const { data: row, error: fetchError } = await supabase
      .from("client_documents")
      .select("id, file_path")
      .eq("id", documentId)
      .eq("client_id", clientId)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError || !row) {
      return errorResponse("Document not found", 404);
    }

    const path = (row as { file_path: string }).file_path;
    const storageClient = createServerSupabaseServiceClient();
    if (storageClient) {
      await storageClient.storage.from(BUCKET).remove([path]);
    }

    const { error: deleteError } = await supabase
      .from("client_documents")
      .delete()
      .eq("id", documentId)
      .eq("client_id", clientId)
      .eq("agency_id", agencyId);

    if (deleteError) {
      return errorResponse(deleteError.message || "Failed to delete document record", 500);
    }

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
