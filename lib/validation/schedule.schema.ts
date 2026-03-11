import { z } from "zod";

// --- Enums ---

export const careTypeEnum = z.enum([
  "personal_care",
  "companion_care",
  "skilled_nursing",
  "respite_care",
  "live_in",
  "other",
]);

export const eventStatusEnum = z.enum([
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export const payTypeEnum = z.enum(["hourly", "salary", "per-visit"]);

export const recurrencePatternEnum = z.enum([
  "daily",
  "weekly",
  "biweekly",
  "monthly",
]);

export const recurrenceEndTypeEnum = z.enum(["never", "date", "count"]);

export const exceptionTypeEnum = z.enum(["modified", "cancelled"]);

export const timeOffStatusEnum = z.enum(["pending", "approved", "denied"]);

// --- Shared Schemas ---

const timestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, "Must be ISO 8601 timestamp")
  .or(z.date().transform((d) => d.toISOString()));

const uuidSchema = z.string().uuid("Invalid UUID");

// --- Recurrence Rule Schemas ---

export const CreateRecurrenceRuleSchema = z.object({
  pattern: recurrencePatternEnum,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), // 0=Sun, 6=Sat
  interval: z.number().int().positive().default(1),
  endType: recurrenceEndTypeEnum.default("never"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional(),
  endCount: z.number().int().positive().optional(),
});

export type CreateRecurrenceRuleInput = z.infer<typeof CreateRecurrenceRuleSchema>;

// --- Schedule Event Schemas ---

export const CreateScheduleEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  clientId: uuidSchema.optional().nullable(),
  caregiverId: uuidSchema.optional().nullable(),
  careCoordinatorId: uuidSchema.optional().nullable(),
  careType: careTypeEnum.optional().nullable(),
  status: eventStatusEnum.default("scheduled"),
  startAt: timestampSchema,
  endAt: timestampSchema,
  isAllDay: z.boolean().default(false),
  isOpenShift: z.boolean().default(false),
  color: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  payRate: z.coerce.number().positive().optional().nullable(),
  payType: payTypeEnum.optional().nullable(),
  recurrenceRuleId: uuidSchema.optional().nullable(),
  isRecurringInstance: z.boolean().default(false),
  parentEventId: uuidSchema.optional().nullable(),
});

export type CreateScheduleEventInput = z.infer<typeof CreateScheduleEventSchema>;

export const UpdateScheduleEventSchema = z
  .object({
    title: z.string().min(1).optional(),
    clientId: uuidSchema.optional().nullable(),
    caregiverId: uuidSchema.optional().nullable(),
    careCoordinatorId: uuidSchema.optional().nullable(),
    careType: careTypeEnum.optional().nullable(),
    status: eventStatusEnum.optional(),
    startAt: timestampSchema.optional(),
    endAt: timestampSchema.optional(),
    isAllDay: z.boolean().optional(),
    isOpenShift: z.boolean().optional(),
    color: z.string().optional(),
    description: z.string().optional(),
    instructions: z.string().optional(),
    payRate: z.coerce.number().positive().optional().nullable(),
    payType: payTypeEnum.optional().nullable(),
    recurrenceRuleId: uuidSchema.optional().nullable(),
  })
  .strict();

export type UpdateScheduleEventInput = z.infer<typeof UpdateScheduleEventSchema>;

// Lightweight schema for drag-and-drop time changes
export const DragUpdateSchema = z.object({
  startAt: timestampSchema,
  endAt: timestampSchema,
});

export type DragUpdateInput = z.infer<typeof DragUpdateSchema>;

// --- Schedule Event Task Schemas ---

export const CreateScheduleEventTaskSchema = z.object({
  eventId: uuidSchema,
  title: z.string().min(1, "Task title is required"),
  isCompleted: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export type CreateScheduleEventTaskInput = z.infer<typeof CreateScheduleEventTaskSchema>;

export const UpdateScheduleEventTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    isCompleted: z.boolean().optional(),
    completedBy: uuidSchema.optional().nullable(),
    sortOrder: z.number().int().optional(),
  })
  .strict();

export type UpdateScheduleEventTaskInput = z.infer<typeof UpdateScheduleEventTaskSchema>;

// --- Schedule Event Exception Schemas ---

export const CreateScheduleEventExceptionSchema = z.object({
  parentEventId: uuidSchema,
  originalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  exceptionType: exceptionTypeEnum,
  modifiedStartAt: timestampSchema.optional(),
  modifiedEndAt: timestampSchema.optional(),
  modifiedCaregiverId: uuidSchema.optional(),
  reason: z.string().optional(),
});

export type CreateScheduleEventExceptionInput = z.infer<typeof CreateScheduleEventExceptionSchema>;

// --- Time Off Schemas ---

export const CreateTimeOffSchema = z.object({
  employeeId: uuidSchema,
  startAt: timestampSchema,
  endAt: timestampSchema,
  isAllDay: z.boolean().default(true),
  reason: z.string().optional(),
  status: timeOffStatusEnum.default("pending"),
});

export type CreateTimeOffInput = z.infer<typeof CreateTimeOffSchema>;

export const UpdateTimeOffSchema = z
  .object({
    startAt: timestampSchema.optional(),
    endAt: timestampSchema.optional(),
    isAllDay: z.boolean().optional(),
    reason: z.string().optional(),
    status: timeOffStatusEnum.optional(),
  })
  .strict();

export type UpdateTimeOffInput = z.infer<typeof UpdateTimeOffSchema>;

// --- Audit Log Schema (for reference, usually server-side only) ---

export const AuditActionEnum = z.enum([
  "created",
  "updated",
  "time_changed",
  "reassigned",
  "status_changed",
  "cancelled",
  "deleted",
]);

export type AuditAction = z.infer<typeof AuditActionEnum>;
