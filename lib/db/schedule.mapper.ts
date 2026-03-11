import type {
  CreateScheduleEventInput,
  CreateScheduleEventTaskInput,
  CreateRecurrenceRuleInput,
  CreateTimeOffInput,
} from "@/lib/validation/schedule.schema";

// =============================================================================
// Database Row Types (snake_case from Supabase)
// =============================================================================

export interface ScheduleEventRow {
  id: string;
  title: string;
  client_id: string | null;
  caregiver_id: string | null;
  care_coordinator_id: string | null;
  care_type: string | null;
  status: string;
  start_at: string; // timestamptz as ISO string
  end_at: string;
  is_all_day: boolean;
  is_open_shift: boolean;
  color: string | null;
  description: string | null;
  instructions: string | null;
  pay_rate: number | null;
  pay_type: string | null;
  recurrence_rule_id: string | null;
  is_recurring_instance: boolean;
  parent_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEventTaskRow {
  id: string;
  event_id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  created_at: string;
}

export interface RecurrenceRuleRow {
  id: string;
  pattern: string;
  days_of_week: number[] | null;
  interval: number;
  end_type: string;
  end_date: string | null;
  end_count: number | null;
  created_at: string;
}

export interface ScheduleEventExceptionRow {
  id: string;
  parent_event_id: string;
  original_date: string;
  exception_type: string;
  modified_start_at: string | null;
  modified_end_at: string | null;
  modified_caregiver_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface TimeOffRow {
  id: string;
  employee_id: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  reason: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  event_id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  actor_id: string | null;
  created_at: string;
}

// =============================================================================
// API Response Types (camelCase for frontend)
// =============================================================================

export interface ScheduleEventApi {
  id: string;
  title: string;
  clientId: string | null;
  caregiverId: string | null;
  careCoordinatorId: string | null;
  careType: string | null;
  status: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  isOpenShift: boolean;
  color: string | null;
  description: string | null;
  instructions: string | null;
  payRate: number | null;
  payType: string | null;
  recurrenceRuleId: string | null;
  isRecurringInstance: boolean;
  parentEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEventTaskApi {
  id: string;
  eventId: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface RecurrenceRuleApi {
  id: string;
  pattern: string;
  daysOfWeek: number[] | null;
  interval: number;
  endType: string;
  endDate: string | null;
  endCount: number | null;
  createdAt: string;
}

export interface ScheduleEventExceptionApi {
  id: string;
  parentEventId: string;
  originalDate: string;
  exceptionType: string;
  modifiedStartAt: string | null;
  modifiedEndAt: string | null;
  modifiedCaregiverId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface TimeOffApi {
  id: string;
  employeeId: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  reason: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogApi {
  id: string;
  eventId: string;
  action: string;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  actorId: string | null;
  createdAt: string;
}

// =============================================================================
// Mappers: DB Row -> API Response
// =============================================================================

export function mapRowToEvent(row: ScheduleEventRow): ScheduleEventApi {
  return {
    id: row.id,
    title: row.title,
    clientId: row.client_id,
    caregiverId: row.caregiver_id,
    careCoordinatorId: row.care_coordinator_id,
    careType: row.care_type,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    isAllDay: row.is_all_day,
    isOpenShift: row.is_open_shift,
    color: row.color,
    description: row.description,
    instructions: row.instructions,
    payRate: row.pay_rate,
    payType: row.pay_type,
    recurrenceRuleId: row.recurrence_rule_id,
    isRecurringInstance: row.is_recurring_instance,
    parentEventId: row.parent_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToTask(row: ScheduleEventTaskRow): ScheduleEventTaskApi {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function mapRowToRecurrenceRule(row: RecurrenceRuleRow): RecurrenceRuleApi {
  return {
    id: row.id,
    pattern: row.pattern,
    daysOfWeek: row.days_of_week,
    interval: row.interval,
    endType: row.end_type,
    endDate: row.end_date,
    endCount: row.end_count,
    createdAt: row.created_at,
  };
}

export function mapRowToException(row: ScheduleEventExceptionRow): ScheduleEventExceptionApi {
  return {
    id: row.id,
    parentEventId: row.parent_event_id,
    originalDate: row.original_date,
    exceptionType: row.exception_type,
    modifiedStartAt: row.modified_start_at,
    modifiedEndAt: row.modified_end_at,
    modifiedCaregiverId: row.modified_caregiver_id,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export function mapRowToTimeOff(row: TimeOffRow): TimeOffApi {
  return {
    id: row.id,
    employeeId: row.employee_id,
    startAt: row.start_at,
    endAt: row.end_at,
    isAllDay: row.is_all_day,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToAuditLog(row: AuditLogRow): AuditLogApi {
  return {
    id: row.id,
    eventId: row.event_id,
    action: row.action,
    fieldChanged: row.field_changed,
    oldValue: row.old_value,
    newValue: row.new_value,
    actorId: row.actor_id,
    createdAt: row.created_at,
  };
}

// =============================================================================
// Mappers: Create Input -> DB Insert Row
// =============================================================================

export function mapCreateEventToRow(
  input: CreateScheduleEventInput
): Omit<ScheduleEventRow, "id" | "created_at" | "updated_at"> {
  return {
    title: input.title,
    client_id: input.clientId ?? null,
    caregiver_id: input.caregiverId ?? null,
    care_coordinator_id: input.careCoordinatorId ?? null,
    care_type: input.careType ?? null,
    status: input.status ?? "scheduled",
    start_at: typeof input.startAt === "string" ? input.startAt : (input.startAt as any).toISOString(),
    end_at: typeof input.endAt === "string" ? input.endAt : (input.endAt as any).toISOString(),
    is_all_day: input.isAllDay ?? false,
    is_open_shift: input.isOpenShift ?? false,
    color: input.color ?? null,
    description: input.description ?? null,
    instructions: input.instructions ?? null,
    pay_rate: input.payRate ?? null,
    pay_type: input.payType ?? null,
    recurrence_rule_id: input.recurrenceRuleId ?? null,
    is_recurring_instance: input.isRecurringInstance ?? false,
    parent_event_id: input.parentEventId ?? null,
  };
}

export function mapCreateTaskToRow(
  input: CreateScheduleEventTaskInput
): Omit<ScheduleEventTaskRow, "id" | "completed_at" | "completed_by" | "created_at"> {
  return {
    event_id: input.eventId,
    title: input.title,
    is_completed: input.isCompleted ?? false,
    sort_order: input.sortOrder ?? 0,
  };
}

export function mapCreateRecurrenceRuleToRow(
  input: CreateRecurrenceRuleInput
): Omit<RecurrenceRuleRow, "id" | "created_at"> {
  return {
    pattern: input.pattern,
    days_of_week: input.daysOfWeek ?? null,
    interval: input.interval ?? 1,
    end_type: input.endType ?? "never",
    end_date: input.endDate ?? null,
    end_count: input.endCount ?? null,
  };
}

export function mapCreateTimeOffToRow(
  input: CreateTimeOffInput
): Omit<TimeOffRow, "id" | "created_at" | "updated_at"> {
  return {
    employee_id: input.employeeId,
    start_at: typeof input.startAt === "string" ? input.startAt : (input.startAt as any).toISOString(),
    end_at: typeof input.endAt === "string" ? input.endAt : (input.endAt as any).toISOString(),
    is_all_day: input.isAllDay ?? true,
    reason: input.reason ?? null,
    status: input.status ?? "pending",
  };
}

// =============================================================================
// Mappers: Update Input -> DB Partial Update
// =============================================================================

export function mapUpdateEventToRow(
  input: Partial<CreateScheduleEventInput>
): Partial<ScheduleEventRow> {
  const result: Partial<ScheduleEventRow> = {};

  if (input.title !== undefined) result.title = input.title;
  if (input.clientId !== undefined) result.client_id = input.clientId ?? null;
  if (input.caregiverId !== undefined) result.caregiver_id = input.caregiverId ?? null;
  if (input.careCoordinatorId !== undefined) result.care_coordinator_id = input.careCoordinatorId ?? null;
  if (input.careType !== undefined) result.care_type = input.careType ?? null;
  if (input.status !== undefined) result.status = input.status;
  if (input.startAt !== undefined) {
    result.start_at = typeof input.startAt === "string" ? input.startAt : (input.startAt as any).toISOString();
  }
  if (input.endAt !== undefined) {
    result.end_at = typeof input.endAt === "string" ? input.endAt : (input.endAt as any).toISOString();
  }
  if (input.isAllDay !== undefined) result.is_all_day = input.isAllDay;
  if (input.isOpenShift !== undefined) result.is_open_shift = input.isOpenShift;
  if (input.color !== undefined) result.color = input.color ?? null;
  if (input.description !== undefined) result.description = input.description ?? null;
  if (input.instructions !== undefined) result.instructions = input.instructions ?? null;
  if (input.payRate !== undefined) result.pay_rate = input.payRate ?? null;
  if (input.payType !== undefined) result.pay_type = input.payType ?? null;
  if (input.recurrenceRuleId !== undefined) result.recurrence_rule_id = input.recurrenceRuleId ?? null;

  return result;
}

export function mapUpdateTimeOffToRow(
  input: Partial<CreateTimeOffInput>
): Partial<TimeOffRow> {
  const result: Partial<TimeOffRow> = {};

  if (input.startAt !== undefined) {
    result.start_at = typeof input.startAt === "string" ? input.startAt : (input.startAt as any).toISOString();
  }
  if (input.endAt !== undefined) {
    result.end_at = typeof input.endAt === "string" ? input.endAt : (input.endAt as any).toISOString();
  }
  if (input.isAllDay !== undefined) result.is_all_day = input.isAllDay;
  if (input.reason !== undefined) result.reason = input.reason ?? null;
  if (input.status !== undefined) result.status = input.status;

  return result;
}
