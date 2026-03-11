import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { useAuthStore } from "@/store/useAuthStore";
import { useEmployeesStore } from "@/store/useEmployeesStore";
import { useSupabaseRealtimeMulti } from "@/lib/hooks/useSupabaseRealtime";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  KanbanTask,
  KanbanColumn,
  Comment,
  Employee,
  KanbanPriority,
  KanbanDomain,
} from "@/lib/tasks/nessaKanbanMock";
import type { Employee as HrEmployee } from "@/lib/hr/mockEmployees";

/** Map an HR store employee to the lightweight kanban Employee shape */
function hrEmployeeToKanban(emp: HrEmployee): Employee {
  const initials =
    `${emp.firstName?.charAt(0) ?? ""}${emp.lastName?.charAt(0) ?? ""}`.toUpperCase() || "??";
  return {
    id: emp.id,
    name: `${emp.firstName} ${emp.lastName}`.trim(),
    initials,
    avatar: emp.avatar || undefined,
    email: emp.email || undefined,
    role: emp.role || undefined,
  };
}

interface UseKanbanDataReturn {
  tasks: KanbanTask[];
  columns: KanbanColumn[];
  employees: Employee[];
  currentEmployee: Employee | null;
  loading: boolean;
  error: string | null;

  createTask: (data: {
    columnId: string;
    title: string;
    description?: string;
    priority: KanbanPriority;
    entityType: KanbanDomain;
    dueDate?: string;
    links?: string[];
    tags?: Array<{ name: string; color: "purple" | "cyan" | "green" }>;
    assigneeIds: string[];
  }) => Promise<void>;

  updateTask: (taskId: string, data: {
    columnId?: string;
    title?: string;
    description?: string;
    priority?: KanbanPriority;
    entityType?: KanbanDomain;
    dueDate?: string;
    links?: string[];
    tags?: Array<{ name: string; color: "purple" | "cyan" | "green" }>;
    sortOrder?: number;
  }) => Promise<void>;

  deleteTask: (taskId: string) => Promise<void>;

  reorderTasks: (updates: Array<{
    taskId: string;
    columnId: string;
    sortOrder: number;
  }>) => Promise<void>;

  createColumn: (data: {
    slug: string;
    title: string;
    color?: string;
  }) => Promise<void>;

  fetchComments: (taskId: string) => Promise<Comment[]>;
  addComment: (taskId: string, content: string) => Promise<void>;
  toggleCommentLike: (commentId: string) => Promise<void>;
  addReply: (commentId: string, content: string) => Promise<void>;
  toggleReplyLike: (replyId: string) => Promise<void>;

  refetch: () => Promise<void>;
}

export function useKanbanData(): UseKanbanDataReturn {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = useAuthStore((state) => state.user?.id);
  const agencyId = useAuthStore((state) => state.currentAgencyId);

  // Reuse already-hydrated employees from the shared store — no extra API call
  const hrEmployees = useEmployeesStore((state) => state.employees);
  const employeesHydrated = useEmployeesStore((state) => state.hydrated);

  const employees: Employee[] = hrEmployees.map(hrEmployeeToKanban);

  // Resolve the current user's employee record via a direct Supabase query.
  // This avoids the agency-header race condition that would occur if we called
  // /api/employees before the auth store has fully initialised.
  useEffect(() => {
    if (!userId || !agencyId) return;

    const supabase = getSupabaseBrowserClient();
    supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, avatar_url")
      .eq("user_id", userId)
      .eq("agency_id", agencyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const initials = `${data.first_name.charAt(0)}${data.last_name.charAt(0)}`.toUpperCase();
          setCurrentEmployee({
            id: data.id,
            name: `${data.first_name} ${data.last_name}`,
            initials,
            avatar: data.avatar_url || undefined,
            email: data.email || undefined,
            role: data.role || undefined,
          });
        }
      });
  }, [userId, agencyId]);

  // Fetch columns + tasks (no employees needed here anymore)
  const fetchData = useCallback(async () => {
    if (!agencyId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const [columnsRes, tasksRes] = await Promise.all([
        apiFetch("/api/tasks/columns"),
        apiFetch("/api/tasks"),
      ]);

      if (!columnsRes.ok) {
        const body = await columnsRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch columns");
      }
      if (!tasksRes.ok) {
        const body = await tasksRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch tasks");
      }

      const columnsData = await columnsRes.json();
      const tasksData = await tasksRes.json();

      setColumns(columnsData.data || []);
      setTasks(tasksData.data || []);
    } catch (err) {
      console.error("Failed to fetch kanban data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  // Initial fetch — wait until the auth store has an agencyId
  useEffect(() => {
    if (agencyId) {
      fetchData();
    }
  }, [agencyId, fetchData]);

  // Realtime subscriptions — scoped to the current agency
  useSupabaseRealtimeMulti(
    "kanban_tasks",
    { onInsert: fetchData, onUpdate: fetchData, onDelete: fetchData },
    agencyId ? `agency_id=eq.${agencyId}` : undefined
  );

  useSupabaseRealtimeMulti(
    "kanban_columns",
    { onInsert: fetchData, onUpdate: fetchData, onDelete: fetchData },
    agencyId ? `agency_id=eq.${agencyId}` : undefined
  );

  useSupabaseRealtimeMulti(
    "kanban_task_assignees",
    { onInsert: fetchData, onDelete: fetchData }
  );

  // ─── Task mutations ────────────────────────────────────────────────────────

  const createTask = useCallback(async (data: any) => {
    const res = await apiFetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create task");
    }
    await fetchData();
  }, [fetchData]);

  const updateTask = useCallback(async (taskId: string, data: any) => {
    const res = await apiFetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update task");
    }
    await fetchData();
  }, [fetchData]);

  const deleteTask = useCallback(async (taskId: string) => {
    const res = await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete task");
    }
    await fetchData();
  }, [fetchData]);

  const reorderTasks = useCallback(async (updates: any[]) => {
    const res = await apiFetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to reorder tasks");
    }
    // Realtime will trigger fetchData; no explicit call needed
  }, [fetchData]);

  // ─── Column mutations ──────────────────────────────────────────────────────

  const createColumn = useCallback(async (data: any) => {
    const res = await apiFetch("/api/tasks/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create column");
    }
    await fetchData();
  }, [fetchData]);

  // ─── Comment mutations ─────────────────────────────────────────────────────

  const fetchComments = useCallback(async (taskId: string): Promise<Comment[]> => {
    const res = await apiFetch(`/api/tasks/${taskId}/comments`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch comments");
    }
    const data = await res.json();
    return data.data || [];
  }, []);

  const addComment = useCallback(async (taskId: string, content: string) => {
    const res = await apiFetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to add comment");
    }
  }, []);

  const toggleCommentLike = useCallback(async (commentId: string) => {
    const res = await apiFetch(`/api/tasks/comments/${commentId}/like`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to toggle like");
    }
  }, []);

  const addReply = useCallback(async (commentId: string, content: string) => {
    const res = await apiFetch(`/api/tasks/comments/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to add reply");
    }
  }, []);

  const toggleReplyLike = useCallback(async (replyId: string) => {
    const res = await apiFetch(`/api/tasks/replies/${replyId}/like`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to toggle reply like");
    }
  }, []);

  return {
    tasks,
    columns,
    employees,
    currentEmployee,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createColumn,
    fetchComments,
    addComment,
    toggleCommentLike,
    addReply,
    toggleReplyLike,
    refetch: fetchData,
  };
}
