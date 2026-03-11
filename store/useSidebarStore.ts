import { create } from "zustand";

interface SidebarStore {
  workflowsPanelOpen: boolean;
  openWorkflowsPanel: () => void;
  scheduleCloseWorkflowsPanel: () => void;
  cancelClose: () => void;
}

let closeTimer: ReturnType<typeof setTimeout> | null = null;

export const useSidebarStore = create<SidebarStore>((set) => ({
  workflowsPanelOpen: false,

  openWorkflowsPanel: () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    set({ workflowsPanelOpen: true });
  },

  scheduleCloseWorkflowsPanel: () => {
    closeTimer = setTimeout(() => {
      set({ workflowsPanelOpen: false });
      closeTimer = null;
    }, 180);
  },

  cancelClose: () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  },
}));
