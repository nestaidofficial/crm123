import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase browser client.
 * Uses @supabase/ssr so that auth cookies are automatically managed across
 * browser ↔ Next.js API routes ↔ Server Components.
 * Singleton: safe to import anywhere in client components.
 */
let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!_browserClient) {
    _browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return _browserClient;
}

/** Default export for backward compat — prefers the singleton browser client. */
export const supabase = getSupabaseBrowserClient();
