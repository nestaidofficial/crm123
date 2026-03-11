export interface Task {
  id: string;
  title: string;
  category: string;
  description: string;
  dueDate: string;
  tags: { name: string; color: "purple" | "cyan" | "green" }[];
  assignees: { name: string; initials: string; avatar?: string }[];
  status: "todo" | "in_progress" | "done";
}

export const mockTasks: Task[] = [
  {
    id: "1",
    title: "Email Campaign Setup",
    category: "Opportunities",
    description: "Email Campaign Setup",
    dueDate: "23 March 2024",
    tags: [{ name: "Marketing", color: "purple" }],
    assignees: [{ name: "Sarah Johnson", initials: "SJ" }],
    status: "todo",
  },
  {
    id: "2",
    title: "Pipeline Review",
    category: "Opportunities",
    description: "Email Campaign Setup",
    dueDate: "23 March 2024",
    tags: [{ name: "Sales-Oriented", color: "cyan" }],
    assignees: [
      { name: "Mike Chen", initials: "MC" },
      { name: "Emily Davis", initials: "ED" },
    ],
    status: "todo",
  },
  {
    id: "3",
    title: "Update Lead Status",
    category: "Opportunities",
    description: "Email Campaign Setup",
    dueDate: "23 March 2024",
    tags: [{ name: "General", color: "green" }],
    assignees: [
      { name: "Alex Kumar", initials: "AK" },
      { name: "Lisa Wong", initials: "LW" },
    ],
    status: "todo",
  },
  {
    id: "4",
    title: "Survey Distribution",
    category: "Opportunities",
    description: "Email Campaign Setup",
    dueDate: "23 March 2024",
    tags: [{ name: "Marketing", color: "purple" }],
    assignees: [{ name: "James Park", initials: "JP" }],
    status: "in_progress",
  },
  {
    id: "5",
    title: "Deal Negotiation",
    category: "Opportunities",
    description: "Email Campaign Setup",
    dueDate: "23 March 2024",
    tags: [{ name: "Sales-Oriented", color: "cyan" }],
    assignees: [
      { name: "Rachel Green", initials: "RG" },
      { name: "Tom Brady", initials: "TB" },
      { name: "Nina Patel", initials: "NP" },
    ],
    status: "done",
  },
  {
    id: "6",
    title: "Renewal Reminder",
    category: "Opportunities",
    description: "Email Campaign Setup",
    dueDate: "23 March 2024",
    tags: [{ name: "General", color: "green" }],
    assignees: [
      { name: "David Miller", initials: "DM" },
      { name: "Sophie Turner", initials: "ST" },
    ],
    status: "done",
  },
];
