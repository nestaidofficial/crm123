import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { UpdateReceptionistConfigSchema } from "@/lib/validation/receptionist.schema";
import {
  mapReceptionistConfigRowToApi,
  mapApiToReceptionistConfigRow,
  type ReceptionistConfigRow,
} from "@/lib/db/receptionist.mapper";
import { defaultReceptionistSetupValues } from "@/lib/ai/receptionist-schema";
import { syncConfigToRetell } from "@/lib/retell/sync";
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
function defaultRow(agencyId: string): ReceptionistConfigRow {
  const d = defaultReceptionistSetupValues;
  return {
    agency_id: agencyId,
    agency_name: d.phoneSetup.agencyName,
    reception_line: d.phoneSetup.receptionLine,
    escalation_number: d.phoneSetup.escalationNumber,
    greeting_script: d.phoneSetup.greetingScript,
    business_hours: d.phoneSetup.businessHours,
    weekday_start: d.phoneSetup.weekdayStart ?? "09:00",
    weekday_end: d.phoneSetup.weekdayEnd ?? "17:00",
    weekend_start: d.phoneSetup.weekendStart ?? "09:00",
    weekend_end: d.phoneSetup.weekendEnd ?? "17:00",
    // Per-day hours (v2)
    hours_monday: d.phoneSetup.hoursMonday ?? "9:00 AM - 5:00 PM",
    hours_tuesday: d.phoneSetup.hoursTuesday ?? "9:00 AM - 5:00 PM",
    hours_wednesday: d.phoneSetup.hoursWednesday ?? "9:00 AM - 5:00 PM",
    hours_thursday: d.phoneSetup.hoursThursday ?? "9:00 AM - 5:00 PM",
    hours_friday: d.phoneSetup.hoursFriday ?? "9:00 AM - 5:00 PM",
    hours_saturday: d.phoneSetup.hoursSaturday ?? "Closed",
    hours_sunday: d.phoneSetup.hoursSunday ?? "Closed",
    // Agency info (v2)
    services_summary: d.phoneSetup.servicesSummary ?? "",
    business_hours_label: d.phoneSetup.businessHoursLabel ?? "",
    route_caregiver_call_out: d.callRouting.routeToCoordinator.caregiverCallOut,
    route_schedule_change: d.callRouting.routeToCoordinator.scheduleChange,
    route_reschedule_request: d.callRouting.routeToCoordinator.rescheduleRequest,
    route_missed_visit: d.callRouting.routeToCoordinator.missedVisit,
    route_missed_clocking: d.callRouting.routeToCoordinator.missedClocking,
    route_shift_coverage_issue: d.callRouting.routeToCoordinator.shiftCoverageIssue,
    route_availability_update: d.callRouting.routeToCoordinator.availabilityUpdate,
    route_open_shift_question: d.callRouting.routeToCoordinator.openShiftQuestion,
    escalate_billing_question: d.callRouting.escalateToHuman.billingQuestion,
    escalate_billing_dispute: d.callRouting.escalateToHuman.billingDispute,
    escalate_complaint_escalation: d.callRouting.escalateToHuman.complaintEscalation,
    escalate_urgent_issue: d.callRouting.escalateToHuman.urgentIssue,
    intake_client_name: d.clientIntake.fields.clientName,
    intake_client_phone_number: d.clientIntake.fields.phoneNumber,
    intake_client_email: d.clientIntake.fields.email,
    intake_client_address: d.clientIntake.fields.address,
    intake_client_type_of_care: d.clientIntake.fields.typeOfCare,
    intake_client_preferred_days: d.clientIntake.fields.preferredDaysHours,
    intake_client_estimated_hours: d.clientIntake.fields.estimatedHoursPerWeek,
    intake_client_preferred_start: d.clientIntake.fields.preferredStartDate,
    intake_client_notes: d.clientIntake.fields.notes,
    auto_schedule_consultation: d.clientIntake.autoScheduleConsultation,
    intake_cg_full_name: d.caregiverIntake.fields.fullName,
    intake_cg_phone_number: d.caregiverIntake.fields.phoneNumber,
    intake_cg_email: d.caregiverIntake.fields.email,
    intake_cg_location: d.caregiverIntake.fields.location,
    intake_cg_experience: d.caregiverIntake.fields.experience,
    intake_cg_certifications: d.caregiverIntake.fields.certifications,
    intake_cg_availability: d.caregiverIntake.fields.availability,
    intake_cg_transportation: d.caregiverIntake.fields.transportation,
    intake_cg_notes: d.caregiverIntake.fields.notes,
    // Caregiver intake required flags (v2)
    intake_cg_full_name_required: d.caregiverIntake.requiredFields.fullName,
    intake_cg_phone_number_required: d.caregiverIntake.requiredFields.phoneNumber,
    intake_cg_email_required: d.caregiverIntake.requiredFields.email,
    intake_cg_location_required: d.caregiverIntake.requiredFields.location,
    intake_cg_experience_required: d.caregiverIntake.requiredFields.experience,
    intake_cg_certifications_required: d.caregiverIntake.requiredFields.certifications,
    intake_cg_availability_required: d.caregiverIntake.requiredFields.availability,
    intake_cg_transportation_required: d.caregiverIntake.requiredFields.transportation,
    intake_cg_notes_required: d.caregiverIntake.requiredFields.notes,
    notify_summaries_sms: d.notifications.sendSummariesTo.sms,
    notify_summaries_email: d.notifications.sendSummariesTo.email,
    notify_intake_coordinator: d.notifications.notifyOnIntake.coordinator,
    notify_intake_scheduler: d.notifications.notifyOnIntake.scheduler,
    notify_intake_admin: d.notifications.notifyOnIntake.admin,
    retell_llm_id: null,
    retell_agent_id: null,
    retell_phone_number_id: null,
    retell_sync_status: "pending",
    retell_sync_error: null,
    last_synced_at: null,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * GET /api/ai/receptionist/config
 * Fetch the receptionist config for the current agency.
 * Returns defaults if not yet configured.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { data: row, error } = await supabase
      .from("receptionist_config")
      .select("*")
      .eq("agency_id", agencyId)
      .maybeSingle();

    // If the table doesn't exist yet (migration not applied) or any other DB error,
    // fall back to defaults so the UI still renders
    if (error) {
      console.warn("receptionist_config query failed (table may not exist yet):", error.message);
    }

    const config = mapReceptionistConfigRowToApi(
      (row as ReceptionistConfigRow | null) ?? defaultRow(agencyId)
    );
    return jsonResponse({ data: config }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/ai/receptionist/config
 * Upsert the receptionist config and trigger Retell sync.
 */
export async function PATCH(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = UpdateReceptionistConfigSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    // Normalize phone numbers to E.164 before persisting to DB
    const upsertRow = {
      ...mapApiToReceptionistConfigRow(parsed.data, agencyId),
      reception_line: toE164(parsed.data.phoneSetup.receptionLine),
      escalation_number: toE164(parsed.data.phoneSetup.escalationNumber),
      updated_at: new Date().toISOString(),
    };

    // Upsert: insert if new, update if existing
    let { data: updated, error } = await supabase
      .from("receptionist_config")
      .upsert(upsertRow, { onConflict: "agency_id" })
      .select()
      .single();

    // If new v2 columns don't exist yet (migration 039 not applied), retry
    // with only the base columns so saves still work without the migration.
    if (error && error.message?.includes("column") && error.message?.includes("does not exist")) {
      console.warn("Migration 039 not applied — saving without v2 columns:", error.message);
      const {
        hours_monday, hours_tuesday, hours_wednesday, hours_thursday,
        hours_friday, hours_saturday, hours_sunday,
        services_summary, business_hours_label,
        intake_cg_full_name_required, intake_cg_phone_number_required,
        intake_cg_email_required, intake_cg_location_required,
        intake_cg_experience_required, intake_cg_certifications_required,
        intake_cg_availability_required, intake_cg_transportation_required,
        intake_cg_notes_required,
        ...baseRow
      } = upsertRow;
      const fallback = await supabase
        .from("receptionist_config")
        .upsert(baseRow, { onConflict: "agency_id" })
        .select()
        .single();
      updated = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("Failed to upsert receptionist config:", error);
      const hint = error.message?.includes("relation") && error.message?.includes("does not exist")
        ? " Run migration 038_create_receptionist_config.sql first."
        : "";
      return errorResponse("Failed to save receptionist config." + hint, 500);
    }

    // Trigger Retell sync (async, does not block response on failure)
    const serviceClient = createServerSupabaseServiceClient();
    if (serviceClient) {
      const syncResult = await syncConfigToRetell(
        updated as ReceptionistConfigRow,
        serviceClient
      );

      // Re-fetch to get updated sync status
      if (syncResult.status !== "pending") {
        const { data: refreshed } = await supabase
          .from("receptionist_config")
          .select("*")
          .eq("agency_id", agencyId)
          .single();

        if (refreshed) {
          const config = mapReceptionistConfigRowToApi(refreshed as ReceptionistConfigRow);
          return jsonResponse({ data: config }, 200);
        }
      }
    }

    const config = mapReceptionistConfigRowToApi(updated as ReceptionistConfigRow);
    return jsonResponse({ data: config }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
