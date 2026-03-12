// =============================================================================
// Retell AI: Sync outbound coverage agents (voice + SMS chat)
// =============================================================================
// Creates two agents for outbound coverage outreach:
// 1. Voice agent — for phone calls via createPhoneCall()
// 2. Chat agent — for SMS via createSMSChat()
// Both share the same LLM prompt, but are separate Retell agents.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRetellClient } from "./client";
import { buildOutboundLlmConfig } from "./outbound-prompt";
import { getAppUrl } from "@/lib/url";

/**
 * Ensure the outbound LLM exists. Returns the LLM ID.
 */
async function ensureOutboundLlm(
  agencyId: string,
  existingLlmId: string | null,
  serviceSupabase: SupabaseClient
): Promise<string | null> {
  if (existingLlmId) return existingLlmId;

  const retell = getRetellClient();
  if (!retell) return null;

  const llmConfig = buildOutboundLlmConfig();
  const llm = await retell.llm.create({
    begin_message: llmConfig.begin_message,
    general_prompt: llmConfig.general_prompt,
    general_tools: llmConfig.general_tools as any,
    starting_state: llmConfig.starting_state,
    states: llmConfig.states as any,
    model: llmConfig.model as any,
    model_temperature: llmConfig.model_temperature,
  });

  await serviceSupabase.from("retell_sync_log").insert({
    agency_id: agencyId,
    action: "outbound.llm.create",
    status: "success",
    request_payload: { model: llmConfig.model },
    response_payload: { llm_id: llm.llm_id },
  });

  return llm.llm_id;
}

/**
 * Ensure the outbound voice agent exists in Retell.
 * Lazily creates the LLM + Agent on first call, then caches IDs.
 *
 * Returns the outbound voice agent_id or null if Retell is not configured.
 */
export async function ensureOutboundAgent(
  agencyId: string,
  serviceSupabase: SupabaseClient
): Promise<string | null> {
  const retell = getRetellClient();
  if (!retell) return null;

  const { data: config } = await serviceSupabase
    .from("coordinator_config")
    .select("retell_outbound_agent_id, retell_outbound_llm_id, coverage_line")
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (config?.retell_outbound_agent_id) {
    return config.retell_outbound_agent_id;
  }

  const appUrl = getAppUrl();
  const webhookUrl = `${appUrl}/api/retell/webhook`;

  try {
    const llmId = await ensureOutboundLlm(agencyId, config?.retell_outbound_llm_id, serviceSupabase);
    if (!llmId) return null;

    const agent = await retell.agent.create({
      agent_name: "AI Coverage Outbound Caller",
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
      reminder_trigger_ms: 8000,
      reminder_max_count: 2,
      end_call_after_silence_ms: 20000,
      max_call_duration_ms: 300000,
      normalize_for_speech: true,
      enable_voicemail_detection: true,
      webhook_url: webhookUrl,
      voicemail_message:
        "Hi {{caregiver_name}}, this is {{agency_name}} calling about an open shift on {{shift_date}} from {{shift_time}}. Please call us back if you're available. Thank you!",
      post_call_analysis_data: [
        {
          name: "response",
          type: "enum" as any,
          description: "Whether the caregiver accepted or declined the shift",
          choices: ["accepted", "declined", "no_answer", "voicemail", "unknown"],
        },
        {
          name: "caregiver_message",
          type: "string" as any,
          description: "What the caregiver said in response",
        },
        {
          name: "summary",
          type: "string" as any,
          description: "Brief summary of the call",
        },
      ],
    } as any);

    const agentId = agent.agent_id;

    await serviceSupabase.from("retell_sync_log").insert({
      agency_id: agencyId,
      action: "outbound.agent.create",
      status: "success",
      request_payload: { agent_name: "AI Coverage Outbound Caller", llm_id: llmId },
      response_payload: { agent_id: agentId },
    });

    await serviceSupabase
      .from("coordinator_config")
      .update({
        retell_outbound_llm_id: llmId,
        retell_outbound_agent_id: agentId,
      })
      .eq("agency_id", agencyId);

    return agentId;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown Retell API error";
    console.error("[Retell Outbound] Failed to create voice agent:", errorMessage);

    await serviceSupabase.from("retell_sync_log").insert({
      agency_id: agencyId,
      action: "outbound.voice_agent.error",
      status: "error",
      error_message: errorMessage,
    });

    return null;
  }
}

/**
 * Ensure the outbound SMS chat agent exists in Retell.
 * This is a separate agent from the voice agent, configured for chat mode.
 * Uses the same LLM as the voice agent.
 *
 * Returns the outbound chat agent_id or null if Retell is not configured.
 */
export async function ensureOutboundChatAgent(
  agencyId: string,
  serviceSupabase: SupabaseClient
): Promise<string | null> {
  const retell = getRetellClient();
  if (!retell) return null;

  const { data: config } = await serviceSupabase
    .from("coordinator_config")
    .select("retell_outbound_chat_agent_id, retell_outbound_llm_id")
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (config?.retell_outbound_chat_agent_id) {
    return config.retell_outbound_chat_agent_id;
  }

  const appUrl = getAppUrl();
  const webhookUrl = `${appUrl}/api/retell/webhook`;

  try {
    const llmId = await ensureOutboundLlm(agencyId, config?.retell_outbound_llm_id, serviceSupabase);
    if (!llmId) return null;

    // Create a chat-mode agent for SMS outreach
    const agent = await retell.agent.create({
      agent_name: "AI Coverage SMS Outreach",
      response_engine: {
        type: "retell-llm",
        llm_id: llmId,
      },
      agent_type: "text",
      webhook_url: webhookUrl,
      post_call_analysis_data: [
        {
          name: "response",
          type: "enum" as any,
          description: "Whether the caregiver accepted or declined the shift",
          choices: ["accepted", "declined", "no_answer", "unknown"],
        },
        {
          name: "caregiver_message",
          type: "string" as any,
          description: "What the caregiver said in response",
        },
        {
          name: "summary",
          type: "string" as any,
          description: "Brief summary of the chat",
        },
      ],
    } as any);

    const chatAgentId = agent.agent_id;

    await serviceSupabase.from("retell_sync_log").insert({
      agency_id: agencyId,
      action: "outbound.chat_agent.create",
      status: "success",
      request_payload: { agent_name: "AI Coverage SMS Outreach", llm_id: llmId },
      response_payload: { agent_id: chatAgentId },
    });

    await serviceSupabase
      .from("coordinator_config")
      .update({
        retell_outbound_llm_id: llmId,
        retell_outbound_chat_agent_id: chatAgentId,
      })
      .eq("agency_id", agencyId);

    return chatAgentId;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown Retell API error";
    console.error("[Retell Outbound] Failed to create chat agent:", errorMessage);

    await serviceSupabase.from("retell_sync_log").insert({
      agency_id: agencyId,
      action: "outbound.chat_agent.error",
      status: "error",
      error_message: errorMessage,
    });

    return null;
  }
}
