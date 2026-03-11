"use client";

import {
  KanbanTask,
  KanbanStatus,
  KanbanPriority,
  KanbanDomain,
  Employee,
  Comment,
} from "@/lib/tasks/nessaKanbanMock";
import { TaskCard } from "./task-card";
import { InlineTaskComposer } from "./inline-task-composer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface KanbanColumnProps {
  id: string;
  title: string;
  status: string;
  tasks: KanbanTask[];
  count: number;
  showComposer?: boolean;
  onAddTask?: () => void;
  onCloseComposer?: () => void;
  onComposerSubmit?: (data: {
    title: string;
    description: string;
    priority: KanbanPriority;
    domain: KanbanDomain;
    assignees: Employee[];
    dueDate: string;
    status: KanbanStatus;
  }) => void;
  onEditTask?: (task: KanbanTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onUpdateComments?: (taskId: string, comments: Comment[]) => void;
  dropIndicatorIndex?: number;
  currentEmployee?: Employee | null;
  employees?: Employee[];
}

const getStatusStyle = (status: string) => {
  const statusMap: Record<string, { badge: string; bullet: string; label: string; bg: string }> = {
    todo: {
      badge: "bg-transparent text-neutral-800 border-transparent",
      bullet: "bg-[#c4a574]",
      label: "To-do",
      bg: "bg-[#F5F6FA]",
    },
    in_progress: {
      badge: "bg-transparent text-neutral-800 border-transparent",
      bullet: "bg-[#5eb8d4]",
      label: "In Progress",
      bg: "bg-[#F5F6FA]",
    },
    done: {
      badge: "bg-transparent text-neutral-800 border-transparent",
      bullet: "bg-[#9b87e8]",
      label: "Done",
      bg: "bg-[#F5F6FA]",
    },
    empty: {
      badge: "bg-transparent text-neutral-600 border-transparent",
      bullet: "bg-transparent",
      label: "",
      bg: "bg-[#F5F6FA]",
    },
  };

  return statusMap[status] || {
    badge: "bg-transparent text-neutral-700 border-transparent",
    bullet: "bg-neutral-400",
    label: status,
    bg: "bg-[#F5F6FA]",
  };
};

export function KanbanColumn({
  id,
  title,
  status,
  tasks,
  count,
  showComposer = false,
  onAddTask,
  onCloseComposer,
  onComposerSubmit,
  onEditTask,
  onDeleteTask,
  onUpdateComments,
  dropIndicatorIndex,
  currentEmployee,
  employees = [],
}: KanbanColumnProps) {
  const style = getStatusStyle(status);
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  const taskIds = tasks.map((task) => task.id);
  const isComposerColumn = showComposer && status !== "empty";

  return (
    <div className={cn(
      "flex flex-col h-full min-w-[260px] w-full rounded-xl px-4 py-2.5 transition-colors",
      style.bg
    )}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-md text-[12px] font-medium border",
              style.badge
            )}
          >
            {style.bullet !== "bg-transparent" && (
              <span className={cn("rounded-full w-2 h-2 shrink-0", style.bullet)} aria-hidden />
            )}
            {title || style.label}
          </span>
          {count > 0 && (
            <span className="text-[12px] text-neutral-400 font-normal">{count}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {status !== "empty" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-white/60"
              onClick={onAddTask}
              aria-label="Add task to this column"
            >
              <Plus className="h-3.5 w-3.5 text-neutral-500" />
            </Button>
          )}
          {status !== "empty" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/60">
                  <MoreHorizontal className="h-3.5 w-3.5 text-neutral-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Clear completed</DropdownMenuItem>
                <DropdownMenuItem>Archive all</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Inline composer: only one column shows it, above the task list */}
      {isComposerColumn && onCloseComposer && onComposerSubmit && (
        <InlineTaskComposer
          status={status as KanbanStatus}
          onClose={onCloseComposer}
          onSubmit={onComposerSubmit}
          employees={employees}
        />
      )}

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-hide transition-colors rounded-lg",
            isOver && "ring-2 ring-blue-400/50"
          )}
        >
          {tasks.length > 0 ? (
            <>
              {tasks.map((task, index) => (
                <div key={task.id}>
                  {/* Drop indicator before this task */}
                  {dropIndicatorIndex === index && (
                    <div className="h-1 bg-black rounded-full mb-3 mx-2 shadow-lg shadow-black/20" />
                  )}
                  <TaskCard
                    task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onUpdateComments={onUpdateComments}
                  currentEmployee={currentEmployee}
                />
                </div>
              ))}
              {/* Drop indicator after all tasks */}
              {dropIndicatorIndex === tasks.length && (
                <div className="h-1 bg-black rounded-full mt-3 mx-2 shadow-lg shadow-black/20" />
              )}
            </>
          ) : (
            <>
              {/* Drop indicator for empty column */}
              {dropIndicatorIndex === 0 && (
                <div className="h-1 bg-black rounded-full mb-3 mx-2 shadow-lg shadow-black/20" />
              )}
              <div className="flex items-center justify-center h-28 border-2 border-dashed border-neutral-200/60 rounded-lg bg-white/40">
                <p className="text-[12px] text-neutral-400">
                  {isOver ? "Drop here" : "No tasks"}
                </p>
              </div>
            </>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
