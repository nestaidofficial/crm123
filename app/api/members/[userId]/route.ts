import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

// PATCH /api/members/[userId] — update a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { agencyId, userId: currentUserId } = auth;
  const { userId: targetUserId } = await params;

  const body = await request.json();
  const { role } = body;

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  const service = createServerSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Prevent demoting the last owner
  if (role !== "owner") {
    const { data: owners } = await service
      .from("agency_members")
      .select("user_id")
      .eq("agency_id", agencyId)
      .eq("role", "owner")
      .eq("is_active", true);

    const isLastOwner =
      owners?.length === 1 && owners[0].user_id === targetUserId;
    if (isLastOwner) {
      return NextResponse.json(
        { error: "Cannot change the role of the last owner" },
        { status: 400 }
      );
    }
  }

  const { error } = await service
    .from("agency_members")
    .update({ role })
    .eq("agency_id", agencyId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { userId: targetUserId, role } });
}

// DELETE /api/members/[userId] — remove a member from the agency
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { agencyId, userId: currentUserId } = auth;
  const { userId: targetUserId } = await params;

  // Prevent self-removal
  if (targetUserId === currentUserId) {
    return NextResponse.json(
      { error: "You cannot remove yourself from the agency" },
      { status: 400 }
    );
  }

  const service = createServerSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Soft-delete: deactivate the member
  const { error } = await service
    .from("agency_members")
    .update({ is_active: false })
    .eq("agency_id", agencyId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { userId: targetUserId, removed: true } });
}
