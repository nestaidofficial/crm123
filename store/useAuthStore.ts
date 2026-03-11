import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export type AppRole =
  | "owner"
  | "admin"
  | "coordinator"
  | "billing"
  | "hr"
  | "caregiver"
  | "viewer";

export interface AgencyMembership {
  agencyId: string;
  agencyName: string;
  agencySlug: string;
  role: AppRole;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  memberships: AgencyMembership[];
  currentAgencyId: string | null;
  currentRole: AppRole | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setCurrentAgency: (agencyId: string) => void;
  getMembershipsForUser: (userId: string) => Promise<AgencyMembership[]>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  memberships: [],
  currentAgencyId: null,
  currentRole: null,
  isLoading: true,
  isInitialized: false,

  async initialize() {
    if (get().isInitialized) return;

    const supabase = getSupabaseBrowserClient();
    set({ isLoading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      let memberships: AgencyMembership[] = [];
      let currentAgencyId: string | null = null;
      let currentRole: AppRole | null = null;

      if (user) {
        memberships = await get().getMembershipsForUser(user.id);

        // Auto-select the first active membership
        if (memberships.length > 0) {
          const saved = typeof window !== "undefined"
            ? window.localStorage.getItem("nessa_current_agency")
            : null;
          const savedMembership = saved
            ? memberships.find((m) => m.agencyId === saved)
            : null;
          const active = savedMembership ?? memberships[0];
          currentAgencyId = active.agencyId;
          currentRole = active.role;
        }
      }

      set({
        user,
        session,
        memberships,
        currentAgencyId,
        currentRole,
        isLoading: false,
        isInitialized: true,
      });

      // Listen to auth state changes
      supabase.auth.onAuthStateChange(async (_event: string, newSession: Session | null) => {
        const newUser = newSession?.user ?? null;
        let newMemberships: AgencyMembership[] = [];
        let newCurrentAgencyId: string | null = null;
        let newCurrentRole: AppRole | null = null;

        if (newUser) {
          newMemberships = await get().getMembershipsForUser(newUser.id);
          if (newMemberships.length > 0) {
            const saved = typeof window !== "undefined"
              ? window.localStorage.getItem("nessa_current_agency")
              : null;
            const savedMembership = saved
              ? newMemberships.find((m) => m.agencyId === saved)
              : null;
            const active = savedMembership ?? newMemberships[0];
            newCurrentAgencyId = active.agencyId;
            newCurrentRole = active.role;
          }
        }

        set({
          user: newUser,
          session: newSession,
          memberships: newMemberships,
          currentAgencyId: newCurrentAgencyId,
          currentRole: newCurrentRole,
        });
      });
    } catch (err) {
      console.error("Auth initialization error:", err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  async signIn(email, password) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("nessa_current_agency");
    }
    set({
      user: null,
      session: null,
      memberships: [],
      currentAgencyId: null,
      currentRole: null,
    });
  },

  setCurrentAgency(agencyId: string) {
    const membership = get().memberships.find((m) => m.agencyId === agencyId);
    if (!membership) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nessa_current_agency", agencyId);
    }
    set({ currentAgencyId: agencyId, currentRole: membership.role });
  },

  async getMembershipsForUser(userId: string): Promise<AgencyMembership[]> {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("agency_members")
      .select(`
        agency_id,
        role,
        is_active,
        agencies (
          id,
          name,
          slug
        )
      `)
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error || !data) return [];

    return data
      .filter((m: Record<string, unknown>) => m.agencies)
      .map((m: Record<string, unknown>) => {
        const agency = m.agencies as { id: string; name: string; slug: string };
        return {
          agencyId: agency.id,
          agencyName: agency.name,
          agencySlug: agency.slug,
          role: m.role as AppRole,
          isActive: m.is_active as boolean,
        };
      });
  },
}));
