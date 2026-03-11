// Type definitions
export type KanbanStatus = string; // Changed to string to support custom columns
export type KanbanPriority = "low" | "medium" | "high" | "urgent";
export type KanbanDomain =
  | "Opportunities"
  | "Clients"
  | "HR"
  | "General"
  | "marketing"
  | "referral_program"
  | "client_communication"
  | "seo_optimization";

export interface Employee {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  email?: string;
  role?: string;
}

export interface CommentReply {
  id: string;
  author: Employee;
  content: string;
  timestamp: string;
  likes: string[]; // Array of employee IDs who liked this reply
}

export interface Comment {
  id: string;
  author: Employee;
  content: string;
  timestamp: string;
  likes: string[]; // Array of employee IDs who liked this comment
  replies: CommentReply[];
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: KanbanStatus;
  priority: KanbanPriority;
  entityType: KanbanDomain;
  assignee: Employee[];
  dueDate: string;
  links?: string[];
  tags: { name: string; color: "purple" | "cyan" | "green" }[];
  createdAt: string;
  updatedAt: string;
  order: number;
  comments?: Comment[];
}

export interface KanbanColumn {
  id: string;
  slug: string;
  title: string;
  color?: string;
}

// Static domain options (not mock data)
export const KANBAN_DOMAIN_OPTIONS: { value: KanbanDomain; label: string }[] = [
  { value: "Opportunities", label: "Opportunities" },
  { value: "Clients", label: "Clients" },
  { value: "HR", label: "HR" },
  { value: "General", label: "General" },
  { value: "marketing", label: "Marketing" },
  { value: "referral_program", label: "Referral program" },
  { value: "client_communication", label: "Client communication" },
  { value: "seo_optimization", label: "SEO optimization" },
];

// Mock data removed — the tasks page now uses real-time Supabase data via useKanbanData hook.
// See: lib/hooks/useKanbanData.ts
// See: supabase/migrations/036_create_kanban_tables.sql
