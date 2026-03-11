import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateCoordinatorConfigSchema } from "@/lib/validation/coordinator.schema";
import {
  mapCoordinatorConfigRowToApi,
  mapApiToCoordinatorConfigRow,
  type CoordinatorConfigRow,
} from "@/lib/db/coordinator.mapper";
import { defaultCoordinatorSetupValues } from "@/lib/ai/coordinator-schema";
import { syncCoordinatorToRetell } from "@/lib/retell/coordinator-sync";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

/** Normalize a phone number to E.164 (+1XXXXXXXXXX for US/CA numbers). */
function toE164(raw: string): string {
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return raw;
}

function errorResponse(message: string, status: number, details?: unknown): NextResponse {
  return jsonResponse(
    status === 400 && details ? { error: message, details } : { error: message },
    status
  );
}

/** Returns a default row shape for agencies that haven't configured yet. */
function defaultRow(agencyId: string): CoordinatorConfigRow {
  const d = defaultCoordinatorSetupValues;
  return {
    agency_id: agencyId,

    // Step 1
    coverage_line: d.lineRouting.coverageLine,
    human_backup_number: d.lineRouting.humanBackupNumber,
    intro_script: d.lineRouting.introScript,
    operating_mode: d.lineRouting.operatingMode,

    // Step 2
    handle_caregiver_call_out: d.callTypes.alwaysHandled.caregiverCallOut,
    handle_schedule_change: d.callTypes.alwaysHandled.scheduleChange,
    handle_reschedule_request: d.callTypes.alwaysHandled.rescheduleRequest,
    handle_missed_visit: d.callTypes.alwaysHandled.missedVisit,
    handle_shift_coverage_issue: d.callTypes.alwaysHandled.shiftCoverageIssue,
    handle_availability_update: d.callTypes.alwaysHandled.availabilityUpdate,
    handle_open_shift_question: d.callTypes.alwaysHandled.openShiftQuestion,
    handle_same_day_coverage: d.callTypes.alwaysHandled.sameDayCoverageRequest,

    // Step 3
    collect_caregiver_name: d.callOutIntake.intakeFields.caregiverName,
    collect_caregiver_id: d.callOutIntake.intakeFields.caregiverId,
    collect_client_name: d.callOutIntake.intakeFields.clientName,
    collect_shift_date: d.callOutIntake.intakeFields.shiftDate,
    collect_shift_time: d.callOutIntake.intakeFields.shiftTime,
    collect_reason: d.callOutIntake.intakeFields.reasonForCallOut,
    collect_urgency: d.callOutIntake.intakeFields.urgencyLevel,
    collect_same_day_flag: d.callOutIntake.intakeFields.isSameDayShift,
    collect_notes: d.callOutIntake.intakeFields.notes,
    after_notify_scheduler: d.callOutIntake.afterIntake.notifyScheduler,
    after_create_task: d.callOutIntake.afterIntake.createCoverageTask,

    // Step 4
    auto_fill_shifts: d.coverageWorkflow.autoFillShifts,
    ai_review_caregivers: d.coverageWorkflow.aiCapabilities.reviewAvailableCaregivers,
    ai_find_best_match: d.coverageWorkflow.aiCapabilities.findBestMatch,
    ai_contact_automatically: d.coverageWorkflow.aiCapabilities.contactAutomatically,
    ai_collect_confirmation: d.coverageWorkflow.aiCapabilities.collectConfirmation,
    ai_rank_matches: d.coverageWorkflow.aiCapabilities.rankMatches,
    ai_notify_scheduler: d.coverageWorkflow.aiCapabilities.notifyScheduler,
    assignment_mode: d.coverageWorkflow.assignmentMode,

    // Step 5: Escalations
    escalate_medical_emergency: d.escalationsNotifications.escalateToHuman.medicalEmergency,
    escalate_abuse_report: d.escalationsNotifications.escalateToHuman.abuseReport,
    escalate_billing_dispute: d.escalationsNotifications.escalateToHuman.billingDispute,
    escalate_complaint: d.escalationsNotifications.escalateToHuman.complaintEscalation,
    escalate_high_risk: d.escalationsNotifications.escalateToHuman.highRiskIssue,

    // Step 5: Notifications
    notify_scheduler: d.escalationsNotifications.sendUpdatesTo.scheduler,
    notify_coordinator: d.escalationsNotifications.sendUpdatesTo.coordinator,
    notify_admin: d.escalationsNotifications.sendUpdatesTo.admin,
    delivery_sms: d.escalationsNotifications.deliveryMethod.sms,
    delivery_email: d.escalationsNotifications.deliveryMethod.email,

    // Retell state
    retell_llm_id: null,
    retell_agent_id: null,
    retell_phone_number_id: null,
    retell_sync_status: "pending",
    retell_sync_error: null,
    last_synced_at: null,

    // Meta
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * GET /api/ai/coordinator/config
 * Fetch the coordinator config for the current agency.
 * Returns defaults if not yet configured.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { data: row, error } = await supabase
      .from("coordinator_config")
      .select("*")
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (error) {
      console.warn("coordinator_config query failed (table may not exist yet):", error.message);
    }

    const config = mapCoordinatorConfigRowToApi(
      (row as CoordinatorConfigRow | null) ?? defaultRow(agencyId)
    );
    return jsonResponse({ data: config }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/ai/coordinator/config
 * Upsert the coordinator config and trigger Retell sync.
 */
export async function PATCH(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = UpdateCoordinatorConfigSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    // Normalize phone numbers to E.164 before persisting
    const upsertRow = {
      ...mapApiToCoordinatorConfigRow(parsed.data, agencyId),
      coverage_line: toE164(parsed.data.lineRouting.coverageLine),
      human_backup_number: toE164(parsed.data.lineRouting.humanBackupNumber),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from("coordinator_config")
      .upsert(upsertRow, { onConflict: "agency_id" })
      .select()
      .single();

    if (error) {
      console.error("Failed to upsert coordinator config:", error);
      const hint = error.message?.includes("relation") && error.message?.includes("does not exist")
        ? " Run migration 040_coordinator_config.sql first."
        : "";
      return errorResponse("Failed to save coordinator config." + hint, 500);
    }

    // Trigger Retell sync
    const serviceClient = createServerSupabaseServiceClient();
    if (serviceClient) {
      const syncResult = await syncCoordinatorToRetell(
        updated as CoordinatorConfigRow,
        serviceClient
      );

      // Re-fetch to get updated sync status
      if (syncResult.status !== "pending") {
        const { data: refreshed } = await supabase
          .from("coordinator_config")
          .select("*")
          .eq("agency_id", agencyId)
          .single();

        if (refreshed) {
          const config = mapCoordinatorConfigRowToApi(refreshed as CoordinatorConfigRow);
          return jsonResponse({ data: config }, 200);
        }
      }
    }

    const config = mapCoordinatorConfigRowToApi(updated as CoordinatorConfigRow);
    return jsonResponse({ data: config }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
