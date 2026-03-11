import { create } from "zustand";
import type { ScheduleEventApi, TimeOffApi } from "@/lib/db/schedule.mapper";
import { apiFetch } from "@/lib/api-fetch";
import { logScheduleActivity } from "@/lib/activity-logger";
import { useAuthStore } from "@/store/useAuthStore";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
let inflightHydrate: Promise<void> | null = null; // Dedup concurrent hydrate calls

interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

interface ScheduleStore {
  // State
  events: ScheduleEventApi[];
  timeOffBlocks: TimeOffApi[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  currentDateRange: DateRange | null;

  // Event CRUD
  hydrate: (dateRange?: DateRange) => Promise<void>;
  createEvent: (event: Omit<ScheduleEventApi, "id" | "createdAt" | "updatedAt">) => Promise<ScheduleEventApi>;
  updateEvent: (id: string, updates: Partial<ScheduleEventApi>) => Promise<ScheduleEventApi>;
  deleteEvent: (id: string) => Promise<void>;
  
  // Drag-and-drop optimized update
  dragUpdateEvent: (id: string, startAt: string, endAt: string) => Promise<void>;

  // Time-off CRUD
  hydrateTimeOff: (employeeId?: string) => Promise<void>;
  createTimeOff: (timeOff: Omit<TimeOffApi, "id" | "createdAt" | "updatedAt">) => Promise<TimeOffApi>;
  updateTimeOff: (id: string, updates: Partial<TimeOffApi>) => Promise<TimeOffApi>;
  deleteTimeOff: (id: string) => Promise<void>;

  // Helpers
  clearCache: () => void;
  setDateRange: (range: DateRange) => void;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  // Initial state
  events: [],
  timeOffBlocks: [],
  isLoading: false,
  error: null,
  lastFetch: null,
  currentDateRange: null,

  // Hydrate events from API with optional date range filter
  hydrate: async (dateRange?: DateRange) => {
    // Guard: skip if auth store hasn't resolved an agency yet
    const agencyId = useAuthStore.getState().currentAgencyId;
    if (!agencyId) return;

    const state = get();
    const now = Date.now();

    // Use cache if fresh and same date range
    if (
      state.lastFetch &&
      now - state.lastFetch < CACHE_TTL_MS &&
      (!dateRange ||
        (state.currentDateRange?.startDate === dateRange.startDate &&
         state.currentDateRange?.endDate === dateRange.endDate))
    ) {
      return;
    }

    // Dedup: if a request is already in-flight, piggyback on it
    if (inflightHydrate) return inflightHydrate;

    set({ isLoading: true, error: null });

    const doFetch = async () => {
      try {
        // Build query params
        const params = new URLSearchParams({ limit: "200" });
        if (dateRange) {
          params.set("startDate", dateRange.startDate);
          params.set("endDate", dateRange.endDate);
        }

        const response = await apiFetch(`/api/schedule?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch events");
        }

        const { data } = await response.json();

        set({
          events: data,
          isLoading: false,
          lastFetch: Date.now(),
          currentDateRange: dateRange || null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load schedule events";
        set({ error: message, isLoading: false });
        throw err;
      } finally {
        inflightHydrate = null;
      }
    };

    inflightHydrate = doFetch();
    return inflightHydrate;
  },

  // Create a new event
  createEvent: async (eventData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiFetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create event");
      }

      const { data: newEvent } = await response.json();

      set((state) => ({
        events: [...state.events, newEvent],
        isLoading: false,
      }));

      // Log activity
      logScheduleActivity(
        "created",
        `${newEvent.title} scheduled`,
        "Current User",
        newEvent.id
      );

      return newEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create event";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  // Update an event
  updateEvent: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiFetch(`/api/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update event");
      }

      const { data: updatedEvent } = await response.json();

      set((state) => ({
        events: state.events.map((e) => (e.id === id ? updatedEvent : e)),
        isLoading: false,
      }));

      // Log activity
      logScheduleActivity(
        "updated",
        `${updatedEvent.title} updated`,
        "Current User",
        updatedEvent.id
      );

      return updatedEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update event";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  // Delete an event
  deleteEvent: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiFetch(`/api/schedule/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete event");
      }

      const deletedEvent = get().events.find((e) => e.id === id);

      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        isLoading: false,
      }));

      // Log activity
      if (deletedEvent) {
        logScheduleActivity(
          "deleted",
          `${deletedEvent.title} removed`,
          "Current User",
          id
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete event";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  // Drag-and-drop optimized update (only time fields)
  dragUpdateEvent: async (id, startAt, endAt) => {
    // Optimistic update
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, startAt, endAt } : e
      ),
    }));

    try {
      const response = await apiFetch(`/api/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt, endAt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update event time");
      }

      const { data: updatedEvent } = await response.json();

      // Update with server response
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? updatedEvent : e)),
      }));
    } catch (err) {
      // Revert optimistic update on error
      const state = get();
      await state.hydrate(state.currentDateRange || undefined);
      
      const message = err instanceof Error ? err.message : "Failed to update event time";
      set({ error: message });
      throw err;
    }
  },

  // Hydrate time-off blocks
  hydrateTimeOff: async (employeeId?: string) => {
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams({ limit: "100" });
      if (employeeId) {
        params.set("employeeId", employeeId);
      }

      const response = await apiFetch(`/api/schedule/time-off?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch time-off blocks");
      }

      const { data } = await response.json();
      
      set({
        timeOffBlocks: data,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load time-off blocks";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  // Create time-off block
  createTimeOff: async (timeOffData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiFetch("/api/schedule/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(timeOffData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create time-off block");
      }

      const { data: newTimeOff } = await response.json();

      set((state) => ({
        timeOffBlocks: [...state.timeOffBlocks, newTimeOff],
        isLoading: false,
      }));

      return newTimeOff;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create time-off block";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  // Update time-off block
  updateTimeOff: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiFetch(`/api/schedule/time-off/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update time-off block");
      }

      const { data: updatedTimeOff } = await response.json();

      set((state) => ({
        timeOffBlocks: state.timeOffBlocks.map((t) => (t.id === id ? updatedTimeOff : t)),
        isLoading: false,
      }));

      return updatedTimeOff;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update time-off block";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  // Delete time-off block
  deleteTimeOff: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiFetch(`/api/schedule/time-off/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete time-off block");
      }

      set((state) => ({
        timeOffBlocks: state.timeOffBlocks.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete time-off block";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  // Clear cache and force refresh
  clearCache: () => {
    set({ lastFetch: null, currentDateRange: null });
  },

  // Set current date range
  setDateRange: (range) => {
    set({ currentDateRange: range });
  },
}));
