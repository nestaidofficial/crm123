import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    // Fetch all active services for the agency
    const { data: services, error } = await supabase
      .from("agency_services")
      .select("id, name")
      .eq("agency_id", agencyId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching agency services:", error);
      return NextResponse.json(
        { error: "Failed to fetch services" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: services });
  } catch (error) {
    console.error("Error in GET /api/services:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}