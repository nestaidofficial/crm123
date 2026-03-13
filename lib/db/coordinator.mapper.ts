// =============================================================================
// AI Coverage Coordinator: Database Row Types and Mapper Functions
// =============================================================================
// Converts between flat snake_case DB rows and nested camelCase API shapes
// that match the frontend's CoordinatorSetupValues structure.
// =============================================================================

import type { CoordinatorSetupValues } from "@/lib/ai/coordinator-schema";

// =============================================================================
// Database Row Type (snake_case — matches coordinator_config table)
// =============================================================================

export interface CoordinatorConfigRow {
  agency_id: string;

  // Step 1: Line & Routing
  coverage_line: string;
  human_backup_number: string;
  intro_script: string;
  operating_mode: "24/7" | "business-hours" | "after-hours";
  agency_timezone: string;

  // Step 2: Call Types
  handle_caregiver_call_out: boolean;
  handle_schedule_change: boolean;
  handle_reschedule_request: boolean;
  handle_missed_visit: boolean;
  handle_shift_coverage_issue: boolean;
  handle_availability_update: boolean;
  handle_open_shift_question: boolean;
  handle_same_day_coverage: boolean;

  // Step 3: Call-Out Intake
  collect_caregiver_name: boolean;
  collect_caregiver_id: boolean;
  collect_client_name: boolean;
  collect_shift_date: boolean;
  collect_shift_time: boolean;
  collect_reason: boolean;
  collect_urgency: boolean;
  collect_same_day_flag: boolean;
  collect_notes: boolean;
  after_notify_scheduler: boolean;
  after_create_task: boolean;

  // Step 4: Coverage Workflow
  auto_fill_shifts: boolean;
  ai_review_caregivers: boolean;
  ai_find_best_match: boolean;
  ai_contact_automatically: boolean;
  ai_collect_confirmation: boolean;
  ai_rank_matches: boolean;
  ai_notify_scheduler: boolean;
  assignment_mode: "suggest" | "approval" | "auto-assign";

  // Auto Scheduler
  auto_scheduler_enabled: boolean;

  // Step 5: Escalations
  escalate_medical_emergency: boolean;
  escalate_abuse_report: boolean;
  escalate_billing_dispute: boolean;
  escalate_complaint: boolean;
  escalate_high_risk: boolean;

