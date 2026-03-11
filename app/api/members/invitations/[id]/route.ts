import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

// DELETE /api/members/invitations/[id] — revoke a pending invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { agencyId } = auth;
  const { id } = await params;

  const service = createServerSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { error } = await service
    .from("agency_invitations")
    .delete()
    .eq("id", id)
    .eq("agency_id", agencyId);

  if (error) {
    console.error("Error revoking invitation:", error);
    return NextResponse.json(
      { error: "Failed to revoke invitation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id, revoked: true } });
}
