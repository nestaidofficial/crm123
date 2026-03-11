// =============================================================================
// Retell AI: Singleton SDK Client (server-only)
// =============================================================================

import Retell from "retell-sdk";

let _retellClient: Retell | null = null;

/**
 * Returns a singleton Retell SDK client.
 * Returns null if RETELL_API_KEY is not set (graceful degradation).
 */
export function getRetellClient(): Retell | null {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) return null;

  if (!_retellClient) {
    _retellClient = new Retell({ apiKey });
  }
  return _retellClient;
}
