import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Retell from "retell-sdk";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/url";
import { normalizeShortId } from "@/lib/utils";
import { handleAutoAssignment } from "@/lib/auto-scheduler/assign";
import { triggerAutoCoverage } from "@/lib/auto-scheduler/trigger";

/** GET /api/retell/webhook — diagnostic: verify this endpoint is reachable */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    appUrl: getAppUrl(),
    timestamp: new Date().toISOString(),
  });
}

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

        // ── Handle outbound coverage call results ──────────────────
        const endMetadata = callData.metadata as Record<string, string> | undefined;
        if (endMetadata?.outreach_attempt_id) {
          const disconnectReason = callData.disconnect_reason ?? "";
          let attemptStatus: string;
          if (["voicemail_reached", "voicemail"].includes(disconnectReason)) {
            attemptStatus = "voicemail";
          } else if (["no_answer", "dial_no_answer"].includes(disconnectReason)) {
            attemptStatus = "no_answer";
          } else if (["error", "dial_failed"].includes(disconnectReason)) {
            attemptStatus = "failed";
          } else {
            // Call completed normally — keep status as-is until call_analyzed
            attemptStatus = "in_progress";
          }

          if (attemptStatus !== "in_progress") {
            await serviceClient
              .from("outreach_attempts")
              .update({
                status: attemptStatus,
                call_duration_ms: callData.duration_ms ?? null,
                responded_at: new Date().toISOString(),
              })
              .eq("id", endMetadata.outreach_attempt_id);
          } else {
            await serviceClient
              .from("outreach_attempts")
              .update({
                call_duration_ms: callData.duration_ms ?? null,
              })
              .eq("id", endMetadata.outreach_attempt_id);
          }
        }

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

        // ── Handle outbound coverage call analysis ──────────────
        const analyzedMetadata = callData.metadata as Record<string, string> | undefined;
        if (analyzedMetadata?.outreach_attempt_id) {
          await handleOutboundCallAnalysis(serviceClient, analyzedMetadata.outreach_attempt_id, analysis);
        } else {
          // ── Create coverage_requests row for inbound calls ──────
          await createRequestFromAnalysis(serviceClient, agencyId, callData.call_id, analysis);
        }

        break;
      }

      case "chat_analyzed": {
        console.log(`[Retell] Chat analyzed: ${callData.chat_id}`);

        const chatAnalysis = callData.chat_analysis ?? {};
        const chatMetadata = callData.metadata as Record<string, string> | undefined;

        if (chatMetadata?.outreach_attempt_id) {
          await handleOutboundCallAnalysis(serviceClient, chatMetadata.outreach_attempt_id, chatAnalysis);
        }

        const chatAgencyId = chatMetadata?.agency_id ?? "00000000-0000-0000-0000-000000000000";
        await serviceClient.from("retell_sync_log").insert({
          agency_id: chatAgencyId,
          action: "webhook.chat_analyzed",
          status: "success",
          request_payload: {
            chat_id: callData.chat_id,
            agent_id: callData.agent_id,
          },
          response_payload: {
            summary: chatAnalysis.chat_summary,
            sentiment: chatAnalysis.user_sentiment,
            custom_analysis: chatAnalysis.custom_analysis_data,
          },
        });
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

    console.log(`[Retell] createRequestFromAnalysis: callType=${callType}, requestType=${requestType}, callId=${callId}`);

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

    // Resolve caregiver_id (and name) from short ID if available
    const rawShortId = (custom.caregiver_short_id as string) || null;
    let caregiverId: string | null = null;
    let resolvedCaregiverName: string | null = null;

    if (rawShortId) {
      const normalized = normalizeShortId(rawShortId);
      if (normalized) {
        const { data: emp } = await supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("agency_id", agencyId)
          .eq("short_id", normalized)
          .eq("is_archived", false)
          .maybeSingle();
        if (emp) {
          caregiverId = emp.id;
          resolvedCaregiverName = `${emp.first_name} ${emp.last_name}`;
        }
      }
    }

    const normalizedShortId = rawShortId ? normalizeShortId(rawShortId) : null;

    // Check if auto-scheduler is enabled for auto-approve
    const { data: coordConfig } = await supabase
      .from("coordinator_config")
      .select("auto_scheduler_enabled")
      .eq("agency_id", agencyId)
      .maybeSingle();

    const autoApprove = coordConfig?.auto_scheduler_enabled && requestType === "callout";
    const status = autoApprove ? "approved" : "pending";

    await supabase.from("coverage_requests").insert({
      agency_id: agencyId,
      request_type: requestType,
      caregiver_name: resolvedCaregiverName || caregiverName,
      caregiver_id: caregiverId,
      client_name: clientName,
      shift_date: shiftDate,
      reason: callSummary,
      status,
      retell_call_id: callId,
      action_payload: {
        call_type: callType,
        client_name: clientName,
        coverage_needed: coverageNeeded,
        caregiver_short_id: normalizedShortId,
        source: "post_call_analysis",
      },
    });

    console.log(`[Retell] Created ${requestType} request from call ${callId} (status: ${status})`);

    // If auto-approved callout, find and vacate the shift + trigger outreach
    if (autoApprove && caregiverId && shiftDate) {
      try {
        // Find the shift to vacate
        const shiftStart = new Date(shiftDate);
        const dayStart = new Date(shiftStart);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(shiftStart);
        dayEnd.setHours(23, 59, 59, 999);

        const { data: targetShift } = await supabase
          .from("schedule_events")
          .select("id")
          .eq("agency_id", agencyId)
          .eq("caregiver_id", caregiverId)
          .gte("start_at", dayStart.toISOString())
          .lte("start_at", dayEnd.toISOString())
          .maybeSingle();

        if (targetShift) {
          // Vacate the shift
          await supabase
            .from("schedule_events")
            .update({ caregiver_id: null, is_open_shift: true })
            .eq("id", targetShift.id);

          // Add audit log
          await supabase.from("schedule_audit_log").insert({
            event_id: targetShift.id,
            agency_id: agencyId,
            action: "caregiver_removed",
            field_changed: "caregiver_id",
            old_value: JSON.stringify({ caregiver_id: caregiverId }),
            new_value: JSON.stringify({ caregiver_id: null }),
            actor_id: null,
          });

          // Trigger auto-coverage
          const serviceClient = createServerSupabaseServiceClient();
          if (serviceClient) {
            triggerAutoCoverage({
              agencyId,
              eventId: targetShift.id,
              originalCaregiverId: caregiverId,
              originalCallId: callId,
              supabase: serviceClient,
            }).catch((err) => {
              console.error("[Retell] Auto-coverage trigger failed:", err);
            });
          }

          console.log(`[Retell] Auto-approved callout: vacated shift ${targetShift.id} and triggered coverage`);
        } else {
          console.warn(`[Retell] Auto-approved callout but could not find shift for caregiver ${caregiverId} on ${shiftDate}`);
        }
      } catch (err) {
        console.error("[Retell] Failed to process auto-approved callout:", err);
      }
    }
  } catch (err) {
    // Log but don't fail the webhook — the sync log was already written
    console.error("[Retell] Failed to create request from analysis:", err);
  }
}

