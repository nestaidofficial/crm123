/**
 * Resolve the canonical app URL at runtime.
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL (explicit, user-set — must be a stable production URL)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (auto-set by Vercel, stable across deploys)
 *   3. VERCEL_URL (auto-set by Vercel, changes per deploy — last resort)
 *   4. localhost fallback
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL)
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
