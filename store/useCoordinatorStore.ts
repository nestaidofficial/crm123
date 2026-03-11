import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoordinatorSetupValues } from "@/lib/ai/coordinator-schema";
import type { CoordinatorConfigApi } from "@/lib/db/coordinator.mapper";
import { apiFetch } from "@/lib/api-fetch";

interface CoordinatorStore {
  // Form state (persisted to localStorage for draft recovery)
  setupComplete: boolean;
  config: CoordinatorSetupValues | null;

  // API / sync state
  loading: boolean;
  saving: boolean;
  syncStatus: "pending" | "synced" | "error" | null;
  syncError: string | null;
  lastSyncedAt: string | null;
  retellAgentId: string | null;

  // Actions
  saveSetup: (config: CoordinatorSetupValues) => void;
  resetSetup: () => void;
  fetchConfig: () => Promise<void>;
  saveConfig: (values: CoordinatorSetupValues) => Promise<boolean>;
  triggerSync: () => Promise<boolean>;
}

type SetFn = (
  partial:
    | Partial<CoordinatorStore>
    | ((state: CoordinatorStore) => Partial<CoordinatorStore>)
) => void;

function applySyncState(set: SetFn, apiConfig: CoordinatorConfigApi) {
  set((state) => ({
    config: {
      lineRouting: apiConfig.lineRouting,
      callTypes: apiConfig.callTypes,
      callOutIntake: apiConfig.callOutIntake,
      coverageWorkflow: apiConfig.coverageWorkflow,
      escalationsNotifications: apiConfig.escalationsNotifications,
    },
    // Never regress setupComplete from true to false via API fetch.
    // Once the user has completed setup (persisted in localStorage), keep it
    // complete even if the API row is temporarily unavailable or isActive=false.
    setupComplete: state.setupComplete || apiConfig.isActive,
    syncStatus: apiConfig.retellSyncStatus,
    syncError: apiConfig.retellSyncError,
    lastSyncedAt: apiConfig.lastSyncedAt,
    retellAgentId: apiConfig.retellAgentId,
  }));
}

export const useCoordinatorStore = create<CoordinatorStore>()(
  persist(
    (set: SetFn) => ({
      setupComplete: false,
      config: null,
      loading: false,
      saving: false,
      syncStatus: null,
      syncError: null,
      lastSyncedAt: null,
      retellAgentId: null,

      saveSetup: (config) =>
        set({
          config,
          setupComplete: true,
        }),

      resetSetup: () =>
        set({
          config: null,
          setupComplete: false,
          syncStatus: null,
          syncError: null,
          lastSyncedAt: null,
          retellAgentId: null,
        }),

      fetchConfig: async () => {
        set({ loading: true });
        try {
          const res = await apiFetch("/api/ai/coordinator/config");
          if (!res.ok) {
            console.warn("Coordinator config API returned", res.status, "— using local data");
            return;
          }
          const { data } = (await res.json()) as { data: CoordinatorConfigApi };
          applySyncState(set, data);
        } catch (err) {
          console.warn("Could not reach coordinator config API — using local data:", err);
        } finally {
          set({ loading: false });
        }
      },

      saveConfig: async (values) => {
        set({ saving: true });
        try {
          const res = await apiFetch("/api/ai/coordinator/config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          if (!res.ok) throw new Error("Failed to save config");
          const { data } = (await res.json()) as { data: CoordinatorConfigApi };
          applySyncState(set, data);
          return true;
        } catch (err) {
          console.error("Failed to save coordinator config:", err);
          return false;
        } finally {
          set({ saving: false });
        }
      },

      triggerSync: async () => {
        set({ saving: true });
        try {
          const res = await apiFetch("/api/retell/coordinator-sync", { method: "POST" });
          if (!res.ok) throw new Error("Failed to trigger sync");
          const { data } = (await res.json()) as { data: CoordinatorConfigApi };
          applySyncState(set, data);
          return true;
        } catch (err) {
          console.error("Failed to trigger Retell sync:", err);
          return false;
        } finally {
          set({ saving: false });
        }
      },
    }),
    {
      name: "coordinator-setup",
      version: 5,
      migrate: (persistedState: any, version: number) => {
        if (version < 5) {
          return {
            setupComplete: false,
            config: null,
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        setupComplete: state.setupComplete,
        config: state.config,
      }),
    }
  )
);
