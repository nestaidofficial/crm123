"use client";

import { useEffect } from "react";
import { useClientsStore } from "@/store/useClientsStore";
import { useEmployeesStore } from "@/store/useEmployeesStore";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Hydrates shared Zustand stores once at layout level instead of
 * each page calling hydrate() independently. The TTL cache inside
 * each store prevents duplicate fetches.
 *
 * Also initializes the auth store (session + agency memberships) on mount.
 */
export function StoreHydrator() {
  useEffect(() => {
    // Auth must initialize first so agency_id is available before data fetches.
    useAuthStore.getState().initialize().then(() => {
      useClientsStore.getState().hydrate();
      useEmployeesStore.getState().hydrate();
    });
  }, []);

  return null;
}
