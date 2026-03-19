import { create } from "zustand";
import { getJSON, setJSON } from "@/lib/storage";
import type { ClientFormValues, SavedClient } from "@/lib/clients/schema";
import type { CreateClientInput, UpdateClientInput } from "@/lib/validation/client.schema";
import { apiShapeToSavedClient } from "@/lib/db/client.mapper";
import { apiFetch } from "@/lib/api-fetch";
import { logClientActivity } from "@/lib/activity-logger";
import { useAuthStore } from "@/store/useAuthStore";

const CLIENTS_KEY = "nessa_clients_v1";
const DRAFT_KEY = "nessa_client_draft_v1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

/** Convert form payload to API PATCH body (avatar -> avatarUrl, physicianName/physicianPhone -> physician). */
function formToUpdateInput(data: Partial<ClientFormValues>): UpdateClientInput {
  const d = data as Record<string, unknown>;
  const out: UpdateClientInput = {};
  const allowed = new Set([
    "careType", "firstName", "lastName", "dob", "gender", "phone", "email",
    "avatarUrl", "address", "primaryContact", "emergencyContact", "notes",
    "adlNeeds", "schedulePreferences", "diagnosis", "physician", "medications", "skilledServices",
  ]);
  for (const [key, value] of Object.entries(d)) {
    if (value === undefined) continue;
    if (key === "avatar") {
      out.avatarUrl = typeof value === "string" ? value : undefined;
      continue;
    }
    if (key === "physicianName" || key === "physicianPhone") continue;
    if (allowed.has(key)) (out as Record<string, unknown>)[key] = value;
  }
  if ("physicianName" in d || "physicianPhone" in d) {
    out.physician = {
      name: (d.physicianName as string) ?? "",
      phone: (d.physicianPhone as string) ?? "",
    };
  }
  return out;
}

/** Convert form values to API POST body (avatar -> avatarUrl, physicianName/physicianPhone -> physician). */
function formToCreateInput(data: ClientFormValues): CreateClientInput {
  const d = data as Record<string, unknown>;
  const base = {
    careType: data.careType,
    firstName: data.firstName,
    lastName: data.lastName,
    dob: data.dob,
    gender: data.gender,
    phone: data.phone,
    email: data.email && data.email.trim() !== "" ? data.email : undefined,
    avatarUrl: (d.avatar as string) && (d.avatar as string).trim() !== "" ? (d.avatar as string) : undefined,
    address: data.address,
    primaryContact: data.primaryContact,
    emergencyContact: data.emergencyContact,
    notes: data.notes && data.notes.trim() !== "" ? data.notes : undefined,
  };
  if (data.careType === "non_medical") {
    return {
      ...base,
      careType: "non_medical",
      adlNeeds: data.adlNeeds,
      schedulePreferences: data.schedulePreferences,
    } as CreateClientInput;
  }
  return {
    ...base,
    careType: "medical",
    diagnosis: data.diagnosis,
    physician: { name: data.physicianName, phone: data.physicianPhone },
    medications: data.medications,
    skilledServices: data.skilledServices,
  } as CreateClientInput;
}

interface ClientsState {
  clients: SavedClient[];
  hydrated: boolean;
  loading: boolean;
  lastFetchedAt: number | null;
  hydrate: () => void;
  forceRefresh: () => Promise<void>;
  addClient: (data: ClientFormValues) => Promise<SavedClient>;
  updateClient: (id: string, data: Partial<ClientFormValues>) => Promise<SavedClient>;
  deleteClient: (id: string) => Promise<void>;
  fetchClients: () => Promise<void>;
  loadClient: (id: string) => Promise<SavedClient | null>;
  getDraft: () => ClientFormValues | null;
  saveDraft: (draft: ClientFormValues) => void;
  clearDraft: () => void;
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  hydrated: false,
  loading: false,
  lastFetchedAt: null,

