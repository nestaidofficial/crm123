import { z } from "zod";

// ─────────────────────────────────────────
// Step 1: Phone Line & Routing Setup
// ─────────────────────────────────────────

export const lineRoutingSchema = z.object({
  coverageLine: z.string().min(1, "Coverage line is required"),
  humanBackupNumber: z.string().min(1, "Backup number is required"),
  introScript: z.string().min(1, "Intro script is required"),
  operatingMode: z.enum(["24/7", "business-hours", "after-hours"]),
  timezone: z.string().min(1, "Timezone is required"),
});

// ─────────────────────────────────────────
// Step 2: Call Types
// ─────────────────────────────────────────

export const callTypesSchema = z.object({
  alwaysHandled: z.object({
    caregiverCallOut: z.boolean(),
    scheduleChange: z.boolean(),
    rescheduleRequest: z.boolean(),
    missedVisit: z.boolean(),
    shiftCoverageIssue: z.boolean(),
    availabilityUpdate: z.boolean(),
    openShiftQuestion: z.boolean(),
    sameDayCoverageRequest: z.boolean(),
  }),
});

// ─────────────────────────────────────────
// Step 3: Call-Out Intake Rules
// ─────────────────────────────────────────

export const callOutIntakeSchema = z.object({
  intakeFields: z.object({
    caregiverName: z.boolean(),
    caregiverId: z.boolean(),
    clientName: z.boolean(),
    shiftDate: z.boolean(),
    shiftTime: z.boolean(),
    reasonForCallOut: z.boolean(),
    urgencyLevel: z.boolean(),
    isSameDayShift: z.boolean(),
    notes: z.boolean(),
  }),
  afterIntake: z.object({
    notifyScheduler: z.boolean(),
    createCoverageTask: z.boolean(),
  }),
});

// ─────────────────────────────────────────
// Step 4: Shift Coverage Workflow
// ─────────────────────────────────────────

export const coverageWorkflowSchema = z.object({
  autoFillShifts: z.boolean(),
  aiCapabilities: z.object({
    reviewAvailableCaregivers: z.boolean(),
    findBestMatch: z.boolean(),
    contactAutomatically: z.boolean(),
    collectConfirmation: z.boolean(),
    rankMatches: z.boolean(),
    notifyScheduler: z.boolean(),
  }),
  assignmentMode: z.enum(["suggest", "approval", "auto-assign"]),
});

// ─────────────────────────────────────────
// Step 5: Escalations & Notifications
// ─────────────────────────────────────────

export const escalationsNotificationsSchema = z.object({
  escalateToHuman: z.object({
    medicalEmergency: z.boolean(),
    abuseReport: z.boolean(),
    billingDispute: z.boolean(),
    complaintEscalation: z.boolean(),
    highRiskIssue: z.boolean(),
  }),
  sendUpdatesTo: z.object({
    scheduler: z.boolean(),
    coordinator: z.boolean(),
    admin: z.boolean(),
  }),
  deliveryMethod: z.object({
    sms: z.boolean(),
    email: z.boolean(),
  }),
});

// ─────────────────────────────────────────
// Combined Schema
// ─────────────────────────────────────────

export const coordinatorSetupSchema = z.object({
  lineRouting: lineRoutingSchema,
  callTypes: callTypesSchema,
  callOutIntake: callOutIntakeSchema,
  coverageWorkflow: coverageWorkflowSchema,
  escalationsNotifications: escalationsNotificationsSchema,
});

export type CoordinatorSetupValues = z.infer<typeof coordinatorSetupSchema>;

// ─────────────────────────────────────────
// Default Values
// ─────────────────────────────────────────

export const defaultCoordinatorSetupValues: CoordinatorSetupValues = {
  lineRouting: {
    coverageLine: "",
    humanBackupNumber: "",
    introScript: "You've reached the scheduling line for [Agency Name]. How can I help you today?",
    operatingMode: "24/7",
    timezone: "America/New_York",
  },
  callTypes: {
    alwaysHandled: {
      caregiverCallOut: true,
      scheduleChange: true,
      rescheduleRequest: true,
      missedVisit: true,
      shiftCoverageIssue: true,
      availabilityUpdate: true,
      openShiftQuestion: true,
      sameDayCoverageRequest: true,
    },
  },
  callOutIntake: {
    intakeFields: {
      caregiverName: true,
      caregiverId: true,
      clientName: true,
      shiftDate: true,
      shiftTime: true,
      reasonForCallOut: true,
      urgencyLevel: true,
      isSameDayShift: true,
      notes: true,
    },
    afterIntake: {
      notifyScheduler: true,
      createCoverageTask: true,
    },
  },
  coverageWorkflow: {
    autoFillShifts: true,
    aiCapabilities: {
      reviewAvailableCaregivers: true,
      findBestMatch: true,
      contactAutomatically: true,
      collectConfirmation: true,
      rankMatches: true,
      notifyScheduler: true,
    },
    assignmentMode: "approval",
  },
  escalationsNotifications: {
    escalateToHuman: {
      medicalEmergency: true,
      abuseReport: true,
      billingDispute: true,
      complaintEscalation: true,
      highRiskIssue: true,
    },
    sendUpdatesTo: {
      scheduler: true,
      coordinator: true,
      admin: false,
    },
    deliveryMethod: {
      sms: true,
      email: true,
    },
  },
};

// ─────────────────────────────────────────
// Step Definitions
// ─────────────────────────────────────────

export const COORDINATOR_STEPS = [
  { id: 1, label: "Line & Routing" },
  { id: 2, label: "Call Types" },
  { id: 3, label: "Call-Out Intake" },
  { id: 4, label: "Notifications" },
];

// Fields to validate per step (for react-hook-form trigger)
export const FIELDS_BY_STEP: Record<number, string[]> = {
  1: [
    "lineRouting.coverageLine",
    "lineRouting.humanBackupNumber",
    "lineRouting.introScript",
    "lineRouting.operatingMode",
    "lineRouting.timezone",
  ],
  2: [], // No required fields, all toggles
  3: [], // No required fields, all toggles
  4: [], // No required fields, all toggles
};
