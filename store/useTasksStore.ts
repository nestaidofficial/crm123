// This store is deprecated and no longer used by the tasks page.
// The tasks page now uses the useKanbanData hook with real-time Supabase data.
// Keeping this file for backwards compatibility, but it can be safely removed.

import { create } from "zustand";

interface TasksState {
  // Empty - deprecated
}

export const useTasksStore = create<TasksState>(() => ({}));
