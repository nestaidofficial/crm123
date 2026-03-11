// =============================================================================
// AI Receptionist: Database Row Types and Mapper Functions
// =============================================================================
// Converts between flat snake_case DB rows and nested camelCase API shapes
// that match the frontend's ReceptionistSetupValues structure.
// =============================================================================

import type { ReceptionistSetupValues } from "@/lib/ai/receptionist-schema";

// =============================================================================
// Database Row Type (snake_case — matches receptionist_config table)
// =============================================================================

export interface ReceptionistConfigRow {
  agency_id: string;

  // Step 1
  agency_name: string;
  reception_line: string;
  escalation_number: string;
  greeting_script: string;
  business_hours: "24/7" | "custom";
  weekday_start: string | null;
  weekday_end: string | null;
  weekend_start: string | null;
  weekend_end: string | null;

  // Per-day hours (v2)
  hours_monday: string | null;
  hours_tuesday: string | null;
  hours_wednesday: string | null;
  hours_thursday: string | null;
  hours_friday: string | null;
  hours_saturday: string | null;
  hours_sunday: string | null;

  // Agency info (v2)
  services_summary: string | null;
  business_hours_label: string | null;

  // Step 2 — Route to Coordinator
  route_caregiver_call_out: boolean;
  route_schedule_change: boolean;
  route_reschedule_request: boolean;
  route_missed_visit: boolean;
  route_missed_clocking: boolean;
  route_shift_coverage_issue: boolean;
  route_availability_update: boolean;
  route_open_shift_question: boolean;

  // Step 2 — Escalate to Human
  escalate_billing_question: boolean;
  escalate_billing_dispute: boolean;
  escalate_complaint_escalation: boolean;
  escalate_urgent_issue: boolean;

  // Step 3 — Client Intake
  intake_client_name: boolean;
  intake_client_phone_number: boolean;
  intake_client_email: boolean;
  intake_client_address: boolean;
  intake_client_type_of_care: boolean;
  intake_client_preferred_days: boolean;
  intake_client_estimated_hours: boolean;
  intake_client_preferred_start: boolean;
  intake_client_notes: boolean;
  auto_schedule_consultation: boolean;

  // Step 4 — Caregiver Intake
  intake_cg_full_name: boolean;
  intake_cg_phone_number: boolean;
  intake_cg_email: boolean;
  intake_cg_location: boolean;
  intake_cg_experience: boolean;
  intake_cg_certifications: boolean;
  intake_cg_availability: boolean;
  intake_cg_transportation: boolean;
  intake_cg_notes: boolean;

  // Step 4 — Caregiver Intake Required Flags (v2)
  intake_cg_full_name_required: boolean;
  intake_cg_phone_number_required: boolean;
  intake_cg_email_required: boolean;
  intake_cg_location_required: boolean;
  intake_cg_experience_required: boolean;
  intake_cg_certifications_required: boolean;
  intake_cg_availability_required: boolean;
  intake_cg_transportation_required: boolean;
  intake_cg_notes_required: boolean;

  // Step 5 — Notifications
  notify_summaries_sms: boolean;
  notify_summaries_email: boolean;
  notify_intake_coordinator: boolean;
  notify_intake_scheduler: boolean;
  notify_intake_admin: boolean;

  // Retell state
  retell_llm_id: string | null;
  retell_agent_id: string | null;
  retell_phone_number_id: string | null;
  retell_sync_status: "pending" | "synced" | "error";
  retell_sync_error: string | null;
  last_synced_at: string | null;

