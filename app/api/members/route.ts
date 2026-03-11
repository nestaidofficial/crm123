import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import {
  createServerSupabaseClient,
  createServerSupabaseServiceClient,
} from "@/lib/supabase/server";

// GET /api/members — list active members + pending invitations for the agency
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { agencyId } = auth;

  const service = createServerSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Fetch active members joined with auth.users for email + metadata
  const { data: members, error: membersError } = await service
    .from("agency_members")
    .select("user_id, role, is_active, joined_at, invited_at")
    .eq("agency_id", agencyId)
    .eq("is_active", true);

  if (membersError) {
    console.error("Error fetching members:", membersError);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  // Enrich with user data from auth.users via admin API
  const enriched = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: userData } = await service.auth.admin.getUserById(m.user_id);
      const meta = userData?.user?.user_metadata ?? {};
      return {
        userId: m.user_id,
        email: userData?.user?.email ?? "",
        name:
          meta.admin_name ||
          meta.full_name ||
          `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim() ||
          userData?.user?.email?.split("@")[0] ||
          "Unknown",
        avatarUrl: meta.avatar_url ?? null,
        role: m.role as string,
        joinedAt: m.joined_at,
        invitedAt: m.invited_at,
      };
    })
  );

  // Fetch pending invitations
  const { data: invitations, error: invitesError } = await service
    .from("agency_invitations")
    .select("id, email, role, created_at, expires_at")
    .eq("agency_id", agencyId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  if (invitesError) {
    console.error("Error fetching invitations:", invitesError);
  }

  return NextResponse.json({
    data: {
      members: enriched,
      invitations: (invitations ?? []).map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
      })),
    },
  });
}

// POST /api/members — invite a new member by email
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { agencyId, userId } = auth;

  const body = await request.json();
  const { email, role = "viewer" } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const service = createServerSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Check if user is already an active member
  const { data: existingUser } = await service.auth.admin.listUsers();
  const targetUser = existingUser?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (targetUser) {
    const { data: existingMember } = await service
      .from("agency_members")
      .select("user_id, is_active")
      .eq("agency_id", agencyId)
      .eq("user_id", targetUser.id)
      .single();

    if (existingMember?.is_active) {
      return NextResponse.json(
        { error: "User is already a member of this agency" },
        { status: 409 }
      );
    }

    // Reactivate if previously removed
    if (existingMember) {
      await service
        .from("agency_members")
        .update({ is_active: true, role, joined_at: new Date().toISOString() })
        .eq("agency_id", agencyId)
        .eq("user_id", targetUser.id);

      return NextResponse.json({ data: { status: "reactivated" } });
    }
  }

  // Upsert the invitation (delete old expired one if exists)
  await service
    .from("agency_invitations")
    .delete()
    .eq("agency_id", agencyId)
    .ilike("email", email);

  const { data: invitation, error: inviteError } = await service
    .from("agency_invitations")
    .insert({
      agency_id: agencyId,
      email: email.toLowerCase(),
      role,
      invited_by: userId,
    })
    .select()
    .single();

  if (inviteError) {
    console.error("Error creating invitation:", inviteError);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }

  // Send invite email via Supabase Auth (creates user if doesn't exist, sends magic link)
  try {
    await service.auth.admin.inviteUserByEmail(email.toLowerCase(), {
      data: {
        invited_to_agency: agencyId,
        invited_role: role,
        invitation_token: invitation.token,
      },
    });
  } catch (err) {
    console.error("Error sending invite email:", err);
    // Invitation record was created; email failure is non-fatal
  }

  return NextResponse.json({
    data: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      createdAt: invitation.created_at,
    },
  });
}
