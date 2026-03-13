// =============================================================================
// Auto Scheduler: Shared Outreach Dispatch Logic
// =============================================================================
// Extracted from app/api/coordinator/outreach/route.ts
// Used by both the manual outreach API and the auto-scheduler trigger.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type Retell from "retell-sdk";
import { toE164 } from "@/lib/phone";

export interface OutreachParams {
  agencyId: string;
  eventId: string;
  caregivers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  }>;
  autoCoverageSessionId?: string;
}

export interface OutreachResult {
  caregiverId: string;
  channel: string;
  success: boolean;
  attemptId?: string;
  error?: string;
}

/**
 * Dispatch outbound calls to a list of caregivers for a vacant shift.
 * Creates outreach_attempt rows and initiates Retell phone calls.
 */
export async function dispatchOutreach(
  supabase: SupabaseClient,
  retell: Retell | null,
  outboundAgentId: string | null,
  coverageLine: string | null,
  params: OutreachParams,
  shiftDetails: {
    agencyName: string;
    clientName: string;
    shiftDate: string;
    shiftTime: string;
    careType: string;
    payRate: string;
  }
): Promise<OutreachResult[]> {
  const results: OutreachResult[] = [];

  const dynamicVars = {
    caregiver_name: "",
    agency_name: shiftDetails.agencyName,
    client_name: shiftDetails.clientName,
    shift_date: shiftDetails.shiftDate,
    shift_time: shiftDetails.shiftTime,
    care_type: shiftDetails.careType,
    pay_rate: shiftDetails.payRate,
  };

  for (const cg of params.caregivers) {
    const phone = cg.phone ? toE164(cg.phone) : null;
    if (!phone) {
      results.push({ caregiverId: cg.id, channel: "call", success: false, error: "No phone number" });
      continue;
    }

    const caregiverName = `${cg.firstName} ${cg.lastName}`.trim();

    const { data: attempt } = await supabase
      .from("outreach_attempts")
      .insert({
        agency_id: params.agencyId,
        event_id: params.eventId,
        caregiver_id: cg.id,
        channel: "call",
        status: "pending",
      })
      .select("id")
      .single();

    if (!attempt) {
      results.push({ caregiverId: cg.id, channel: "call", success: false, error: "Failed to create attempt" });
      continue;
    }

    if (!retell || !outboundAgentId || !coverageLine) {
      await supabase
        .from("outreach_attempts")
        .update({ status: "failed", response_notes: "Retell not configured or no coverage line" })
        .eq("id", attempt.id);
      results.push({ caregiverId: cg.id, channel: "call", success: false, error: "Retell not configured" });
      continue;
    }

    try {
      const call = await retell.call.createPhoneCall({
        from_number: toE164(coverageLine),
        to_number: phone,
        override_agent_id: outboundAgentId,
        retell_llm_dynamic_variables: { ...dynamicVars, caregiver_name: caregiverName },
        metadata: {
          outreach_attempt_id: attempt.id,
          event_id: params.eventId,
          caregiver_id: cg.id,
          agency_id: params.agencyId,
          ...(params.autoCoverageSessionId && { auto_coverage_session_id: params.autoCoverageSessionId }),
        },
      } as any);

      await supabase
        .from("outreach_attempts")
        .update({ retell_call_id: call.call_id, status: "in_progress" })
        .eq("id", attempt.id);

      results.push({ caregiverId: cg.id, channel: "call", success: true, attemptId: attempt.id });
    } catch (err) {
      console.error(`[outreach] Call failed for ${cg.id}:`, err);
      await supabase
        .from("outreach_attempts")
        .update({
          status: "failed",
          response_notes: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", attempt.id);
      results.push({
        caregiverId: cg.id,
        channel: "call",
        success: false,
        error: err instanceof Error ? err.message : "Call failed",
      });
    }

    // Stagger calls by 200ms to avoid Retell rate limits
    if (params.caregivers.indexOf(cg) < params.caregivers.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
