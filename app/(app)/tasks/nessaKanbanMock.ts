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
  color?: string; // Optional color for custom columns
}

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "todo", slug: "todo", title: "To-do", color: "blue" },
  { id: "in_progress", slug: "in_progress", title: "In Progress", color: "orange" },
  { id: "done", slug: "done", title: "Done", color: "green" },
];

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

export const NESSSA_EMPLOYEE_MOCK: Employee[] = [
  { id: "emp_1", name: "Sarah Johnson", initials: "SJ", email: "sarah.j@nessa.com", role: "Marketing Manager", avatar: "/avatars/employees/employee-2.png" },
  { id: "emp_2", name: "Mike Chen", initials: "MC", email: "mike.c@nessa.com", role: "Sales Lead", avatar: "/avatars/employees/employee-1.png" },
  { id: "emp_3", name: "Emily Davis", initials: "ED", email: "emily.d@nessa.com", role: "Sales Associate" },
  { id: "emp_4", name: "Alex Kumar", initials: "AK", email: "alex.k@nessa.com", role: "Account Manager" },
  { id: "emp_5", name: "Lisa Wong", initials: "LW", email: "lisa.w@nessa.com", role: "Business Development" },
  { id: "emp_6", name: "James Park", initials: "JP", email: "james.p@nessa.com", role: "Client Coordinator" },
  { id: "emp_7", name: "Rachel Green", initials: "RG", email: "rachel.g@nessa.com", role: "HR Manager" },
  { id: "emp_8", name: "Tom Brady", initials: "TB", email: "tom.b@nessa.com", role: "Senior Sales" },
  { id: "emp_9", name: "Nina Patel", initials: "NP", email: "nina.p@nessa.com", role: "Contract Specialist" },
  { id: "emp_10", name: "David Miller", initials: "DM", email: "david.m@nessa.com", role: "HR Coordinator" },
  { id: "emp_11", name: "Sophie Turner", initials: "ST", email: "sophie.t@nessa.com", role: "Client Success" },
  { id: "emp_12", name: "Jake Wilson", initials: "JW", email: "jake.w@nessa.com", role: "Account Executive" },
  { id: "emp_13", name: "Maria Garcia", initials: "MG", email: "maria.g@nessa.com", role: "Analytics Manager" },
  { id: "emp_14", name: "Kevin Lee", initials: "KL", email: "kevin.l@nessa.com", role: "Compliance Officer" },
  { id: "emp_15", name: "Amanda Chen", initials: "AC", email: "amanda.c@nessa.com", role: "Records Manager" },
];

