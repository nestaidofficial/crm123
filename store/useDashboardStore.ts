import { create } from "zustand";
import { apiFetch } from "@/lib/api-fetch";

export interface DashboardStats {
  totalClients: { value: number; change: number; changeLabel: string };
  activeCaregivers: { value: number; change: number; changeLabel: string };
  scheduledVisitsToday: { value: number; change: number; changeLabel: string };
  pendingTasks: { value: number; change: number; changeLabel: string };
  monthRevenue: { value: number; change: number; changeLabel: string };
  complianceStatus: { value: number; change: number; changeLabel: string };
}

export interface VisitStats {
  thisWeek: {
    rate: string;
    change: string;
    scheduled: number;
    completed: number;
  };
  thisMonth: {
    rate: string;
    change: string;
    scheduled: number;
    completed: number;
  };
  weeklyBreakdown: Array<{
    date: string;
    day: string;
    scheduled: number;
    completed: number;
    rate: string;
  }>;
}

export interface Activity {
  id: string;
  type: "care_note" | "schedule" | "client" | "employee" | "visit" | "alert" | "task" | "document" | "billing" | "compliance";
  title: string;
  description: string;
  actor_name: string;
  created_at: string;
  status?: "completed" | "pending" | "urgent" | "info";
}

interface DashboardState {
  stats: DashboardStats | null;
  visitStats: VisitStats | null;
  activities: Activity[];
  isLoadingStats: boolean;
  isLoadingVisitStats: boolean;
  isLoadingActivities: boolean;
  lastFetchedAt: number | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchVisitStats: () => Promise<void>;
  fetchActivities: () => Promise<void>;
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, activity: Activity) => void;
  removeActivity: (id: string) => void;
  refreshAll: () => Promise<void>;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache for dashboard

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: null,
  visitStats: null,
  activities: [],
  isLoadingStats: false,
  isLoadingVisitStats: false,
  isLoadingActivities: false,
  lastFetchedAt: null,

  async fetchStats() {
    const state = get();
    
    // Skip if already loading
    if (state.isLoadingStats) return;

    // Use cache if fresh
    if (state.lastFetchedAt && Date.now() - state.lastFetchedAt < CACHE_TTL_MS) {
      return;
    }

    set({ isLoadingStats: true });
    try {
      const response = await apiFetch("/api/dashboard/stats");
      if (response.ok) {
        const result = await response.json();
        set({ 
          stats: result.data, 
          isLoadingStats: false,
          lastFetchedAt: Date.now(),
        });
      } else {
        set({ isLoadingStats: false });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      set({ isLoadingStats: false });
    }
  },

  async fetchVisitStats() {
    const state = get();
    if (state.isLoadingVisitStats) return;

    set({ isLoadingVisitStats: true });
    try {
      const response = await apiFetch("/api/dashboard/visit-stats");
      if (response.ok) {
        const result = await response.json();
        set({ visitStats: result.data, isLoadingVisitStats: false });
      } else {
        set({ isLoadingVisitStats: false });
      }
    } catch (error) {
      console.error("Failed to fetch visit stats:", error);
      set({ isLoadingVisitStats: false });
    }
  },

  async fetchActivities() {
    const state = get();
    if (state.isLoadingActivities) return;

    set({ isLoadingActivities: true });
    try {
      const response = await apiFetch("/api/dashboard/activities?limit=10");
      if (response.ok) {
        const result = await response.json();
        set({ activities: result.data, isLoadingActivities: false });
      } else {
        set({ isLoadingActivities: false });
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      set({ isLoadingActivities: false });
    }
  },

  addActivity(activity: Activity) {
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 10),
    }));
  },

  updateActivity(id: string, activity: Activity) {
    set((state) => ({
      activities: state.activities.map((a) => (a.id === id ? activity : a)),
    }));
  },

  removeActivity(id: string) {
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== id),
    }));
  },

  async refreshAll() {
    set({ lastFetchedAt: null });
    await Promise.all([
      get().fetchStats(),
      get().fetchVisitStats(),
      get().fetchActivities(),
    ]);
  },
}));
