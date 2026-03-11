import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReceptionistSetupValues } from "@/lib/ai/receptionist-schema";
import type { ReceptionistConfigApi } from "@/lib/db/receptionist.mapper";
import { apiFetch } from "@/lib/api-fetch";

interface ReceptionistStore {
  // Form state (persisted to localStorage for draft recovery)
  setupComplete: boolean;
  config: ReceptionistSetupValues | null;

  // API / sync state
  loading: boolean;
  saving: boolean;
  syncStatus: "pending" | "synced" | "error" | null;
  syncError: string | null;
  lastSyncedAt: string | null;
  retellAgentId: string | null;

  // Actions
  saveSetup: (config: ReceptionistSetupValues) => void;
  resetSetup: () => void;
  fetchConfig: () => Promise<void>;
  saveConfig: (values: ReceptionistSetupValues) => Promise<boolean>;
  triggerSync: () => Promise<boolean>;
}

function applySyncState(
  set: (partial: Partial<ReceptionistStore>) => void,
  apiConfig: ReceptionistConfigApi
) {
  set({
    config: {
      phoneSetup: apiConfig.phoneSetup,
      callRouting: apiConfig.callRouting,
      clientIntake: apiConfig.clientIntake,
      caregiverIntake: apiConfig.caregiverIntake,
      notifications: apiConfig.notifications,
    },
    setupComplete: apiConfig.isActive,
    syncStatus: apiConfig.retellSyncStatus,
    syncError: apiConfig.retellSyncError,
    lastSyncedAt: apiConfig.lastSyncedAt,
    retellAgentId: apiConfig.retellAgentId,
  });
}

export const useReceptionistStore = create<ReceptionistStore>()(
  persist(
    (set) => ({
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
          const res = await apiFetch("/api/ai/receptionist/config");
          if (!res.ok) {
            // Non-200 but not a crash — keep localStorage data as fallback
            console.warn("Receptionist config API returned", res.status, "— using local data");
            return;
          }
          const { data } = (await res.json()) as { data: ReceptionistConfigApi };
          applySyncState(set, data);
        } catch (err) {
          // Network error or other failure — keep localStorage data
          console.warn("Could not reach receptionist config API — using local data:", err);
        } finally {
          set({ loading: false });
        }
      },

      saveConfig: async (values) => {
        set({ saving: true });
        try {
          const res = await apiFetch("/api/ai/receptionist/config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          if (!res.ok) throw new Error("Failed to save config");
          const { data } = (await res.json()) as { data: ReceptionistConfigApi };
          applySyncState(set, data);
          return true;
        } catch (err) {
          console.error("Failed to save receptionist config:", err);
          return false;
        } finally {
          set({ saving: false });
        }
      },

      triggerSync: async () => {
        set({ saving: true });
        try {
          const res = await apiFetch("/api/retell/sync", { method: "POST" });
          if (!res.ok) throw new Error("Failed to trigger sync");
          const { data } = (await res.json()) as { data: ReceptionistConfigApi };
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
      name: "receptionist-setup",
      partialize: (state) => ({
        setupComplete: state.setupComplete,
        config: state.config,
      }),
    }
  )
);
