import { create } from "zustand";
import { getJSON, setJSON } from "@/lib/storage";
import type { Candidate, CandidateDocument, ActivityLogEntry } from "@/types/candidate";

const CANDIDATES_KEY = "nessa_candidates_v1";

interface CandidatesState {
  candidates: Candidate[];
  addCandidate: (data: Omit<Candidate, "id" | "createdAt" | "updatedAt">) => Candidate;
  updateCandidate: (id: string, updates: Partial<Omit<Candidate, "id" | "createdAt" | "updatedAt">>) => void;
  removeCandidate: (id: string) => void;
  getCandidateById: (id: string) => Candidate | undefined;
  updateStepStatus: (candidateId: string, stepId: string, status: string) => void;
  addDocument: (candidateId: string, document: CandidateDocument) => void;
  removeDocument: (candidateId: string, documentId: string) => void;
  addActivityLog: (candidateId: string, entry: Omit<ActivityLogEntry, "id" | "timestamp">) => void;
}

function loadFromStorage(): Candidate[] {
  return getJSON<Candidate[]>(CANDIDATES_KEY) ?? [];
}

export const useCandidatesStore = create<CandidatesState>((set, get) => ({
  candidates: loadFromStorage(),

  addCandidate: (data) => {
    const now = new Date().toISOString();
    const candidate: Candidate = {
      ...data,
      id: crypto.randomUUID(),
      currentPhaseId: data.currentPhaseId ?? null,
      currentStageLabel: data.currentStageLabel ?? null,
      onboardingStatus: data.onboardingStatus ?? 'active',
      workflowConfig: data.workflowConfig ?? null,
      stepStatuses: data.stepStatuses ?? {},
      documents: data.documents ?? [],
      activityLog: data.activityLog ?? [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const updated = [candidate, ...state.candidates];
      setJSON(CANDIDATES_KEY, updated);
      return { candidates: updated };
    });
    return candidate;
  },

  updateCandidate: (id, updates) => {
    set((state) => {
      const updated = state.candidates.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      );
      setJSON(CANDIDATES_KEY, updated);
      return { candidates: updated };
    });
  },

  removeCandidate: (id) => {
    set((state) => {
      const updated = state.candidates.filter((c) => c.id !== id);
      setJSON(CANDIDATES_KEY, updated);
      return { candidates: updated };
    });
  },

  getCandidateById: (id) => {
    return get().candidates.find((c) => c.id === id);
  },

  updateStepStatus: (candidateId, stepId, status) => {
    set((state) => {
      const updated = state.candidates.map((c) => {
        if (c.id !== candidateId) return c;
        return {
          ...c,
          stepStatuses: { ...c.stepStatuses, [stepId]: status },
          updatedAt: new Date().toISOString(),
        };
      });
      setJSON(CANDIDATES_KEY, updated);
      return { candidates: updated };
    });
  },

  addDocument: (candidateId, document) => {
    set((state) => {
      const updated = state.candidates.map((c) => {
        if (c.id !== candidateId) return c;
        return {
          ...c,
          documents: [...c.documents, document],
          updatedAt: new Date().toISOString(),
        };
      });
      setJSON(CANDIDATES_KEY, updated);
      return { candidates: updated };
    });
  },

  removeDocument: (candidateId, documentId) => {
    set((state) => {
      const updated = state.candidates.map((c) => {
        if (c.id !== candidateId) return c;
        return {
          ...c,
          documents: c.documents.filter((d) => d.id !== documentId),
          updatedAt: new Date().toISOString(),
        };
      });
      setJSON(CANDIDATES_KEY, updated);
      return { candidates: updated };
    });
  },

  addActivityLog: (candidateId, entry) => {
    set((state) => {
      const updated = state.candidates.map((c) => {
        if (c.id !== candidateId) return c;
        const logEntry: ActivityLogEntry = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        return {
          ...c,
          activityLog: [logEntry, ...c.activityLog],
          updatedAt: new Date().toISOString(),
        };
      });
      setJSON(CANDIDATES_KEY, updated);
      return { candidates: updated };
    });
  },
}));
