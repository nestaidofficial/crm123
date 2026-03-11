import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthContext {
  supabase: SupabaseClient;
  userId: string;
  agencyId: string;
}

/**
 * Validates the auth session and extracts the agency_id from the request.
 * Returns an AuthContext on success, or a NextResponse error on failure.
 *
 * agency_id is resolved from (in priority order):
 *   1. X-Agency-Id request header
 *   2. agencyId query param
 *
 * The caller should check `isNextResponse(result)` to handle errors.
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthContext | NextResponse> {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve agency_id from header or query param
  const agencyId =
    request.headers.get("x-agency-id") ??
    new URL(request.url).searchParams.get("agencyId") ??
    null;

  if (!agencyId) {
    return NextResponse.json(
      { error: "Missing agency context. Include x-agency-id header." },
      { status: 400 }
    );
  }

  return { supabase, userId: user.id, agencyId };
}

/** Type-guard to distinguish AuthContext from a NextResponse error. */
export function isAuthError(
  result: AuthContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
