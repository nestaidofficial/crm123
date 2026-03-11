import { z } from "zod";

// =====================================================
// KANBAN COLUMN SCHEMAS
// =====================================================

export const CreateKanbanColumnSchema = z.object({
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9_]+$/, "Slug must be lowercase alphanumeric with underscores"),
  title: z.string().min(1, "Title is required"),
  color: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

// =====================================================
// KANBAN TASK SCHEMAS
// =====================================================

export const CreateKanbanTaskSchema = z.object({
  columnId: z.string().uuid("Invalid column ID"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    errorMap: () => ({ message: "Priority must be low, medium, high, or urgent" }),
  }),
  entityType: z.string().min(1, "Entity type is required"),
  dueDate: z.string().optional(),
  links: z.array(z.string().url("Invalid URL")).optional(),
  tags: z.array(
    z.object({
      name: z.string(),
      color: z.enum(["purple", "cyan", "green"]),
    })
  ).optional(),
  assigneeIds: z.array(z.string().uuid("Invalid assignee ID")),
});

export const UpdateKanbanTaskSchema = z.object({
  columnId: z.string().uuid("Invalid column ID").optional(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  entityType: z.string().min(1, "Entity type is required").optional(),
  dueDate: z.string().optional(),
  links: z.array(z.string().url("Invalid URL")).optional(),
  tags: z.array(
    z.object({
      name: z.string(),
      color: z.enum(["purple", "cyan", "green"]),
    })
  ).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const ReorderTasksSchema = z.object({
  updates: z.array(
    z.object({
      taskId: z.string().uuid("Invalid task ID"),
      columnId: z.string().uuid("Invalid column ID"),
      sortOrder: z.number().int().min(0),
    })
  ),
});

// =====================================================
// COMMENT SCHEMAS
// =====================================================

export const CreateCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required"),
});

export const CreateReplySchema = z.object({
  content: z.string().min(1, "Reply content is required"),
});

// =====================================================
// ASSIGNEE SCHEMAS
// =====================================================

export const UpdateTaskAssigneesSchema = z.object({
  assigneeIds: z.array(z.string().uuid("Invalid assignee ID")),
});