/**
 * Handle post-call analysis for outbound coverage calls.
 * Updates the outreach_attempts row with the caregiver's response.
 */
async function handleOutboundCallAnalysis(
  supabase: SupabaseClient,
  attemptId: string,
  analysis: Record<string, unknown>
) {
  try {
    const custom = (analysis.custom_analysis_data ?? {}) as Record<string, unknown>;
    const response = (custom.response as string) ?? "";
    const caregiverMessage = (custom.caregiver_message as string) ?? "";
    const summary = (custom.summary as string) ?? (analysis.summary as string) ?? "";

    let newStatus: string;
    if (response === "accepted") {
      newStatus = "accepted";
    } else if (response === "declined") {
      newStatus = "declined";
    } else if (response === "voicemail") {
      newStatus = "voicemail";
    } else if (response === "no_answer") {
      newStatus = "no_answer";
    } else {
      // Keep current status — don't overwrite if call_ended already set it
      newStatus = "no_answer";
    }

    await supabase
      .from("outreach_attempts")
      .update({
        status: newStatus,
        response_message: caregiverMessage || null,
        response_notes: summary || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", attemptId);

    console.log(`[Retell] Outbound call analyzed: attempt ${attemptId} → ${newStatus}`);

    // Auto-assign if accepted and auto-scheduler is active
    if (newStatus === "accepted") {
      await handleAutoAssignment(supabase, attemptId);
    }
  } catch (err) {
    console.error("[Retell] Failed to handle outbound call analysis:", err);
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

  // Fall back to coordinator_config (inbound agent)
  const { data: coordData } = await supabase
    .from("coordinator_config")
    .select("agency_id")
    .eq("retell_agent_id", retellAgentId)
    .maybeSingle();

  if (coordData?.agency_id) return coordData.agency_id;

  // Fall back to coordinator_config (outbound voice agent)
  const { data: outboundData } = await supabase
    .from("coordinator_config")
    .select("agency_id")
    .eq("retell_outbound_agent_id", retellAgentId)
    .maybeSingle();

  if (outboundData?.agency_id) return outboundData.agency_id;

  // Fall back to coordinator_config (outbound chat agent)
  const { data: chatData } = await supabase
    .from("coordinator_config")
    .select("agency_id")
    .eq("retell_outbound_chat_agent_id", retellAgentId)
    .maybeSingle();

  return chatData?.agency_id ?? fallback;
}
