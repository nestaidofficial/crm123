import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Retell from "retell-sdk";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/retell/webhook
 * Handles Retell call lifecycle events.
 * This endpoint is called by Retell when call events occur.
 *
 * Configure this URL in your Retell agent's webhook_url:
 *   https://your-domain.com/api/retell/webhook
 *
 * Events handled:
 *   - call_started: Log that a call began
 *   - call_ended: Log call completion + save transcript
 *   - call_analyzed: Save post-call analysis (caller intent, summary, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // ── Verify webhook signature ───────────────────────────────────
    const apiKey = process.env.RETELL_API_KEY;
    if (apiKey) {
      const signature = request.headers.get("x-retell-signature") ?? "";
      const isValid = await Retell.verify(body, apiKey, signature);
      if (!isValid) {
        console.warn("Retell webhook: invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(body);
    const eventType = event.event as string;
    const callData = event.call ?? event.data ?? {};

    const serviceClient = createServerSupabaseServiceClient();
    if (!serviceClient) {
      console.error("Retell webhook: service client not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // ── Route by event type ────────────────────────────────────────
    switch (eventType) {
      case "call_started": {
        console.log(`[Retell] Call started: ${callData.call_id} (agent: ${callData.agent_id})`);

        await serviceClient.from("retell_sync_log").insert({
          agency_id: await resolveAgencyId(serviceClient, callData.agent_id),
          action: "webhook.call_started",
          status: "success",
          request_payload: {
            call_id: callData.call_id,
            call_type: callData.call_type,
            direction: callData.direction,
            from_number: callData.from_number,
            to_number: callData.to_number,
            agent_id: callData.agent_id,
          },
        });
        break;
      }

      case "call_ended": {
        console.log(`[Retell] Call ended: ${callData.call_id} (duration: ${callData.duration_ms}ms)`);

        await serviceClient.from("retell_sync_log").insert({
          agency_id: await resolveAgencyId(serviceClient, callData.agent_id),
          action: "webhook.call_ended",
          status: "success",
          request_payload: {
            call_id: callData.call_id,
            call_status: callData.call_status,
            direction: callData.direction,
            from_number: callData.from_number,
            to_number: callData.to_number,
            duration_ms: callData.duration_ms,
            disconnect_reason: callData.disconnect_reason,
          },
          response_payload: {
            transcript: callData.transcript,
            recording_url: callData.recording_url,
          },
        });
        break;
      }

      case "call_analyzed": {
        console.log(`[Retell] Call analyzed: ${callData.call_id}`);

        const analysis = callData.call_analysis ?? {};
        const agencyId = await resolveAgencyId(serviceClient, callData.agent_id);

        await serviceClient.from("retell_sync_log").insert({
          agency_id: agencyId,
          action: "webhook.call_analyzed",
          status: "success",
          request_payload: {
            call_id: callData.call_id,
            agent_id: callData.agent_id,
          },
          response_payload: {
            sentiment: analysis.sentiment,
            summary: analysis.summary,
            custom_analysis: analysis.custom_analysis_data,
            collected_variables: callData.collected_dynamic_variables,
            call_cost: callData.call_cost,
          },
        });

        // ── Create coverage_requests row for non-cancel calls ──────
        await createRequestFromAnalysis(serviceClient, agencyId, callData.call_id, analysis);

        break;
      }

      default:
        console.log(`[Retell] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Retell webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// ── Map Retell call_type → DB request_type ────────────────────────
const CALL_TYPE_TO_REQUEST_TYPE: Record<string, string> = {
  caregiver_callout: "callout",
  same_day_coverage: "callout",
  missed_visit: "callout",
  schedule_change: "schedule_change",
  reschedule: "reschedule",
  availability_update: "availability_update",
  open_shift_question: "availability_update",
};

const SKIP_CALL_TYPES = new Set(["other", "escalation"]);

/**
 * After post-call analysis, create a coverage_requests row if the call
 * represents an actionable request and no row was already created mid-call
 * (e.g. by the cancel_shift tool).
 */
async function createRequestFromAnalysis(
  supabase: SupabaseClient,
  agencyId: string,
  callId: string,
  analysis: Record<string, unknown>
) {
  try {
    const custom = (analysis.custom_analysis_data ?? {}) as Record<string, unknown>;
    const callType = (custom.call_type as string) ?? "";

    // Skip non-actionable call types
    if (!callType || SKIP_CALL_TYPES.has(callType)) return;

    const requestType = CALL_TYPE_TO_REQUEST_TYPE[callType];
    if (!requestType) return;

    // Duplicate check — cancel_shift tool may have already created a row
    const { data: existing } = await supabase
      .from("coverage_requests")
      .select("id")
      .eq("retell_call_id", callId)
      .maybeSingle();

    if (existing) {
      console.log(`[Retell] Skipping request creation — row already exists for call ${callId}`);
      return;
    }

    const caregiverName = (custom.caregiver_name as string) || null;
    const clientName = (custom.client_name as string) || null;
    const shiftDate = (custom.shift_date as string) || null;
    const callSummary = (custom.call_summary as string) || (analysis.summary as string) || null;
    const coverageNeeded = custom.coverage_needed ?? null;

    await supabase.from("coverage_requests").insert({
      agency_id: agencyId,
      request_type: requestType,
      caregiver_name: caregiverName,
      client_name: clientName,
      shift_date: shiftDate,
      reason: callSummary,
      status: "pending",
      retell_call_id: callId,
      action_payload: {
        call_type: callType,
        client_name: clientName,
        coverage_needed: coverageNeeded,
        source: "post_call_analysis",
      },
    });

    console.log(`[Retell] Created ${requestType} request from call ${callId}`);
  } catch (err) {
    // Log but don't fail the webhook — the sync log was already written
    console.error("[Retell] Failed to create request from analysis:", err);
  }
}

/**
 * Look up which agency owns a given Retell agent_id.
 * Returns the agency_id or a placeholder if not found.
 */
async function resolveAgencyId(
  supabase: SupabaseClient,
  retellAgentId: string | undefined
): Promise<string> {
  const fallback = "00000000-0000-0000-0000-000000000000";
  if (!retellAgentId) return fallback;

  // Check receptionist_config first
  const { data: recepData } = await supabase
    .from("receptionist_config")
    .select("agency_id")
    .eq("retell_agent_id", retellAgentId)
    .maybeSingle();

  if (recepData?.agency_id) return recepData.agency_id;

  // Fall back to coordinator_config
  const { data: coordData } = await supabase
    .from("coordinator_config")
    .select("agency_id")
    .eq("retell_agent_id", retellAgentId)
    .maybeSingle();

  return coordData?.agency_id ?? fallback;
}
