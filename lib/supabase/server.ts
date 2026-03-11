import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Server Supabase client for use in API routes and Server Components.
 * Uses @supabase/ssr createServerClient so that the auth session cookie is
 * forwarded from the browser request, allowing RLS to run as the logged-in user.
 *
 * Call this inside async server functions (API route handlers, Server Actions).
 * Do NOT call at module level — cookies() must be evaluated per-request.
 */
export async function createServerSupabaseClient(): Promise<ReturnType<typeof createServerClient>> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll can throw in Server Components where cookies are read-only.
          // This is safe to ignore — the session will still be read correctly.
        }
      },
    },
  });
}

/**
 * Supabase client with service role key.
 * Bypasses RLS entirely — use only for trusted server-side operations.
 * Returns null if the key is not configured.
 */
export function createServerSupabaseServiceClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