  // Meta
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// API Response Type (camelCase — nested to match ReceptionistSetupValues)
// =============================================================================

export interface ReceptionistConfigApi extends ReceptionistSetupValues {
  agencyId: string;
  isActive: boolean;
  retellLlmId: string | null;
  retellAgentId: string | null;
  retellPhoneNumberId: string | null;
  retellSyncStatus: "pending" | "synced" | "error";
  retellSyncError: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Mapper: DB Row → API Response
// =============================================================================

export function mapReceptionistConfigRowToApi(
  row: ReceptionistConfigRow
): ReceptionistConfigApi {
  return {
    agencyId: row.agency_id,

    // Nested shape matching ReceptionistSetupValues
    phoneSetup: {
      agencyName: row.agency_name,
      receptionLine: row.reception_line,
      escalationNumber: row.escalation_number,
      greetingScript: row.greeting_script,
      businessHours: row.business_hours,
      weekdayStart: row.weekday_start ?? "09:00",
      weekdayEnd: row.weekday_end ?? "17:00",
      weekendStart: row.weekend_start ?? "09:00",
      weekendEnd: row.weekend_end ?? "17:00",
      hoursMonday: row.hours_monday ?? "9:00 AM - 5:00 PM",
      hoursTuesday: row.hours_tuesday ?? "9:00 AM - 5:00 PM",
      hoursWednesday: row.hours_wednesday ?? "9:00 AM - 5:00 PM",
      hoursThursday: row.hours_thursday ?? "9:00 AM - 5:00 PM",
      hoursFriday: row.hours_friday ?? "9:00 AM - 5:00 PM",
      hoursSaturday: row.hours_saturday ?? "Closed",
      hoursSunday: row.hours_sunday ?? "Closed",
      businessHoursLabel: row.business_hours_label ?? "",
      servicesSummary: row.services_summary ?? "",
    },
    callRouting: {
      routeToCoordinator: {
        caregiverCallOut: row.route_caregiver_call_out,
        scheduleChange: row.route_schedule_change,
        rescheduleRequest: row.route_reschedule_request,
        missedVisit: row.route_missed_visit,
        missedClocking: row.route_missed_clocking,
        shiftCoverageIssue: row.route_shift_coverage_issue,
        availabilityUpdate: row.route_availability_update,
        openShiftQuestion: row.route_open_shift_question,
      },
      escalateToHuman: {
        billingQuestion: row.escalate_billing_question,
        billingDispute: row.escalate_billing_dispute,
        complaintEscalation: row.escalate_complaint_escalation,
        urgentIssue: row.escalate_urgent_issue,
      },
    },
    clientIntake: {
      fields: {
        clientName: row.intake_client_name,
        phoneNumber: row.intake_client_phone_number,
        email: row.intake_client_email,
        address: row.intake_client_address,
        typeOfCare: row.intake_client_type_of_care,
        preferredDaysHours: row.intake_client_preferred_days,
        estimatedHoursPerWeek: row.intake_client_estimated_hours,
        preferredStartDate: row.intake_client_preferred_start,
        notes: row.intake_client_notes,
      },
      autoScheduleConsultation: row.auto_schedule_consultation,
    },
    caregiverIntake: {
      fields: {
        fullName: row.intake_cg_full_name,
        phoneNumber: row.intake_cg_phone_number,
        email: row.intake_cg_email,
        location: row.intake_cg_location,
        experience: row.intake_cg_experience,
        certifications: row.intake_cg_certifications,
        availability: row.intake_cg_availability,
        transportation: row.intake_cg_transportation,
        notes: row.intake_cg_notes,
      },
      requiredFields: {
        fullName: row.intake_cg_full_name_required,
        phoneNumber: row.intake_cg_phone_number_required,
        email: row.intake_cg_email_required,
        location: row.intake_cg_location_required,
        experience: row.intake_cg_experience_required,
        certifications: row.intake_cg_certifications_required,
        availability: row.intake_cg_availability_required,
        transportation: row.intake_cg_transportation_required,
        notes: row.intake_cg_notes_required,
      },
    },
    notifications: {
      sendSummariesTo: {
        sms: row.notify_summaries_sms,
        email: row.notify_summaries_email,
      },
      notifyOnIntake: {
        coordinator: row.notify_intake_coordinator,
        scheduler: row.notify_intake_scheduler,
        admin: row.notify_intake_admin,
      },
    },

    // Sync & meta
    isActive: row.is_active,
    retellLlmId: row.retell_llm_id,
    retellAgentId: row.retell_agent_id,
    retellPhoneNumberId: row.retell_phone_number_id,
    retellSyncStatus: row.retell_sync_status,
    retellSyncError: row.retell_sync_error,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// Mapper: Nested form data → Flat DB Row (for upsert)
// =============================================================================

export function mapApiToReceptionistConfigRow(
  values: ReceptionistSetupValues,
  agencyId: string
): Omit<
  ReceptionistConfigRow,
  | "retell_llm_id"
  | "retell_agent_id"
  | "retell_phone_number_id"
  | "retell_sync_status"
  | "retell_sync_error"
  | "last_synced_at"
  | "created_at"
  | "updated_at"
> {
  return {
    agency_id: agencyId,

    // Step 1
    agency_name: values.phoneSetup.agencyName,
    reception_line: values.phoneSetup.receptionLine,
    escalation_number: values.phoneSetup.escalationNumber,
    greeting_script: values.phoneSetup.greetingScript,
    business_hours: values.phoneSetup.businessHours,
    weekday_start: values.phoneSetup.weekdayStart ?? "09:00",
    weekday_end: values.phoneSetup.weekdayEnd ?? "17:00",
    weekend_start: values.phoneSetup.weekendStart ?? "09:00",
    weekend_end: values.phoneSetup.weekendEnd ?? "17:00",

    // Per-day hours (v2)
    hours_monday: values.phoneSetup.hoursMonday ?? "9:00 AM - 5:00 PM",
    hours_tuesday: values.phoneSetup.hoursTuesday ?? "9:00 AM - 5:00 PM",
    hours_wednesday: values.phoneSetup.hoursWednesday ?? "9:00 AM - 5:00 PM",
    hours_thursday: values.phoneSetup.hoursThursday ?? "9:00 AM - 5:00 PM",
    hours_friday: values.phoneSetup.hoursFriday ?? "9:00 AM - 5:00 PM",
    hours_saturday: values.phoneSetup.hoursSaturday ?? "Closed",
    hours_sunday: values.phoneSetup.hoursSunday ?? "Closed",

    // Agency info (v2)
    services_summary: values.phoneSetup.servicesSummary ?? "",
    business_hours_label: values.phoneSetup.businessHoursLabel ?? "",

    // Step 2 — Route to Coordinator
    route_caregiver_call_out: values.callRouting.routeToCoordinator.caregiverCallOut,
    route_schedule_change: values.callRouting.routeToCoordinator.scheduleChange,
    route_reschedule_request: values.callRouting.routeToCoordinator.rescheduleRequest,
    route_missed_visit: values.callRouting.routeToCoordinator.missedVisit,
    route_missed_clocking: values.callRouting.routeToCoordinator.missedClocking,
    route_shift_coverage_issue: values.callRouting.routeToCoordinator.shiftCoverageIssue,
    route_availability_update: values.callRouting.routeToCoordinator.availabilityUpdate,
    route_open_shift_question: values.callRouting.routeToCoordinator.openShiftQuestion,

    // Step 2 — Escalate to Human
    escalate_billing_question: values.callRouting.escalateToHuman.billingQuestion,
    escalate_billing_dispute: values.callRouting.escalateToHuman.billingDispute,
    escalate_complaint_escalation: values.callRouting.escalateToHuman.complaintEscalation,
    escalate_urgent_issue: values.callRouting.escalateToHuman.urgentIssue,

    // Step 3 — Client Intake
    intake_client_name: values.clientIntake.fields.clientName,
    intake_client_phone_number: values.clientIntake.fields.phoneNumber,
    intake_client_email: values.clientIntake.fields.email,
    intake_client_address: values.clientIntake.fields.address,
    intake_client_type_of_care: values.clientIntake.fields.typeOfCare,
    intake_client_preferred_days: values.clientIntake.fields.preferredDaysHours,
    intake_client_estimated_hours: values.clientIntake.fields.estimatedHoursPerWeek,
    intake_client_preferred_start: values.clientIntake.fields.preferredStartDate,
    intake_client_notes: values.clientIntake.fields.notes,
    auto_schedule_consultation: values.clientIntake.autoScheduleConsultation,

    // Step 4 — Caregiver Intake
    intake_cg_full_name: values.caregiverIntake.fields.fullName,
    intake_cg_phone_number: values.caregiverIntake.fields.phoneNumber,
    intake_cg_email: values.caregiverIntake.fields.email,
    intake_cg_location: values.caregiverIntake.fields.location,
    intake_cg_experience: values.caregiverIntake.fields.experience,
    intake_cg_certifications: values.caregiverIntake.fields.certifications,
    intake_cg_availability: values.caregiverIntake.fields.availability,
    intake_cg_transportation: values.caregiverIntake.fields.transportation,
    intake_cg_notes: values.caregiverIntake.fields.notes,

    // Step 4 — Caregiver Intake Required Flags (v2)
    intake_cg_full_name_required: values.caregiverIntake.requiredFields.fullName,
    intake_cg_phone_number_required: values.caregiverIntake.requiredFields.phoneNumber,
    intake_cg_email_required: values.caregiverIntake.requiredFields.email,
    intake_cg_location_required: values.caregiverIntake.requiredFields.location,
    intake_cg_experience_required: values.caregiverIntake.requiredFields.experience,
    intake_cg_certifications_required: values.caregiverIntake.requiredFields.certifications,
    intake_cg_availability_required: values.caregiverIntake.requiredFields.availability,
    intake_cg_transportation_required: values.caregiverIntake.requiredFields.transportation,
    intake_cg_notes_required: values.caregiverIntake.requiredFields.notes,

    // Step 5 — Notifications
    notify_summaries_sms: values.notifications.sendSummariesTo.sms,
    notify_summaries_email: values.notifications.sendSummariesTo.email,
    notify_intake_coordinator: values.notifications.notifyOnIntake.coordinator,
    notify_intake_scheduler: values.notifications.notifyOnIntake.scheduler,
    notify_intake_admin: values.notifications.notifyOnIntake.admin,

    // Meta
    is_active: true,
  };
}
