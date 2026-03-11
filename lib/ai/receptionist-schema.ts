import { z } from "zod";

// ─────────────────────────────────────────
// Step 1: Phone Line & Basic Setup
// ─────────────────────────────────────────

export const phoneSetupSchema = z.object({
  agencyName: z.string().min(1, "Agency name is required"),
  receptionLine: z.string().min(1, "Reception line is required"),
  escalationNumber: z.string().min(1, "Escalation number is required"),
  greetingScript: z.string().min(1, "Greeting script is required"),
  businessHours: z.enum(["24/7", "custom"]),
  weekdayStart: z.string().optional(),
  weekdayEnd: z.string().optional(),
  weekendStart: z.string().optional(),
  weekendEnd: z.string().optional(),
  // Per-day hours
  hoursMonday: z.string().optional(),
  hoursTuesday: z.string().optional(),
  hoursWednesday: z.string().optional(),
  hoursThursday: z.string().optional(),
  hoursFriday: z.string().optional(),
  hoursSaturday: z.string().optional(),
  hoursSunday: z.string().optional(),
  // Agency info
  businessHoursLabel: z.string().optional(),
  servicesSummary: z.string().optional(),
});

// ─────────────────────────────────────────
// Step 2: Call Routing
// ─────────────────────────────────────────

export const callRoutingSchema = z.object({
  routeToCoordinator: z.object({
    caregiverCallOut: z.boolean(),
    scheduleChange: z.boolean(),
    rescheduleRequest: z.boolean(),
    missedVisit: z.boolean(),
    missedClocking: z.boolean(),
    shiftCoverageIssue: z.boolean(),
    availabilityUpdate: z.boolean(),
    openShiftQuestion: z.boolean(),
  }),
  escalateToHuman: z.object({
    billingQuestion: z.boolean(),
    billingDispute: z.boolean(),
    complaintEscalation: z.boolean(),
    urgentIssue: z.boolean(),
  }),
});

// ─────────────────────────────────────────
// Step 3: Client Intake
// ─────────────────────────────────────────

export const clientIntakeSchema = z.object({
  fields: z.object({
    clientName: z.boolean(),
    phoneNumber: z.boolean(),
    email: z.boolean(),
    address: z.boolean(),
    typeOfCare: z.boolean(),
    preferredDaysHours: z.boolean(),
    estimatedHoursPerWeek: z.boolean(),
    preferredStartDate: z.boolean(),
    notes: z.boolean(),
  }),
  autoScheduleConsultation: z.boolean(),
});

// ─────────────────────────────────────────
// Step 4: Caregiver Intake
// ─────────────────────────────────────────

const caregiverRequiredFieldsSchema = z.object({
  fullName: z.boolean(),
  phoneNumber: z.boolean(),
  email: z.boolean(),
  location: z.boolean(),
  experience: z.boolean(),
  certifications: z.boolean(),
  availability: z.boolean(),
  transportation: z.boolean(),
  notes: z.boolean(),
});

export const caregiverIntakeSchema = z.object({
  fields: z.object({
    fullName: z.boolean(),
    phoneNumber: z.boolean(),
    email: z.boolean(),
    location: z.boolean(),
    experience: z.boolean(),
    certifications: z.boolean(),
    availability: z.boolean(),
    transportation: z.boolean(),
    notes: z.boolean(),
  }),
  requiredFields: caregiverRequiredFieldsSchema,
});

// ─────────────────────────────────────────
// Step 5: Notifications
// ─────────────────────────────────────────

export const notificationsSchema = z.object({
  sendSummariesTo: z.object({
    sms: z.boolean(),
    email: z.boolean(),
  }),
  notifyOnIntake: z.object({
    coordinator: z.boolean(),
    scheduler: z.boolean(),
    admin: z.boolean(),
  }),
});

// ─────────────────────────────────────────
// Combined Schema
// ─────────────────────────────────────────

export const receptionistSetupSchema = z.object({
  phoneSetup: phoneSetupSchema,
  callRouting: callRoutingSchema,
  clientIntake: clientIntakeSchema,
  caregiverIntake: caregiverIntakeSchema,
  notifications: notificationsSchema,
});

export type ReceptionistSetupValues = z.infer<typeof receptionistSetupSchema>;

// ─────────────────────────────────────────
// Default Values
// ─────────────────────────────────────────

export const defaultReceptionistSetupValues: ReceptionistSetupValues = {
  phoneSetup: {
    agencyName: "",
    receptionLine: "",
    escalationNumber: "",
    greetingScript: "Thank you for calling [Agency Name], how can I help you today?",
    businessHours: "24/7",
    weekdayStart: "09:00",
    weekdayEnd: "17:00",
    weekendStart: "09:00",
    weekendEnd: "17:00",
    hoursMonday: "9:00 AM - 5:00 PM",
    hoursTuesday: "9:00 AM - 5:00 PM",
    hoursWednesday: "9:00 AM - 5:00 PM",
    hoursThursday: "9:00 AM - 5:00 PM",
    hoursFriday: "9:00 AM - 5:00 PM",
    hoursSaturday: "Closed",
    hoursSunday: "Closed",
    businessHoursLabel: "",
    servicesSummary: "",
  },
  callRouting: {
    routeToCoordinator: {
      caregiverCallOut: true,
      scheduleChange: true,
      rescheduleRequest: true,
      missedVisit: true,
      missedClocking: true,
      shiftCoverageIssue: true,
      availabilityUpdate: true,
      openShiftQuestion: true,
    },
    escalateToHuman: {
      billingQuestion: true,
      billingDispute: true,
      complaintEscalation: true,
      urgentIssue: true,
    },
  },
  clientIntake: {
    fields: {
      clientName: true,
      phoneNumber: true,
      email: true,
      address: true,
      typeOfCare: true,
      preferredDaysHours: true,
      estimatedHoursPerWeek: true,
      preferredStartDate: true,
      notes: true,
    },
    autoScheduleConsultation: false,
  },
  caregiverIntake: {
    fields: {
      fullName: true,
      phoneNumber: true,
      email: true,
      location: true,
      experience: true,
      certifications: true,
      availability: true,
      transportation: true,
      notes: true,
    },
    requiredFields: {
      fullName: true,
      phoneNumber: true,
      email: false,
      location: false,
      experience: false,
      certifications: false,
      availability: false,
      transportation: false,
      notes: false,
    },
  },
  notifications: {
    sendSummariesTo: {
      sms: true,
      email: true,
    },
    notifyOnIntake: {
      coordinator: true,
      scheduler: false,
      admin: true,
    },
  },
};

// ─────────────────────────────────────────
// Step Definitions
// ─────────────────────────────────────────

export const RECEPTIONIST_STEPS = [
  { id: 1, label: "Phone & Setup" },
  { id: 2, label: "Call Routing" },
  { id: 3, label: "Client Intake" },
  { id: 4, label: "Caregiver Intake" },
  { id: 5, label: "Notifications" },
];

// Fields to validate per step (for react-hook-form trigger)
export const FIELDS_BY_STEP: Record<number, string[]> = {
  1: [
    "phoneSetup.agencyName",
    "phoneSetup.receptionLine",
    "phoneSetup.escalationNumber",
    "phoneSetup.greetingScript",
    "phoneSetup.businessHours",
  ],
  2: [], // No required fields, all toggles
  3: [], // No required fields, all toggles
  4: [], // No required fields, all toggles
  5: [], // No required fields, all toggles
};
