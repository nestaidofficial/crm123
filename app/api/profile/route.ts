import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

interface ProfileSettings {
  adminName?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  avatarUrl?: string;
  supportContact?: string;
  subscription?: {
    plan: "trial" | "basic" | "pro";
    status: "active" | "past_due" | "cancelled";
    renewalDate?: string;
  };
}

/** GET /api/profile — get current user profile and agency settings */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, userId, agencyId } = auth;

    // Get user metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Failed to fetch user", 500);
    }

    // Get agency data
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("id, name, slug, settings")
      .eq("id", agencyId)
      .single();

    if (agencyError) {
      return errorResponse("Failed to fetch agency", 500);
    }

    // Get primary admin from agency_members
    const { data: primaryAdmin, error: adminError } = await supabase
      .from("agency_members")
      .select(`
        user_id,
        role
      `)
      .eq("agency_id", agencyId)
      .in("role", ["owner", "admin"])
      .eq("is_active", true)
      .order("role", { ascending: true })
      .limit(1)
      .single();

    const settings = (agency.settings || {}) as ProfileSettings;

    return jsonResponse({
      data: {
        userId: user.id,
        email: user.email,
        userMetadata: user.user_metadata,
        agencyId: agency.id,
        agencyName: agency.name,
        agencySlug: agency.slug,
        adminName: settings.adminName || user.user_metadata?.full_name || "",
        phone: settings.phone || "",
        address: settings.address || "",
        timezone: settings.timezone || "America/New_York",
        avatarUrl: settings.avatarUrl || "",
        supportContact: settings.supportContact || "",
        subscription: settings.subscription || {
          plan: "trial",
          status: "active",
          renewalDate: "",
        },
        primaryAdminId: primaryAdmin?.user_id || userId,
      },
    }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/** PATCH /api/profile — update user profile and agency settings */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, userId, agencyId } = auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const updates = body as Partial<ProfileSettings & { agencyName?: string }>;

    // Update user metadata if adminName is provided
    if (updates.adminName) {
      const { error: userError } = await supabase.auth.updateUser({
        data: { full_name: updates.adminName },
      });
      if (userError) {
        console.error("Failed to update user metadata:", userError);
      }
    }

    // Get current agency settings
    const { data: agency, error: fetchError } = await supabase
      .from("agencies")
      .select("settings, name")
      .eq("id", agencyId)
      .single();

    if (fetchError) {
      return errorResponse("Failed to fetch agency", 500);
    }

    const currentSettings = (agency.settings || {}) as ProfileSettings;

    // Merge settings
    const newSettings: ProfileSettings = {
      ...currentSettings,
      adminName: updates.adminName ?? currentSettings.adminName,
      phone: updates.phone ?? currentSettings.phone,
      address: updates.address ?? currentSettings.address,
      timezone: updates.timezone ?? currentSettings.timezone,
      avatarUrl: updates.avatarUrl ?? currentSettings.avatarUrl,
      supportContact: updates.supportContact ?? currentSettings.supportContact,
      subscription: updates.subscription ?? currentSettings.subscription,
    };

    // Update agency
    const updateData: { settings: ProfileSettings; name?: string } = {
      settings: newSettings,
    };

    if (updates.agencyName && updates.agencyName !== agency.name) {
      updateData.name = updates.agencyName;
    }

    const { error: updateError } = await supabase
      .from("agencies")
      .update(updateData)
      .eq("id", agencyId);

    if (updateError) {
      return errorResponse("Failed to update agency", 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
