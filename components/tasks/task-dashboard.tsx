"use client";

import { useState, useEffect } from "react";
import {
  KanbanTask,
  KanbanStatus,
  KanbanPriority,
  KanbanDomain,
  KanbanColumn as KanbanColumnType,
  Employee,
} from "@/lib/tasks/nessaKanbanMock";
import { useKanbanData } from "@/lib/hooks/useKanbanData";
import { KanbanColumn } from "./kanban-column";
import { InlineTaskComposer } from "./inline-task-composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Search,
  LayoutGrid,
  List,
  Plus,
  AlertCircle,
  ArrowUp,
  Minus,
  ArrowDown,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

export function TaskDashboard() {
  const {
    tasks: kanbanTasks,
    columns: kanbanColumns,
    employees,
    currentEmployee,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createColumn,
  } = useKanbanData();

  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All Tasks");
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [inlineComposerColumn, setInlineComposerColumn] = useState<KanbanStatus | null>(null);
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [dropIndicator, setDropIndicator] = useState<{
    columnId: string;
    index: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Sync hook data to local state for drag-and-drop operations
  useEffect(() => {
    if (kanbanTasks.length > 0 || tasks.length === 0) {
      setTasks(kanbanTasks);
    }
    if (kanbanColumns.length > 0 || columns.length === 0) {
      setColumns(kanbanColumns);
    }
  }, [kanbanTasks, kanbanColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Apply search (and optional filters) for display
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !searchQuery.trim() ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority =
      priorityFilter === "All Tasks" || task.priority === priorityFilter.toLowerCase();
    return matchesSearch && matchesPriority;
  });

  // Filter tasks by status and sort by order (uses filtered set for display)
  const getTasksByStatus = (status: string) => {
    return filteredTasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.order - b.order);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;

    const newColumnId = newColumnName.toLowerCase().replace(/\s+/g, "_");
    
    try {
      await createColumn({
        slug: newColumnId,
        title: newColumnName,
        color: "neutral",
      });
      setNewColumnName("");
      setShowAddColumnDialog(false);
    } catch (err) {
      console.error("Failed to create column:", err);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDropIndicator(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) {
      setDropIndicator(null);
      return;
    }

    // Check if hovering over a column (not a task)
    const overColumn = columns.find((col) => col.id === overId);
    if (overColumn) {
      // Dropping on empty space in column - add to end
      const columnTasks = tasks.filter((t) => t.status === overColumn.id);
      setDropIndicator({
        columnId: overColumn.id,
        index: columnTasks.length,
      });
      return;
    }

    // Must be hovering over a task
    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) {
      setDropIndicator(null);
      return;
    }

    // Get the over rect
    const overRect = over.rect;
    if (!overRect) {
      setDropIndicator(null);
      return;
    }

    // Try to get active rect for position calculation
    const activeRect = active.rect.current.translated || active.rect.current.initial;
    
    // Determine insert position
    let insertBefore = false;
    
    if (activeRect) {
      // Use precise position if available
      const overMiddleY = overRect.top + overRect.height / 2;
      const activeCenterY = activeRect.top + activeRect.height / 2;
      insertBefore = activeCenterY < overMiddleY;
    } else {
      // Fallback: if no active rect yet, default to inserting before
      // This ensures we show an indicator even on first drag
      insertBefore = true;
    }

    // Calculate target index based on whether we're in same or different column
    if (activeTask.status === overTask.status) {
      // Same column - need to account for the active task in the list
      const columnTasks = tasks
        .filter((t) => t.status === overTask.status)
        .sort((a, b) => a.order - b.order);

      const activeIndex = columnTasks.findIndex((t) => t.id === activeId);
      const overIndex = columnTasks.findIndex((t) => t.id === overId);
      
      if (overIndex !== -1 && activeIndex !== -1) {
        let targetIndex: number;
        
        if (insertBefore) {
          targetIndex = overIndex;
        } else {
          targetIndex = overIndex + 1;
        }
        
        // Calculate the final position after removing active task
        let finalIndex = targetIndex;
        if (activeIndex < targetIndex) {
          finalIndex = Math.max(0, targetIndex - 1);
        }
        
        // Don't show indicator if we're not actually moving position
        if (finalIndex === activeIndex) {
          setDropIndicator(null);
          return;
        }
        
        setDropIndicator({
          columnId: overTask.status,
          index: finalIndex,
        });
      }
    } else {
      // Different column - simpler calculation
      const columnTasks = tasks
        .filter((t) => t.status === overTask.status)
        .sort((a, b) => a.order - b.order);
      
      const overIndex = columnTasks.findIndex((t) => t.id === overId);
      const targetIndex = insertBefore ? overIndex : overIndex + 1;
      
      setDropIndicator({
        columnId: overTask.status,
        index: targetIndex,
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setDropIndicator(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropped on a column
    const targetColumn = columns.find((col) => col.id === overId);
    if (targetColumn) {
      // Same column: move to end of column (reorder). Different column: move task.
      if (activeTask.status === targetColumn.id) {
        const columnTasks = tasks
          .filter((t) => t.status === targetColumn.id)
          .sort((a, b) => a.order - b.order);
        await reorderWithinColumn(activeId, targetColumn.id, columnTasks.length);
      } else {
        await moveTaskToColumn(activeId, targetColumn.id);
      }
      return;
    }

    // Check if dropped on another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      if (activeTask.status === overTask.status) {
        // Reorder within the same column
        let targetIndex: number | undefined = dropIndicator?.columnId === overTask.status ? dropIndicator.index : undefined;
        if (targetIndex === undefined) {
          const columnTasks = tasks
            .filter((t) => t.status === overTask.status)
            .sort((a, b) => a.order - b.order);
          const overIndex = columnTasks.findIndex((t) => t.id === overId);
          targetIndex = overIndex >= 0 ? overIndex + 1 : undefined;
        }
        await reorderWithinColumn(activeId, overTask.status, targetIndex);
      } else {
        // Move to different column and place at the drop indicator position
        if (dropIndicator) {
          await moveTaskToColumn(activeId, overTask.status, dropIndicator.index);
        } else {
          await moveTaskToColumn(activeId, overTask.status);
        }
      }
    }
  };

  const moveTaskToColumn = async (
    taskId: string,
    newStatus: string,
    targetIndex?: number
  ) => {
    // Optimistic update
    setTasks((prevTasks) => {
      const taskIndex = prevTasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return prevTasks;

      const task = prevTasks[taskIndex];
      if (task.status === newStatus) return prevTasks;

      const updatedTask = { ...task, status: newStatus };
      const newTasks = [...prevTasks];
      newTasks.splice(taskIndex, 1);

      const targetColumnTasks = newTasks.filter((t) => t.status === newStatus)
        .sort((a, b) => a.order - b.order);

      const insertAt = targetIndex !== undefined ? targetIndex : targetColumnTasks.length;
      const clampedInsertAt = Math.max(0, Math.min(insertAt, targetColumnTasks.length));

      targetColumnTasks.splice(clampedInsertAt, 0, updatedTask);

      targetColumnTasks.forEach((t, index) => {
        t.order = index;
      });

      const oldColumnTasks = newTasks.filter((t) => t.status === task.status);
      oldColumnTasks.forEach((t, index) => {
        t.order = index;
      });

      const otherTasks = newTasks.filter((t) => t.status !== newStatus && t.status !== task.status);
      return [...otherTasks, ...targetColumnTasks, ...oldColumnTasks];
    });

    // Send reorder request to API
    const updates = tasks
      .filter((t) => t.status === newStatus || t.id === taskId)
      .map((t, index) => ({
        taskId: t.id,
        columnId: t.id === taskId ? newStatus : t.status,
        sortOrder: t.order,
      }));

    try {
      await reorderTasks(updates);
    } catch (err) {
      console.error("Failed to reorder tasks:", err);
    }
  };

  const reorderWithinColumn = async (
    activeId: string,
    status: string,
    targetIndex?: number
  ) => {
    // Optimistic update
    setTasks((prevTasks) => {
      const columnTasks = prevTasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.order - b.order);

      const activeIndex = columnTasks.findIndex((t) => t.id === activeId);

      if (activeIndex === -1) return prevTasks;

      const [movedTask] = columnTasks.splice(activeIndex, 1);

      let insertAt: number;
      if (targetIndex !== undefined) {
        insertAt = targetIndex;
        if (activeIndex < targetIndex) {
          insertAt = Math.max(0, insertAt - 1);
        }
      } else {
        insertAt = columnTasks.length;
      }

      const clampedInsertAt = Math.max(0, Math.min(insertAt, columnTasks.length));
      columnTasks.splice(clampedInsertAt, 0, movedTask);

      columnTasks.forEach((task, index) => {
        task.order = index;
      });

      const otherTasks = prevTasks.filter((t) => t.status !== status);
      return [...otherTasks, ...columnTasks];
    });

    // Send reorder request to API
    const updates = tasks
      .filter((t) => t.status === status)
      .map((t, index) => ({
        taskId: t.id,
        columnId: t.status,
        sortOrder: t.order,
      }));

    try {
      await reorderTasks(updates);
    } catch (err) {
      console.error("Failed to reorder tasks:", err);
    }
  };

  const handleToggleComposer = (status: KanbanStatus) => {
    setInlineComposerColumn((prev) => (prev === status ? null : status));
  };

  const handleCloseComposer = () => {
    setInlineComposerColumn(null);
  };

  const handleAddTask = async (taskData: {
    title: string;
    description: string;
    priority: KanbanPriority;
    domain: KanbanDomain;
    assignees: Employee[];
    dueDate: string;
    links?: string[];
    status: KanbanStatus;
  }) => {
    // Auto-generate tags based on domain
    const domainTagMap: Record<string, { name: string; color: "purple" | "cyan" | "green" }> = {
      Opportunities: { name: "Sales-Oriented", color: "cyan" },
      Clients: { name: "Healthcare", color: "green" },
      HR: { name: "Internal", color: "purple" },
      General: { name: "General", color: "green" },
      marketing: { name: "Marketing", color: "purple" },
      referral_program: { name: "Referral", color: "cyan" },
      client_communication: { name: "Client", color: "green" },
      seo_optimization: { name: "SEO", color: "purple" },
    };
    const tagEntry = domainTagMap[taskData.domain] ?? { name: "General", color: "green" as const };

    const validLinks = (taskData.links ?? []).filter((l) => {
      try { return l.trim() !== "" && Boolean(new URL(l)); } catch { return false; }
    });

    try {
      await createTask({
        columnId: taskData.status,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        entityType: taskData.domain,
        dueDate: taskData.dueDate,
        links: validLinks.length > 0 ? validLinks : undefined,
        tags: [tagEntry],
        assigneeIds: taskData.assignees.map((a) => a.id),
      });
      setInlineComposerColumn(null);
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const domainTagMap: Record<string, { name: string; color: "purple" | "cyan" | "green" }> = {
    Opportunities: { name: "Sales-Oriented", color: "cyan" },
    Clients: { name: "Healthcare", color: "green" },
    HR: { name: "Internal", color: "purple" },
    General: { name: "General", color: "green" },
    marketing: { name: "Marketing", color: "purple" },
    referral_program: { name: "Referral", color: "cyan" },
    client_communication: { name: "Client", color: "green" },
    seo_optimization: { name: "SEO", color: "purple" },
  };

  const handleEditTask = (task: KanbanTask) => {
    setEditingTask(task);
  };

  const handleSaveTask = async (taskData: {
    title: string;
    description: string;
    priority: KanbanPriority;
    domain: KanbanDomain;
    assignees: Employee[];
    dueDate: string;
    links?: string[];
    status: KanbanStatus;
  }) => {
    if (!editingTask) return;
    
    const domainTagMap: Record<string, { name: string; color: "purple" | "cyan" | "green" }> = {
      Opportunities: { name: "Sales-Oriented", color: "cyan" },
      Clients: { name: "Healthcare", color: "green" },
      HR: { name: "Internal", color: "purple" },
      General: { name: "General", color: "green" },
      marketing: { name: "Marketing", color: "purple" },
      referral_program: { name: "Referral", color: "cyan" },
      client_communication: { name: "Client", color: "green" },
      seo_optimization: { name: "SEO", color: "purple" },
    };
    const tagEntry = domainTagMap[taskData.domain] ?? { name: "General", color: "green" as const };

    try {
      await updateTask(editingTask.id, {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        entityType: taskData.domain,
        dueDate: taskData.dueDate,
        links: taskData.links,
        tags: [tagEntry],
      });
      setEditingTask(null);
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      if (editingTask?.id === taskId) setEditingTask(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleUpdateComments = (taskId: string, comments: any[]) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, comments, updatedAt: new Date().toISOString() }
          : task
      )
    );
  };

  const priorityTabs = [
    { label: "All Tasks", value: "All Tasks", icon: LayoutGrid, badge: tasks.length },
    { label: "High", value: "High", icon: ArrowUp },
    { label: "Medium", value: "Medium", icon: Minus },
    { label: "Low", value: "Low", icon: ArrowDown },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <p className="text-sm text-neutral-500">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-sm text-neutral-900 font-medium mb-2">Failed to load tasks</p>
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-0 mb-4">
        {/* Left: title + priority tabs */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 pr-4 py-2">
            <h1 className="text-[20px] font-semibold text-neutral-900 leading-none">Task</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-neutral-100">
                  <MoreHorizontal className="h-3.5 w-3.5 text-neutral-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Edit board</DropdownMenuItem>
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuItem>Export</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Priority tabs */}
          {priorityTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = priorityFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setPriorityFilter(tab.value)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors",
                  isActive ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                <Icon className="h-[14px] w-[14px] shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-semibold text-red-500">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-neutral-900" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: view toggle + search + add */}
        <div className="flex items-center gap-2 py-2">
          {/* View Toggle */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              aria-label="List view"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 text-[12px] font-medium transition-colors rounded-md",
                viewMode === "list" ? "text-neutral-800" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              <List className="h-3.5 w-3.5 shrink-0" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              aria-pressed={viewMode === "kanban"}
              aria-label="Board view"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 text-[12px] font-medium transition-colors rounded-md",
                viewMode === "kanban" ? "text-neutral-800" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
              <span>Board</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 h-7 w-[160px] bg-white border-neutral-200 text-[12px] placeholder:text-neutral-400"
            />
          </div>

          <Button
            className="h-7 rounded-full bg-[#FED96A] hover:bg-[#F5CC5A] text-neutral-900 px-3 text-[12px]"
            onClick={() => setShowAddColumnDialog(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span className="font-medium">Add</span>
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200 z-10">
              <tr>
                <th className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider py-2 px-3 text-left">
                  Task
                </th>
                <th className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider py-2 px-3 text-left">
                  Status
                </th>
                <th className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider py-2 px-3 text-left">
                  Priority
                </th>
                <th className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider py-2 px-3 text-left">
                  Assignees
                </th>
                <th className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider py-2 px-3 text-left">
                  Due date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[...filteredTasks]
                .sort((a, b) => {
                  const colA = columns.findIndex((c) => c.id === a.status);
                  const colB = columns.findIndex((c) => c.id === b.status);
                  if (colA !== colB) return colA - colB;
                  return a.order - b.order;
                })
                .map((task) => {
                  const column = columns.find((c) => c.id === task.status);
                  const statusLabel = column?.title ?? task.status;
                  const priorityStyles: Record<string, string> = {
                    urgent: "bg-neutral-200 text-black border-neutral-300",
                    high: "bg-neutral-200 text-neutral-900 border-neutral-300",
                    medium: "bg-neutral-100 text-neutral-800 border-neutral-200",
                    low: "bg-neutral-100 text-neutral-700 border-neutral-200",
                  };
                  return (
                    <tr
                      key={task.id}
                      className="group hover:bg-neutral-50/80 transition-colors"
                    >
                      <td className="py-2 px-3">
                        <div>
                          <p className="text-[12px] font-medium text-neutral-900">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-neutral-500 truncate max-w-[220px] mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[11px] text-neutral-600">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 border rounded-md capitalize",
                            priorityStyles[task.priority] ??
                              "bg-neutral-50 text-neutral-600 border-neutral-200"
                          )}
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex -space-x-2">
                          {task.assignee.slice(0, 3).map((a, i) => (
                            <Avatar
                              key={a.id}
                              className="h-5 w-5 border-2 border-white"
                            >
                              {a.avatar && (
                                <AvatarImage src={a.avatar} alt={a.name} />
                              )}
                              <AvatarFallback className="text-[8px] font-medium bg-neutral-200 text-neutral-700">
                                {a.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {task.assignee.length > 3 && (
                            <span className="text-[10px] text-neutral-500 ml-1">
                              +{task.assignee.length - 3}
                            </span>
                          )}
                          {task.assignee.length === 0 && (
                            <span className="text-[11px] text-neutral-400">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 text-[11px] text-neutral-600">
                          <Calendar className="h-3 w-3 text-neutral-400 shrink-0" />
                          {task.dueDate}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[12px] text-neutral-500">No tasks match your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {columns.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              const showDropIndicator = dropIndicator?.columnId === column.id;
              return (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  status={column.id}
                  tasks={columnTasks}
                  count={columnTasks.length}
                  showComposer={inlineComposerColumn === column.id}
                  onAddTask={() => handleToggleComposer(column.id)}
                  onCloseComposer={handleCloseComposer}
                  onComposerSubmit={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onUpdateComments={handleUpdateComments}
                  dropIndicatorIndex={showDropIndicator ? dropIndicator.index : undefined}
                  currentEmployee={currentEmployee}
                  employees={employees}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-50 rotate-3 scale-105">
                <div className="bg-white rounded-lg border-2 border-blue-400 shadow-xl p-4">
                  <h3 className="font-semibold text-[15px] text-neutral-900">
                    {activeTask.title}
                  </h3>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-neutral-900">
              Edit task
            </DialogTitle>
            <DialogDescription className="text-[13px] text-neutral-500">
              Update the task details below.
            </DialogDescription>
          </DialogHeader>
          {editingTask && (
            <InlineTaskComposer
              status={editingTask.status}
              onClose={() => setEditingTask(null)}
              onSubmit={handleSaveTask}
              initialTask={editingTask}
              contentOnly
              employees={employees}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-neutral-900">
              Add New Column
            </DialogTitle>
            <DialogDescription className="text-[13px] text-neutral-500">
              Create a new status column for your kanban board
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="columnName" className="text-[13px] font-medium text-neutral-700">
                Column Name
              </Label>
              <Input
                id="columnName"
                placeholder="e.g. In Review, Testing, Blocked"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddColumn();
                  }
                }}
                className="h-10 text-[14px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddColumnDialog(false);
                setNewColumnName("");
              }}
              className="text-[14px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddColumn}
              className="bg-neutral-900 hover:bg-neutral-800 text-white text-[14px]"
            >
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
