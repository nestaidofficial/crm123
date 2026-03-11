import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * GET /api/auth/confirm-signup
 * Called after email confirmation for new agency signups.
 * Creates the agency, owner membership, and employee profile, then redirects to dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = sessionData.user;
  const meta = user.user_metadata ?? {};

  // Check if agency already exists for this user (idempotent)
  const { data: existing } = await supabase
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // Use service role to create agency + membership + employee (bypasses RLS during setup)
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const agencyName = (meta.agency_name as string) || "My Agency";
  const firstName = (meta.first_name as string) || "";
  const lastName = (meta.last_name as string) || "";

  const slug = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: agency, error: agencyError } = await serviceClient
    .from("agencies")
    .insert({ name: agencyName, slug })
    .select()
    .single();

  if (agencyError) {
    return NextResponse.redirect(`${origin}/login?error=agency_creation_failed`);
  }

  const agencyId = (agency as { id: string }).id;

  await serviceClient.from("agency_members").insert({
    agency_id: agencyId,
    user_id: user.id,
    role: "owner",
    is_active: true,
    joined_at: new Date().toISOString(),
  });

  await serviceClient.from("employees").insert({
    first_name: firstName,
    last_name: lastName,
    email: user.email ?? "",
    phone: "",
    role: "admin",
    status: "active",
    start_date: new Date().toISOString().split("T")[0],
    department: "Management",
    supervisor: "",
    address: {},
    emergency_contact: {},
    pay_rate: 0,
    pay_type: "salary",
    payroll: {},
    skills: [],
    agency_id: agencyId,
    user_id: user.id,
  });

  return NextResponse.redirect(`${origin}/dashboard`);
}
