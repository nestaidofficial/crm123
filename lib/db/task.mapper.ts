import {
  KanbanTask,
  KanbanColumn,
  Comment,
  CommentReply,
  Employee,
  KanbanPriority,
  KanbanDomain,
} from "@/lib/tasks/nessaKanbanMock";

// =====================================================
// DATABASE ROW TYPES
// =====================================================

export interface KanbanColumnRow {
  id: string;
  agency_id: string;
  slug: string;
  title: string;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanTaskRow {
  id: string;
  agency_id: string;
  column_id: string;
  title: string;
  description: string;
  priority: string;
  entity_type: string;
  due_date: string | null;
  links: string[];
  tags: any;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanTaskAssigneeRow {
  task_id: string;
  employee_id: string;
  assigned_at: string;
}

export interface KanbanTaskCommentRow {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface KanbanCommentLikeRow {
  comment_id: string;
  employee_id: string;
  created_at: string;
}

export interface KanbanCommentReplyRow {
  id: string;
  comment_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface KanbanReplyLikeRow {
  reply_id: string;
  employee_id: string;
  created_at: string;
}

export interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
}

// =====================================================
// API SHAPE TYPES (for create/update operations)
// =====================================================

export interface CreateKanbanColumnInput {
  slug: string;
  title: string;
  color?: string;
  position?: number;
}

export interface CreateKanbanTaskInput {
  columnId: string;
  title: string;
  description?: string;
  priority: KanbanPriority;
  entityType: KanbanDomain;
  dueDate?: string;
  links?: string[];
  tags?: Array<{ name: string; color: "purple" | "cyan" | "green" }>;
  assigneeIds: string[];
}

export interface UpdateKanbanTaskInput {
  columnId?: string;
  title?: string;
  description?: string;
  priority?: KanbanPriority;
  entityType?: KanbanDomain;
  dueDate?: string;
  links?: string[];
  tags?: Array<{ name: string; color: "purple" | "cyan" | "green" }>;
  sortOrder?: number;
}

export interface ReorderTasksInput {
  taskId: string;
  columnId: string;
  sortOrder: number;
}

export interface CreateCommentInput {
  taskId: string;
  content: string;
}

export interface CreateReplyInput {
  commentId: string;
  content: string;
}

// =====================================================
// MAPPERS: ROW -> API
// =====================================================

export function mapEmployeeRowToEmployee(row: EmployeeRow): Employee {
  const initials = `${row.first_name.charAt(0)}${row.last_name.charAt(0)}`.toUpperCase();
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    initials,
    avatar: row.avatar_url || undefined,
    email: row.email || undefined,
    role: row.role || undefined,
  };
}

export function mapColumnRowToColumn(row: KanbanColumnRow): KanbanColumn {
  return {
    id: row.id,
    title: row.title,
    color: row.color || undefined,
    slug: row.slug,
  };
}

export function mapTaskRowToTask(
  row: KanbanTaskRow,
  assignees: Employee[],
  commentCount: number = 0
): KanbanTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.column_id,
    priority: row.priority as KanbanPriority,
    entityType: row.entity_type as KanbanDomain,
    assignee: assignees,
    dueDate: row.due_date || "No due date",
    links: row.links.length > 0 ? row.links : undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    order: row.sort_order,
    comments: [], // Comments are loaded separately on demand
  };
}

export function mapCommentRowToComment(
  row: KanbanTaskCommentRow,
  author: Employee,
  likes: string[],
  replies: CommentReply[]
): Comment {
  return {
    id: row.id,
    author,
    content: row.content,
    timestamp: row.created_at,
    likes,
    replies,
  };
}

export function mapReplyRowToReply(
  row: KanbanCommentReplyRow,
  author: Employee,
  likes: string[]
): CommentReply {
  return {
    id: row.id,
    author,
    content: row.content,
    timestamp: row.created_at,
    likes,
  };
}

// =====================================================
// MAPPERS: API -> ROW (for inserts/updates)
// =====================================================

export function mapCreateColumnToRow(
  input: CreateKanbanColumnInput,
  agencyId: string
): Partial<KanbanColumnRow> {
  return {
    agency_id: agencyId,
    slug: input.slug,
    title: input.title,
    color: input.color || null,
    position: input.position ?? 999,
  };
}

export function mapCreateTaskToRow(
  input: CreateKanbanTaskInput,
  agencyId: string,
  createdBy: string | null
): Partial<KanbanTaskRow> {
  return {
    agency_id: agencyId,
    column_id: input.columnId,
    title: input.title,
    description: input.description || "",
    priority: input.priority,
    entity_type: input.entityType,
    due_date: input.dueDate || null,
    links: input.links || [],
    tags: input.tags || [],
    sort_order: 0, // Will be set by the API based on column
    created_by: createdBy,
  };
}

export function mapUpdateTaskToRow(
  input: UpdateKanbanTaskInput
): Partial<KanbanTaskRow> {
  const row: Partial<KanbanTaskRow> = {};

  if (input.columnId !== undefined) row.column_id = input.columnId;
  if (input.title !== undefined) row.title = input.title;
  if (input.description !== undefined) row.description = input.description;
  if (input.priority !== undefined) row.priority = input.priority;
  if (input.entityType !== undefined) row.entity_type = input.entityType;
  if (input.dueDate !== undefined) row.due_date = input.dueDate || null;
  if (input.links !== undefined) row.links = input.links;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;

  return row;
}

export function mapCreateCommentToRow(
  input: CreateCommentInput,
  authorId: string
): Partial<KanbanTaskCommentRow> {
  return {
    task_id: input.taskId,
    author_id: authorId,
    content: input.content,
  };
}

export function mapCreateReplyToRow(
  input: CreateReplyInput,
  authorId: string
): Partial<KanbanCommentReplyRow> {
  return {
    comment_id: input.commentId,
    author_id: authorId,
    content: input.content,
  };
}
