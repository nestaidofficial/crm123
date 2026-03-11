// =============================================================================
// Retell AI: Sync receptionist config → Retell LLM + Agent
// =============================================================================
// 1. Creates/updates a Retell LLM with the conversational flow prompt
// 2. Creates/updates a Retell Agent linked to that LLM
// 3. Logs all operations to retell_sync_log
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRetellClient } from "./client";
import { buildLlmConfig } from "./prompt";
import type { ReceptionistConfigRow } from "@/lib/db/receptionist.mapper";

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+${digits}`;
}

/**
 * Sync a receptionist config row to Retell AI.
 *
 * Flow:
 *   1. Create or update Retell LLM (conversational prompt + states + tools)
 *   2. Create or update Retell Agent (linked to LLM, voice settings)
 *   3. Update receptionist_config with IDs + sync status
 *   4. Log everything to retell_sync_log
 *
 * If RETELL_API_KEY is not set, sets sync status to 'pending' and returns.
 */
export async function syncConfigToRetell(
  row: ReceptionistConfigRow,
  serviceSupabase: SupabaseClient
): Promise<{ status: "synced" | "pending" | "error"; error?: string }> {
  const retell = getRetellClient();

  if (!retell) {
    await serviceSupabase
      .from("receptionist_config")
      .update({
        retell_sync_status: "pending",
        retell_sync_error: null,
      })
      .eq("agency_id", row.agency_id);

    return { status: "pending" };
  }

  // Normalize phone numbers in the row BEFORE anything else
  // This ensures E.164 format regardless of what's stored in the DB
  const normalizedRow: ReceptionistConfigRow = {
    ...row,
    escalation_number: row.escalation_number ? toE164(row.escalation_number) : row.escalation_number,
    reception_line: row.reception_line ? toE164(row.reception_line) : row.reception_line,
  };

  console.log("[Retell Sync] Escalation number:", row.escalation_number, "→", normalizedRow.escalation_number);
  console.log("[Retell Sync] Reception line:", row.reception_line, "→", normalizedRow.reception_line);

  const agentName = `${normalizedRow.agency_name || "Agency"} AI Receptionist`;
  const llmConfig = buildLlmConfig(normalizedRow);

  try {
    // ── Step 1: Create or update the LLM ───────────────────────────
    let llmId = row.retell_llm_id;

    if (!llmId) {
      // Create new LLM
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
        action: "llm.create",
        status: "success",
        request_payload: { model: llmConfig.model, states: llmConfig.states.map((s) => s.name) },
        response_payload: { llm_id: llmId },
      });
    } else {
      // Update existing LLM — fall back to create if the LLM is stale/deleted
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
          action: "llm.update",
          status: "success",
          request_payload: { llm_id: llmId, model: llmConfig.model },
          response_payload: { llm_id: llmId },
        });
      } catch (updateErr) {
        // LLM may have been deleted or is in a bad state — create a fresh one
        console.warn(`[Retell] LLM update failed (${llmId}), creating fresh LLM:`, updateErr);
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
          action: "llm.recreate",
          status: "success",
          request_payload: { previous_llm_id: row.retell_llm_id, model: llmConfig.model },
          response_payload: { llm_id: llmId },
        });
      }
    }

    // ── Step 2: Create or update the Agent ──────────────────────────
    let agentId = row.retell_agent_id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";
    const webhookUrl = `${appUrl}/api/retell/webhook`;

    if (!agentId) {
      // Create new agent linked to the LLM
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
        voicemail_message: `Hi, you've reached the AI receptionist for ${row.agency_name}. We're unable to take your call right now. Please leave a message and we'll get back to you as soon as possible.`,
        post_call_analysis_data: [
          {
            name: "caller_intent",
            type: "enum" as any,
            description: "The primary reason the caller called",
            choices: ["new_client_intake", "caregiver_application", "scheduling", "billing", "complaint", "general_inquiry", "other"],
          },
          {
            name: "caller_name",
            type: "string" as any,
            description: "The caller's name if provided",
          },
          {
            name: "caller_phone",
            type: "string" as any,
            description: "The caller's phone number if provided",
          },
          {
            name: "call_summary",
            type: "string" as any,
            description: "Brief summary of what was discussed and any action items",
          },
          {
            name: "follow_up_needed",
            type: "boolean" as any,
            description: "Whether a human follow-up is needed",
          },
        ],
      } as any);
      agentId = agent.agent_id;

      await serviceSupabase.from("retell_sync_log").insert({
        agency_id: row.agency_id,
        action: "agent.create",
        status: "success",
        request_payload: { agent_name: agentName, llm_id: llmId, voice_id: "11labs-Adrian" },
        response_payload: { agent_id: agentId },
      });
    } else {
      // Update existing agent
      await retell.agent.update(agentId, {
        agent_name: agentName,
        response_engine: {
          type: "retell-llm",
          llm_id: llmId,
        },
        voice_id: "11labs-Adrian",
        webhook_url: webhookUrl,
        voicemail_message: `Hi, you've reached the AI receptionist for ${row.agency_name}. We're unable to take your call right now. Please leave a message and we'll get back to you as soon as possible.`,
      } as any);

      await serviceSupabase.from("retell_sync_log").insert({
        agency_id: row.agency_id,
        action: "agent.update",
        status: "success",
        request_payload: { agent_id: agentId, agent_name: agentName, llm_id: llmId },
        response_payload: { agent_id: agentId },
      });
    }

    // ── Step 3: Link agent to the reception phone number ────────────
    let phoneNumberId = row.retell_phone_number_id;
    if (row.reception_line) {
      const receptionE164 = toE164(row.reception_line);
      try {
        // List all phone numbers and find the one matching reception_line
        const phoneNumbers = await retell.phoneNumber.list();
        const matchedPhone = phoneNumbers.find(
          (p: any) => p.phone_number === receptionE164
        );

        if (matchedPhone) {
          // Link this number to our agent (inbound calls → this agent)
          await retell.phoneNumber.update(receptionE164, {
            inbound_agents: [{ agent_id: agentId, weight: 1 }],
          } as any);
          phoneNumberId = matchedPhone.phone_number;

          await serviceSupabase.from("retell_sync_log").insert({
            agency_id: row.agency_id,
            action: "phone.link",
            status: "success",
            request_payload: { phone_number: receptionE164, agent_id: agentId },
            response_payload: { phone_number: receptionE164 },
          });
        } else {
          // Number not found in Retell — log a warning but don't fail
          console.warn(
            `[Retell] Phone number ${receptionE164} not found in Retell account. ` +
            `Add it in the Retell dashboard and link it to agent ${agentId}.`
          );
          await serviceSupabase.from("retell_sync_log").insert({
            agency_id: row.agency_id,
            action: "phone.link",
            status: "error",
            request_payload: { phone_number: receptionE164 },
            error_message: `Number ${receptionE164} not found in Retell. Add it in the Retell dashboard.`,
          });
        }
      } catch (phoneErr) {
        // Phone linking failure is non-fatal — agent still works via Retell dashboard
        console.warn("[Retell] Phone number linking failed:", phoneErr);
      }
    }

    // ── Step 4: Update config with sync result ─────────────────────
    await serviceSupabase
      .from("receptionist_config")
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

    // Log error
    await serviceSupabase.from("retell_sync_log").insert({
      agency_id: row.agency_id,
      action: row.retell_agent_id ? "sync.update" : "sync.create",
      status: "error",
      request_payload: { agent_name: agentName },
      error_message: errorMessage,
    });

    // Update config with error status (config is still saved to Supabase)
    await serviceSupabase
      .from("receptionist_config")
      .update({
        retell_sync_status: "error",
        retell_sync_error: errorMessage,
      })
      .eq("agency_id", row.agency_id);

    return { status: "error", error: errorMessage };
  }
}