export const NESSSA_KANBAN_MOCK_TASKS: KanbanTask[] = [
  {
    id: "tsk_1",
    title: "Email Campaign Setup",
    description: "Set up automated email campaign for new client onboarding process",
    status: "todo",
    priority: "high",
    entityType: "Opportunities",
    assignee: [NESSSA_EMPLOYEE_MOCK[0]], // Sarah Johnson
    dueDate: "March 23, 2024",
    tags: [{ name: "Marketing", color: "purple" }],
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: "2024-03-15T10:00:00Z",
    order: 0,
    comments: [
      {
        id: "cmt_1",
        author: NESSSA_EMPLOYEE_MOCK[1], // Mike Chen
        content: "Great idea! I'll coordinate with the design team for the email templates.",
        timestamp: "2024-03-15T11:30:00Z",
        likes: [NESSSA_EMPLOYEE_MOCK[0].id, NESSSA_EMPLOYEE_MOCK[2].id],
        replies: [
          {
            id: "rpl_1",
            author: NESSSA_EMPLOYEE_MOCK[0], // Sarah Johnson
            content: "Thanks Mike! Let me know if you need any copy suggestions.",
            timestamp: "2024-03-15T12:00:00Z",
            likes: [NESSSA_EMPLOYEE_MOCK[1].id],
          },
        ],
      },
      {
        id: "cmt_2",
        author: NESSSA_EMPLOYEE_MOCK[3], // Alex Kumar
        content: "Should we include client testimonials in this campaign?",
        timestamp: "2024-03-15T14:20:00Z",
        likes: [NESSSA_EMPLOYEE_MOCK[0].id],
        replies: [],
      },
      {
        id: "cmt_3",
        author: NESSSA_EMPLOYEE_MOCK[2], // Emily Davis
        content: "I can help with the analytics tracking setup.",
        timestamp: "2024-03-16T09:15:00Z",
        likes: [],
        replies: [],
      },
    ],
  },
  {
    id: "tsk_2",
    title: "Pipeline Review",
    description: "Review Q1 sales pipeline and identify high-priority opportunities",
    status: "todo",
    priority: "high",
    entityType: "Opportunities",
    assignee: [NESSSA_EMPLOYEE_MOCK[1], NESSSA_EMPLOYEE_MOCK[2]], // Mike Chen, Emily Davis
    dueDate: "March 25, 2024",
    tags: [{ name: "Sales-Oriented", color: "cyan" }],
    createdAt: "2024-03-14T09:30:00Z",
    updatedAt: "2024-03-14T09:30:00Z",
    order: 1,
    comments: [
      {
        id: "cmt_4",
        author: NESSSA_EMPLOYEE_MOCK[2], // Emily Davis
        content: "I've prepared the preliminary analysis. Top 3 opportunities look very promising!",
        timestamp: "2024-03-14T10:15:00Z",
        likes: [NESSSA_EMPLOYEE_MOCK[1].id],
        replies: [],
      },
    ],
  },
  {
    id: "tsk_3",
    title: "Update Lead Status",
    description: "Update status for all leads contacted this week and follow up where needed",
    status: "todo",
    priority: "medium",
    entityType: "Opportunities",
    assignee: [NESSSA_EMPLOYEE_MOCK[3], NESSSA_EMPLOYEE_MOCK[4]], // Alex Kumar, Lisa Wong
    dueDate: "March 26, 2024",
    tags: [{ name: "General", color: "green" }],
    createdAt: "2024-03-13T14:20:00Z",
    updatedAt: "2024-03-13T14:20:00Z",
    order: 2,
  },
  {
    id: "tsk_4",
title: "Client Satisfaction Survey",
      description: "Distribute quarterly client satisfaction survey and analyze results",
    status: "todo",
    priority: "low",
    entityType: "Clients",
    assignee: [NESSSA_EMPLOYEE_MOCK[5]], // James Park
    dueDate: "March 28, 2024",
    tags: [{ name: "General", color: "green" }],
    createdAt: "2024-03-12T11:00:00Z",
    updatedAt: "2024-03-12T11:00:00Z",
    order: 3,
  },
  {
    id: "tsk_5",
    title: "Survey Distribution",
    description: "Send out employee engagement survey to all departments",
    status: "in_progress",
    priority: "medium",
    entityType: "HR",
    assignee: [NESSSA_EMPLOYEE_MOCK[6]], // Rachel Green
    dueDate: "March 24, 2024",
    tags: [{ name: "Marketing", color: "purple" }],
    createdAt: "2024-03-10T08:45:00Z",
    updatedAt: "2024-03-16T15:30:00Z",
    order: 0,
  },
  {
    id: "tsk_6",
    title: "Deal Negotiation",
    description: "Finalize contract terms with potential new client partnership",
    status: "in_progress",
    priority: "urgent",
    entityType: "Opportunities",
    assignee: [NESSSA_EMPLOYEE_MOCK[7], NESSSA_EMPLOYEE_MOCK[8]], // Tom Brady, Nina Patel
    dueDate: "March 22, 2024",
    tags: [{ name: "Sales-Oriented", color: "cyan" }],
    createdAt: "2024-03-08T16:00:00Z",
    updatedAt: "2024-03-17T10:15:00Z",
    order: 1,
    comments: [
      {
        id: "cmt_5",
        author: NESSSA_EMPLOYEE_MOCK[7], // Tom Brady
        content: "Client is requesting a 10% discount. Thoughts?",
        timestamp: "2024-03-17T11:00:00Z",
        likes: [],
        replies: [
          {
            id: "rpl_2",
            author: NESSSA_EMPLOYEE_MOCK[8], // Nina Patel
            content: "We can offer 7% if they commit to a 2-year contract.",
            timestamp: "2024-03-17T11:30:00Z",
            likes: [NESSSA_EMPLOYEE_MOCK[7].id],
          },
        ],
      },
      {
        id: "cmt_6",
        author: NESSSA_EMPLOYEE_MOCK[3], // Alex Kumar
        content: "Keep me posted! This is a major opportunity for us.",
        timestamp: "2024-03-17T14:00:00Z",
        likes: [NESSSA_EMPLOYEE_MOCK[7].id, NESSSA_EMPLOYEE_MOCK[8].id],
        replies: [],
      },
    ],
  },
  {
    id: "tsk_7",
    title: "Onboarding Documentation",
    description: "Update employee onboarding materials with new company policies",
    status: "in_progress",
    priority: "medium",
    entityType: "HR",
    assignee: [NESSSA_EMPLOYEE_MOCK[9]], // David Miller
    dueDate: "March 27, 2024",
    tags: [{ name: "General", color: "green" }],
    createdAt: "2024-03-11T13:30:00Z",
    updatedAt: "2024-03-16T09:00:00Z",
    order: 2,
  },
  {
    id: "tsk_8",
    title: "Renewal Reminder",
    description: "Send renewal reminders to clients with expiring contracts",
    status: "done",
    priority: "high",
    entityType: "Opportunities",
    assignee: [NESSSA_EMPLOYEE_MOCK[10], NESSSA_EMPLOYEE_MOCK[11]], // Sophie Turner, Jake Wilson
    dueDate: "March 20, 2024",
    tags: [{ name: "Sales-Oriented", color: "cyan" }],
    createdAt: "2024-03-05T10:00:00Z",
    updatedAt: "2024-03-18T14:45:00Z",
    order: 0,
  },
  {
    id: "tsk_9",
    title: "Monthly Report Generation",
    description: "Generate and distribute monthly performance reports to stakeholders",
    status: "done",
    priority: "medium",
    entityType: "General",
    assignee: [NESSSA_EMPLOYEE_MOCK[12]], // Maria Garcia
    dueDate: "March 19, 2024",
    tags: [{ name: "General", color: "green" }],
    createdAt: "2024-03-01T09:00:00Z",
    updatedAt: "2024-03-18T11:20:00Z",
    order: 1,
  },
  {
    id: "tsk_10",
title: "Client Records Audit",
      description: "Complete quarterly audit of client records for compliance",
    status: "done",
    priority: "urgent",
    entityType: "Clients",
    assignee: [NESSSA_EMPLOYEE_MOCK[13], NESSSA_EMPLOYEE_MOCK[14]], // Kevin Lee, Amanda Chen
    dueDate: "March 18, 2024",
    tags: [{ name: "General", color: "green" }],
    createdAt: "2024-03-01T08:30:00Z",
    updatedAt: "2024-03-17T16:00:00Z",
    order: 2,
  },
];