  // Step 5: Notifications
  notify_scheduler: boolean;
  notify_coordinator: boolean;
  notify_admin: boolean;
  delivery_sms: boolean;
  delivery_email: boolean;

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
// API Response Type (camelCase — nested to match CoordinatorSetupValues)
// =============================================================================

export interface CoordinatorConfigApi extends CoordinatorSetupValues {
  agencyId: string;
  autoSchedulerEnabled: boolean;
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

export function mapCoordinatorConfigRowToApi(
  row: CoordinatorConfigRow
): CoordinatorConfigApi {
  return {
    agencyId: row.agency_id,
    autoSchedulerEnabled: row.auto_scheduler_enabled ?? false,

    // Nested shape matching CoordinatorSetupValues
    lineRouting: {
      coverageLine: row.coverage_line,
      humanBackupNumber: row.human_backup_number,
      introScript: row.intro_script,
      operatingMode: row.operating_mode,
      timezone: row.agency_timezone,
    },
    callTypes: {
      alwaysHandled: {
        caregiverCallOut: row.handle_caregiver_call_out,
        scheduleChange: row.handle_schedule_change,
        rescheduleRequest: row.handle_reschedule_request,
        missedVisit: row.handle_missed_visit,
        shiftCoverageIssue: row.handle_shift_coverage_issue,
        availabilityUpdate: row.handle_availability_update,
        openShiftQuestion: row.handle_open_shift_question,
        sameDayCoverageRequest: row.handle_same_day_coverage,
      },
    },
    callOutIntake: {
      intakeFields: {
        caregiverName: row.collect_caregiver_name,
        caregiverId: row.collect_caregiver_id,
        clientName: row.collect_client_name,
        shiftDate: row.collect_shift_date,
        shiftTime: row.collect_shift_time,
        reasonForCallOut: row.collect_reason,
        urgencyLevel: row.collect_urgency,
        isSameDayShift: row.collect_same_day_flag,
        notes: row.collect_notes,
      },
      afterIntake: {
        notifyScheduler: row.after_notify_scheduler,
        createCoverageTask: row.after_create_task,
      },
    },
    coverageWorkflow: {
      autoFillShifts: row.auto_fill_shifts,
      aiCapabilities: {
        reviewAvailableCaregivers: row.ai_review_caregivers,
        findBestMatch: row.ai_find_best_match,
        contactAutomatically: row.ai_contact_automatically,
        collectConfirmation: row.ai_collect_confirmation,
        rankMatches: row.ai_rank_matches,
        notifyScheduler: row.ai_notify_scheduler,
      },
      assignmentMode: row.assignment_mode,
    },
    escalationsNotifications: {
      escalateToHuman: {
        medicalEmergency: row.escalate_medical_emergency,
        abuseReport: row.escalate_abuse_report,
        billingDispute: row.escalate_billing_dispute,
        complaintEscalation: row.escalate_complaint,
        highRiskIssue: row.escalate_high_risk,
      },
      sendUpdatesTo: {
        scheduler: row.notify_scheduler,
        coordinator: row.notify_coordinator,
        admin: row.notify_admin,
      },
      deliveryMethod: {
        sms: row.delivery_sms,
        email: row.delivery_email,
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

export function mapApiToCoordinatorConfigRow(
  values: CoordinatorSetupValues,
  agencyId: string
): Omit<
  CoordinatorConfigRow,
  | "auto_scheduler_enabled"
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
    coverage_line: values.lineRouting.coverageLine,
    human_backup_number: values.lineRouting.humanBackupNumber,
    intro_script: values.lineRouting.introScript,
    operating_mode: values.lineRouting.operatingMode,
    agency_timezone: values.lineRouting.timezone,

    // Step 2
    handle_caregiver_call_out: values.callTypes.alwaysHandled.caregiverCallOut,
    handle_schedule_change: values.callTypes.alwaysHandled.scheduleChange,
    handle_reschedule_request: values.callTypes.alwaysHandled.rescheduleRequest,
    handle_missed_visit: values.callTypes.alwaysHandled.missedVisit,
    handle_shift_coverage_issue: values.callTypes.alwaysHandled.shiftCoverageIssue,
    handle_availability_update: values.callTypes.alwaysHandled.availabilityUpdate,
    handle_open_shift_question: values.callTypes.alwaysHandled.openShiftQuestion,
    handle_same_day_coverage: values.callTypes.alwaysHandled.sameDayCoverageRequest,

    // Step 3
    collect_caregiver_name: values.callOutIntake.intakeFields.caregiverName,
    collect_caregiver_id: values.callOutIntake.intakeFields.caregiverId,
    collect_client_name: values.callOutIntake.intakeFields.clientName,
    collect_shift_date: values.callOutIntake.intakeFields.shiftDate,
    collect_shift_time: values.callOutIntake.intakeFields.shiftTime,
    collect_reason: values.callOutIntake.intakeFields.reasonForCallOut,
    collect_urgency: values.callOutIntake.intakeFields.urgencyLevel,
    collect_same_day_flag: values.callOutIntake.intakeFields.isSameDayShift,
    collect_notes: values.callOutIntake.intakeFields.notes,
    after_notify_scheduler: values.callOutIntake.afterIntake.notifyScheduler,
    after_create_task: values.callOutIntake.afterIntake.createCoverageTask,

    // Step 4
    auto_fill_shifts: values.coverageWorkflow.autoFillShifts,
    ai_review_caregivers: values.coverageWorkflow.aiCapabilities.reviewAvailableCaregivers,
    ai_find_best_match: values.coverageWorkflow.aiCapabilities.findBestMatch,
    ai_contact_automatically: values.coverageWorkflow.aiCapabilities.contactAutomatically,
    ai_collect_confirmation: values.coverageWorkflow.aiCapabilities.collectConfirmation,
    ai_rank_matches: values.coverageWorkflow.aiCapabilities.rankMatches,
    ai_notify_scheduler: values.coverageWorkflow.aiCapabilities.notifyScheduler,
    assignment_mode: values.coverageWorkflow.assignmentMode,

    // Step 5: Escalations
    escalate_medical_emergency: values.escalationsNotifications.escalateToHuman.medicalEmergency,
    escalate_abuse_report: values.escalationsNotifications.escalateToHuman.abuseReport,
    escalate_billing_dispute: values.escalationsNotifications.escalateToHuman.billingDispute,
    escalate_complaint: values.escalationsNotifications.escalateToHuman.complaintEscalation,
    escalate_high_risk: values.escalationsNotifications.escalateToHuman.highRiskIssue,

    // Step 5: Notifications
    notify_scheduler: values.escalationsNotifications.sendUpdatesTo.scheduler,
    notify_coordinator: values.escalationsNotifications.sendUpdatesTo.coordinator,
    notify_admin: values.escalationsNotifications.sendUpdatesTo.admin,
    delivery_sms: values.escalationsNotifications.deliveryMethod.sms,
    delivery_email: values.escalationsNotifications.deliveryMethod.email,

    // Meta
    is_active: true,
  };
}
