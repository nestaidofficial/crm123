"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useAuthStore, type AppRole } from "@/store/useAuthStore";

interface AgencyContextValue {
  agencyId: string | null;
  role: AppRole | null;
  isLoading: boolean;
  /** True if the user has any of the given roles in the current agency */
  hasRole: (...roles: AppRole[]) => boolean;
  /** True for any non-caregiver role */
  isStaff: boolean;
}

const AgencyContext = createContext<AgencyContextValue>({
  agencyId: null,
  role: null,
  isLoading: true,
  hasRole: () => false,
  isStaff: false,
});

const STAFF_ROLES: AppRole[] = ["owner", "admin", "coordinator", "billing", "hr", "viewer"];

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { currentAgencyId, currentRole, isLoading, isInitialized, initialize } =
    useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const hasRole = (...roles: AppRole[]): boolean => {
    if (!currentRole) return false;
    return roles.includes(currentRole);
  };

  const isStaff = currentRole ? STAFF_ROLES.includes(currentRole) : false;

  return (
    <AgencyContext.Provider
      value={{
        agencyId: currentAgencyId,
        role: currentRole,
        isLoading,
        hasRole,
        isStaff,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

/** Hook — use this in any client component to get the current agency + role. */
export function useAgency(): AgencyContextValue {
  return useContext(AgencyContext);
}
