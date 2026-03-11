/**
 * Wrapper around fetch that automatically includes the current agency_id
 * as an `x-agency-id` header on every request to internal API routes.
 *
 * Import this in Zustand stores instead of using bare `fetch`.
 */
import { useAuthStore } from "@/store/useAuthStore";

type FetchArgs = Parameters<typeof fetch>;

export function apiFetch(input: FetchArgs[0], init?: FetchArgs[1]): Promise<Response> {
  const agencyId = useAuthStore.getState().currentAgencyId;

  const headers = new Headers(init?.headers);
  if (agencyId) {
    headers.set("x-agency-id", agencyId);
  }

  return fetch(input, { ...init, headers });
}
