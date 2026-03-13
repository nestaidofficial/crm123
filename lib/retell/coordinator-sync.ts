// =============================================================================
// Retell AI: Sync coordinator config → Retell LLM + Agent
// =============================================================================
// Same 3-step flow as receptionist sync:
// 1. Creates/updates a Retell LLM with the conversational flow prompt
// 2. Creates/updates a Retell Agent linked to that LLM
// 3. Links the phone number to the agent
// 4. Updates coordinator_config with IDs + status
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRetellClient } from "./client";
import { buildCoordinatorLlmConfig } from "./coordinator-prompt";
import type { CoordinatorConfigRow } from "@/lib/db/coordinator.mapper";
import { getAppUrl } from "@/lib/url";

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+${digits}`;
}

/**
 * Sync a coordinator config row to Retell AI.
 *
 * If RETELL_API_KEY is not set, sets sync status to 'pending' and returns.
 */
export async function syncCoordinatorToRetell(
  row: CoordinatorConfigRow,
  serviceSupabase: SupabaseClient
): Promise<{ status: "synced" | "pending" | "error"; error?: string }> {
  const retell = getRetellClient();

  if (!retell) {
    await serviceSupabase
      .from("coordinator_config")
      .update({
        retell_sync_status: "pending",
        retell_sync_error: null,
      })
      .eq("agency_id", row.agency_id);

    return { status: "pending" };
  }

  // Normalize phone numbers
  const normalizedRow: CoordinatorConfigRow = {
    ...row,
    human_backup_number: row.human_backup_number ? toE164(row.human_backup_number) : row.human_backup_number,
    coverage_line: row.coverage_line ? toE164(row.coverage_line) : row.coverage_line,
  };

  const agentName = "AI Coverage Coordinator";
  const llmConfig = buildCoordinatorLlmConfig(normalizedRow);

  const postCallAnalysisData = [
    {
      name: "call_type",
      type: "enum" as any,
      description: "The type of scheduling call",
      choices: ["caregiver_callout", "schedule_change", "reschedule", "missed_visit", "availability_update", "open_shift_question", "same_day_coverage", "escalation", "other"],
    },
    {
      name: "caregiver_name",
      type: "string" as any,
      description: "The caregiver's name if provided",
    },
    {
      name: "caregiver_short_id",
      type: "string" as any,
      description: "The caregiver's employee ID if provided (e.g. E-1005). Extract exactly as spoken.",
    },
    {
      name: "client_name",
      type: "string" as any,
      description: "The client's name if mentioned",
    },
    {
      name: "shift_date",
      type: "string" as any,
      description: "The affected shift date if mentioned",
    },
    {
      name: "call_summary",
      type: "string" as any,
      description: "Brief summary of what was discussed and any action items",
    },
    {
      name: "coverage_needed",
      type: "boolean" as any,
      description: "Whether shift coverage is needed",
    },
  ];

  try {
    // ── Step 1: Create or update the LLM ───────────────────────────
    let llmId = row.retell_llm_id;

    if (!llmId) {
      const llm = await retell.llm.create({
        begin_message: llmConfig.begin_message,
        general_prompt: llmConfig.general_prompt,
        general_tools: llmConfig.general_tools as any,
        starting_state: llmConfig.starting_state,
        states: llmConfig.states as any,
        model: llmConfig.model as any,
        model_temperature: llmConfig.model_temperature,
      });
      llmId = llm.llm_id;

      await serviceSupabase.from("retell_sync_log").insert({
        agency_id: row.agency_id,
        action: "coordinator.llm.create",
        status: "success",
        request_payload: { model: llmConfig.model, states: llmConfig.states.map((s: any) => s.name) },
        response_payload: { llm_id: llmId },
      });
    } else {
      try {
        await retell.llm.update(llmId, {
          begin_message: llmConfig.begin_message,
          general_prompt: llmConfig.general_prompt,
          general_tools: llmConfig.general_tools as any,
          starting_state: llmConfig.starting_state,
          states: llmConfig.states as any,
          model: llmConfig.model as any,
          model_temperature: llmConfig.model_temperature,
        });

        await serviceSupabase.from("retell_sync_log").insert({
          agency_id: row.agency_id,
          action: "coordinator.llm.update",
          status: "success",
          request_payload: { llm_id: llmId, model: llmConfig.model },
          response_payload: { llm_id: llmId },
        });
      } catch (updateErr) {
        console.warn(`[Retell Coordinator] LLM update failed (${llmId}), creating fresh LLM:`, updateErr);
        const llm = await retell.llm.create({
          begin_message: llmConfig.begin_message,
          general_prompt: llmConfig.general_prompt,
          general_tools: llmConfig.general_tools as any,
          starting_state: llmConfig.starting_state,
          states: llmConfig.states as any,
          model: llmConfig.model as any,
          model_temperature: llmConfig.model_temperature,
        });
        llmId = llm.llm_id;

        await serviceSupabase.from("retell_sync_log").insert({
          agency_id: row.agency_id,
          action: "coordinator.llm.recreate",
          status: "success",
          request_payload: { previous_llm_id: row.retell_llm_id, model: llmConfig.model },
          response_payload: { llm_id: llmId },
        });
      }
    }

    // ── Step 2: Create or update the Agent ──────────────────────────
    let agentId = row.retell_agent_id;

    const appUrl = getAppUrl();
    const webhookUrl = `${appUrl}/api/retell/webhook`;
    console.log(`[Retell Coordinator] Webhook URL being pushed to Retell: ${webhookUrl}`);

    if (!agentId) {
      const agent = await retell.agent.create({
        agent_name: agentName,
        response_engine: {
          type: "retell-llm",
          llm_id: llmId,
        },
        voice_id: "11labs-Adrian",
        language: "en-US",
        voice_speed: 1.0,
        voice_temperature: 0.5,
        responsiveness: 0.7,
        interruption_sensitivity: 0.6,
        ambient_sound: "call-center",
        ambient_sound_volume: 0.3,
        reminder_trigger_ms: 8000,
        reminder_max_count: 2,
        end_call_after_silence_ms: 30000,
        max_call_duration_ms: 1800000, // 30 minutes
        normalize_for_speech: true,
        enable_voicemail_detection: true,
        webhook_url: webhookUrl,
        voicemail_message: "Hi, you've reached the scheduling and coverage line. We're unable to take your call right now. Please leave a message with your name and details, and we'll get back to you as soon as possible.",
        post_call_analysis_data: postCallAnalysisData,
      } as any);
      agentId = agent.agent_id;

      await serviceSupabase.from("retell_sync_log").insert({
        agency_id: row.agency_id,
        action: "coordinator.agent.create",
        status: "success",
        request_payload: { agent_name: agentName, llm_id: llmId, voice_id: "11labs-Adrian" },
        response_payload: { agent_id: agentId },
      });
    } else {
      await retell.agent.update(agentId, {
        agent_name: agentName,
        response_engine: {
          type: "retell-llm",
          llm_id: llmId,
        },
        voice_id: "11labs-Adrian",
        webhook_url: webhookUrl,
        voicemail_message: "Hi, you've reached the scheduling and coverage line. We're unable to take your call right now. Please leave a message with your name and details, and we'll get back to you as soon as possible.",
        post_call_analysis_data: postCallAnalysisData,
      } as any);

      await serviceSupabase.from("retell_sync_log").insert({
        agency_id: row.agency_id,
        action: "coordinator.agent.update",
        status: "success",
        request_payload: { agent_id: agentId, agent_name: agentName, llm_id: llmId },
        response_payload: { agent_id: agentId },
      });
    }

    // ── Step 3: Link agent to the coverage phone number ────────────
    let phoneNumberId = row.retell_phone_number_id;
    if (row.coverage_line) {
      const coverageE164 = toE164(row.coverage_line);
      try {
        const phoneNumbers = await retell.phoneNumber.list();
        const matchedPhone = phoneNumbers.find(
          (p: any) => p.phone_number === coverageE164
        );

        if (matchedPhone) {
          await retell.phoneNumber.update(coverageE164, {
            inbound_agents: [{ agent_id: agentId, weight: 1 }],
          } as any);
          phoneNumberId = matchedPhone.phone_number;

          await serviceSupabase.from("retell_sync_log").insert({
            agency_id: row.agency_id,
            action: "coordinator.phone.link",
            status: "success",
            request_payload: { phone_number: coverageE164, agent_id: agentId },
            response_payload: { phone_number: coverageE164 },
          });
        } else {
          console.warn(
            `[Retell Coordinator] Phone number ${coverageE164} not found in Retell account. ` +
            `Add it in the Retell dashboard and link it to agent ${agentId}.`
          );
          await serviceSupabase.from("retell_sync_log").insert({
            agency_id: row.agency_id,
            action: "coordinator.phone.link",
            status: "error",
            request_payload: { phone_number: coverageE164 },
            error_message: `Number ${coverageE164} not found in Retell. Add it in the Retell dashboard.`,
          });
        }
      } catch (phoneErr) {
        console.warn("[Retell Coordinator] Phone number linking failed:", phoneErr);
      }
    }

    // ── Step 4: Update config with sync result ─────────────────────
    await serviceSupabase
      .from("coordinator_config")
      .update({
        retell_llm_id: llmId,
        retell_agent_id: agentId,
        retell_phone_number_id: phoneNumberId,
        retell_sync_status: "synced",
        retell_sync_error: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq("agency_id", row.agency_id);

    return { status: "synced" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown Retell API error";

    await serviceSupabase.from("retell_sync_log").insert({
      agency_id: row.agency_id,
      action: row.retell_agent_id ? "coordinator.sync.update" : "coordinator.sync.create",
      status: "error",
      request_payload: { agent_name: agentName },
      error_message: errorMessage,
    });

    await serviceSupabase
      .from("coordinator_config")
      .update({
        retell_sync_status: "error",
        retell_sync_error: errorMessage,
      })
      .eq("agency_id", row.agency_id);

    return { status: "error", error: errorMessage };
  }
}
