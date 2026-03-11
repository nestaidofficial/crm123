/**
 * Activity Logger
 * Helper functions to log activities to the activity_log table
 * These activities appear in the dashboard's Recent Activity feed
 */

import { apiFetch } from "@/lib/api-fetch";

export type ActivityType =
  | "care_note"
  | "schedule"
  | "client"
  | "employee"
  | "visit"
  | "alert"
  | "task"
  | "document"
  | "billing"
  | "compliance";

export type ActivityStatus = "completed" | "pending" | "urgent" | "info";

interface LogActivityParams {
  type: ActivityType;
  title: string;
  description: string;
  actorName: string;
  status?: ActivityStatus;
  clientId?: string;
  employeeId?: string;
  scheduleEventId?: string;
  evvVisitId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the activity_log table
 * This will appear in the dashboard's Recent Activity feed
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await apiFetch("/api/dashboard/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: params.type,
        title: params.title,
        description: params.description,
        actor_name: params.actorName,
        status: params.status ?? "info",
        client_id: params.clientId,
        employee_id: params.employeeId,
        schedule_event_id: params.scheduleEventId,
        evv_visit_id: params.evvVisitId,
        metadata: params.metadata ?? {},
      }),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

/**
 * Convenience functions for common activity types
 */

export async function logClientActivity(
  action: "created" | "updated" | "deleted",
  clientName: string,
  actorName: string,
  clientId?: string
) {
  const titles = {
    created: "New client registered",
    updated: "Client profile updated",
    deleted: "Client removed",
  };

  const descriptions = {
    created: `${clientName} added to system`,
    updated: `${clientName} profile information updated`,
    deleted: `${clientName} removed from system`,
  };

  await logActivity({
    type: "client",
    title: titles[action],
    description: descriptions[action],
    actorName,
    status: action === "created" ? "pending" : "completed",
    clientId,
  });
}

export async function logEmployeeActivity(
  action: "created" | "updated" | "deleted",
  employeeName: string,
  actorName: string,
  employeeId?: string
) {
  const titles = {
    created: "New employee added",
    updated: "Employee profile updated",
    deleted: "Employee removed",
  };

  const descriptions = {
    created: `${employeeName} joined the team`,
    updated: `${employeeName} profile information updated`,
    deleted: `${employeeName} removed from system`,
  };

  await logActivity({
    type: "employee",
    title: titles[action],
    description: descriptions[action],
    actorName,
    status: "completed",
    employeeId,
  });
}

export async function logScheduleActivity(
  action: "created" | "updated" | "deleted" | "assigned",
  description: string,
  actorName: string,
  scheduleEventId?: string
) {
  const titles = {
    created: "Schedule created",
    updated: "Schedule updated",
    deleted: "Schedule deleted",
    assigned: "Schedule assigned",
  };

  await logActivity({
    type: "schedule",
    title: titles[action],
    description,
    actorName,
    status: "completed",
    scheduleEventId,
  });
}

export async function logVisitActivity(
  action: "completed" | "started" | "cancelled" | "no_show",
  description: string,
  actorName: string,
  evvVisitId?: string
) {
  const titles = {
    completed: "Visit completed",
    started: "Visit started",
    cancelled: "Visit cancelled",
    no_show: "Visit no-show",
  };

  const statuses: Record<typeof action, ActivityStatus> = {
    completed: "completed",
    started: "info",
    cancelled: "urgent",
    no_show: "urgent",
  };

  await logActivity({
    type: "visit",
    title: titles[action],
    description,
    actorName,
    status: statuses[action],
    evvVisitId,
  });
}

export async function logCareNoteActivity(
  clientName: string,
  actorName: string,
  evvVisitId?: string
) {
  await logActivity({
    type: "care_note",
    title: "Care note completed",
    description: `Visit notes for ${clientName}`,
    actorName,
    status: "completed",
    evvVisitId,
  });
}

export async function logComplianceAlert(
  description: string,
  actorName: string = "System",
  employeeId?: string
) {
  await logActivity({
    type: "alert",
    title: "Compliance alert",
    description,
    actorName,
    status: "urgent",
    employeeId,
  });
}

export async function logTaskActivity(
  action: "created" | "completed" | "updated",
  description: string,
  actorName: string
) {
  const titles = {
    created: "Task created",
    completed: "Task completed",
    updated: "Task updated",
  };

  await logActivity({
    type: "task",
    title: titles[action],
    description,
    actorName,
    status: action === "completed" ? "completed" : "pending",
  });
}

export async function logDocumentActivity(
  action: "uploaded" | "deleted",
  documentName: string,
  entityName: string,
  actorName: string,
  clientId?: string,
  employeeId?: string
) {
  const titles = {
    uploaded: "Document uploaded",
    deleted: "Document removed",
  };

  await logActivity({
    type: "document",
    title: titles[action],
    description: `${documentName} ${action === "uploaded" ? "uploaded for" : "removed from"} ${entityName}`,
    actorName,
    status: "completed",
    clientId,
    employeeId,
  });
}

export async function logBillingActivity(
  action: "invoice_created" | "invoice_sent" | "payment_received",
  description: string,
  actorName: string,
  clientId?: string
) {
  const titles = {
    invoice_created: "Invoice created",
    invoice_sent: "Invoice sent",
    payment_received: "Payment received",
  };

  await logActivity({
    type: "billing",
    title: titles[action],
    description,
    actorName,
    status: action === "payment_received" ? "completed" : "info",
    clientId,
  });
}
