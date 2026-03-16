import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAgencyId } from "@/lib/auth/server-auth";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const agencyId = await getUserAgencyId();

    if (!agencyId) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

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