  hydrate() {
    const state = get();
    // Skip if already loading
    if (state.loading) return;
    // Skip if recently fetched (within TTL)
    if (state.hydrated && state.lastFetchedAt) {
      const age = Date.now() - state.lastFetchedAt;
      if (age < CACHE_TTL_MS) return;
    }
    // Guard: require an agency context before fetching
    const agencyId = useAuthStore.getState().currentAgencyId;
    if (!agencyId) return;
    get().fetchClients();
  },

  async forceRefresh() {
    set({ lastFetchedAt: null, hydrated: false });
    return get().fetchClients();
  },

  async addClient(data: ClientFormValues) {
    const body = formToCreateInput(data);
    const response = await apiFetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create client");
    }

    const result = await response.json();
    const created = apiShapeToSavedClient(result.data);
    const clients = [...get().clients, created];
    set({ clients, hydrated: true });
    setJSON(CLIENTS_KEY, clients);
    
    // Log activity
    logClientActivity(
      "created",
      `${created.firstName} ${created.lastName}`,
      "Current User",
      created.id
    );
    
    return created;
  },

  async updateClient(id: string, data: Partial<ClientFormValues>) {
    const body = formToUpdateInput(data);
    const response = await apiFetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update client");
    }

    const result = await response.json();
    const updated = apiShapeToSavedClient(result.data);
    const clients = get().clients.map((p) => (p.id === id ? updated : p));
    set({ clients });
    setJSON(CLIENTS_KEY, clients);
    
    // Log activity
    logClientActivity(
      "updated",
      `${updated.firstName} ${updated.lastName}`,
      "Current User",
      updated.id
    );
    
    return updated;
  },

  async deleteClient(id: string) {
    const response = await apiFetch(`/api/clients/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete client");
    }

    const deletedClient = get().clients.find((p) => p.id === id);
    const clients = get().clients.filter((p) => p.id !== id);
    set({ clients });
    setJSON(CLIENTS_KEY, clients);
    
    // Log activity
    if (deletedClient) {
      logClientActivity(
        "deleted",
        `${deletedClient.firstName} ${deletedClient.lastName}`,
        "Current User",
        id
      );
    }
  },

  async fetchClients() {
    set({ loading: true });
    try {
      let response: Response;
      try {
        response = await apiFetch("/api/clients");
      } catch (e) {
        const msg = e instanceof Error && e.message === "fetch failed"
          ? "Could not reach the server. Check your network and that the dev server is running."
          : e instanceof Error ? e.message : "Failed to fetch clients";
        throw new Error(msg);
      }
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        let msg = typeof (errBody as { error?: string }).error === "string" ? (errBody as { error: string }).error : "Failed to fetch clients";
        if (msg.toLowerCase().includes("fetch failed")) {
          msg = "Could not reach the database. Check NEXT_PUBLIC_SUPABASE_URL in .env.local and that your Supabase project is reachable.";
        }
        throw new Error(msg);
      }
      const result = await response.json();
      const raw = result.data || [];
      const clients = raw.map((api: Parameters<typeof apiShapeToSavedClient>[0]) => apiShapeToSavedClient(api));
      set({ clients, hydrated: true, loading: false, lastFetchedAt: Date.now() });
      setJSON(CLIENTS_KEY, clients);
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  async loadClient(id: string) {
    // Always fetch fresh from the individual endpoint — it includes services via a join
    const response = await apiFetch(`/api/clients/${id}`);
    if (!response.ok) return null;
    const result = await response.json();
    const client = apiShapeToSavedClient(result.data);
    const clients = [...get().clients.filter((p) => p.id !== id), client];
    set({ clients });
    setJSON(CLIENTS_KEY, clients);
    return client;
  },

  getDraft() {
    return getJSON<ClientFormValues>(DRAFT_KEY);
  },

  saveDraft(draft: ClientFormValues) {
    setJSON(DRAFT_KEY, draft);
  },

  clearDraft() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  },
}));
