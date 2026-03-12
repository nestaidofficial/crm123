// =============================================================================
// Retell AI: Conversational Flow Builder for Coverage Coordinator
// =============================================================================
// Builds LLM configuration (prompt, states, tools) from coordinator config.
// This defines the entire conversational flow the AI coordinator follows.
// =============================================================================

import type { CoordinatorConfigRow } from "@/lib/db/coordinator.mapper";
import type { RetellLlmConfig } from "./prompt";
import { getAppUrl } from "@/lib/url";

/** Retell EndCallTool */
interface EndCallTool {
  type: "end_call";
  name: string;
  description?: string;
}

/** Retell TransferCallTool */
interface TransferCallTool {
  type: "transfer_call";
  name: string;
  description?: string;
  transfer_destination: {
    type: "predefined";
    number: string;
  };
  transfer_option: {
    type: "cold_transfer";
  };
  speak_during_execution?: boolean;
  execution_message_description?: string;
}

/** Retell CustomTool (function calling mid-conversation) */
interface CustomTool {
  type: "custom";
  name: string;
  description: string;
  url: string;
  speak_during_execution?: boolean;
  execution_message_description?: string;
  parameters?: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

type RetellTool = EndCallTool | TransferCallTool | CustomTool;

interface RetellState {
  name: string;
  state_prompt: string;
  edges?: Array<{
    description: string;
    destination_state_name: string;
  }>;
  tools?: RetellTool[];
}

// ─── Helpers ──────────────────────────────────────────────────────

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+${digits}`;
}

function listEnabledItems(
  items: Array<{ flag: boolean; label: string }>
): string {
  const enabled = items.filter((i) => i.flag).map((i) => i.label);
  return enabled.length > 0 ? enabled.join(", ") : "None";
}

// ─── Main Builder ─────────────────────────────────────────────────

export function buildCoordinatorLlmConfig(row: CoordinatorConfigRow): RetellLlmConfig {
  const operatingLabel =
    row.operating_mode === "24/7" ? "24/7"
    : row.operating_mode === "business-hours" ? "during business hours only"
    : "after-hours only";

  // ── General prompt ──────────────────────────────────────────────
  const generalPrompt = `## IDENTITY & ROLE
You are the AI Coverage Coordinator — the dedicated scheduling and coverage line for a licensed home care agency.

Your job is to handle inbound calls related to scheduling: caregiver call-outs, shift coverage, schedule changes, availability updates, and missed visits. You are calm, efficient, and empathetic.

## OPERATING MODE
This line operates: ${operatingLabel}

## COMMUNICATION STYLE
- Speak in short, natural sentences. This is a phone call — be direct but warm.
- If the caller sounds stressed (they often are — coverage issues are time-sensitive), acknowledge it: "I understand this is urgent, let me help right away."
- Never use hollow filler phrases like "Absolutely!", "Certainly!" — use natural acknowledgments like "Got it", "I understand", "Let me take care of that."
- Keep responses short. One or two sentences per turn.

## YOUR JOB
You handle inbound calls for the coverage/scheduling line. Your goals are:
1. Identify the type of call (call-out, schedule change, availability update, etc.)
2. Collect required information for call-out intake
3. Handle schedule changes and general scheduling questions
4. Escalate sensitive issues (medical emergencies, abuse, complaints) to a human
5. Summarize and wrap up

## CRITICAL RULES
1. NEVER invent information. Never quote specific caregiver assignments, client details, or schedules — say "I'll make sure the scheduler gets this information right away."
2. EMERGENCY PROTOCOL: If a caller mentions a medical emergency, safety threat, or life-threatening situation — immediately say "If this is a life-threatening emergency, please call 911 right now" and then transfer to human.
3. Be efficient but empathetic. Coverage calls are often urgent — don't waste time but don't rush callers either.
4. Do not make promises about shift coverage — say "I'll get this to the scheduling team right away" instead of "We'll have someone there."
5. Keep responses short. One or two sentences per turn.`;

  // ── Begin message ──────────────────────────────────────────────
  const beginMessage = row.intro_script || "You've reached the scheduling line. How can I help you today?";

  // ── Tools ────────────────────────────────────────────────────
  const backupNumber = row.human_backup_number
    ? toE164(row.human_backup_number)
    : "+10000000000";

  const generalTools: RetellTool[] = [
    {
      type: "end_call",
      name: "end_call",
      description: "End the call when the caller is done, says goodbye, or the conversation is complete.",
    },
    {
      type: "transfer_call",
      name: "transfer_to_human",
      description: "Transfer the caller to a human scheduler/coordinator for issues you cannot handle, emergencies, or when the caller explicitly requests a person.",
      transfer_destination: {
        type: "predefined",
        number: backupNumber,
      },
      transfer_option: {
        type: "cold_transfer",
      },
      speak_during_execution: true,
      execution_message_description: "Let me transfer you to the scheduling team. One moment please.",
    },
  ];

  // ── Conditionally add cancel_shift and change_schedule tools when auto_fill_shifts is ON ──
  if (row.auto_fill_shifts) {
    const appUrl = getAppUrl();
    generalTools.push({
      type: "custom",
      name: "cancel_shift",
      description:
        "Cancel a caregiver's upcoming shift in the schedule. Use this when a caregiver calls out and you have collected their name and shift date. Returns a confirmation message to relay to the caller.",
      url: `${appUrl}/api/retell/tools/cancel-shift`,
      speak_during_execution: true,
      execution_message_description:
        "Let me look up that shift and cancel it for you.",
      parameters: {
        type: "object",
        properties: {
          caregiver_first_name: {
            type: "string",
            description: "The caregiver's first name",
          },
          caregiver_last_name: {
            type: "string",
            description:
              "The caregiver's last name (if provided — ask if multiple matches)",
          },
          shift_date: {
            type: "string",
            description:
              "The date of the shift in YYYY-MM-DD format (e.g. 2026-03-11)",
          },
          shift_time: {
            type: "string",
            description:
              "The shift start time in HH:MM 24-hour format (e.g. 09:00). Optional but helps disambiguate if multiple shifts.",
          },
        },
        required: ["caregiver_first_name", "shift_date"],
      },
    });

    generalTools.push({
      type: "custom",
      name: "change_schedule",
      description:
        "Reschedule a caregiver's shift to a new date and/or time. Use this when a caller requests a schedule change and you have collected the caregiver name, current shift date, and the new date/time. Returns a confirmation message to relay to the caller.",
      url: `${appUrl}/api/retell/tools/change-schedule`,
      speak_during_execution: true,
      execution_message_description:
        "Let me look up that shift and reschedule it for you.",
      parameters: {
        type: "object",
        properties: {
          caregiver_first_name: {
            type: "string",
            description: "The caregiver's first name",
          },
          caregiver_last_name: {
            type: "string",
            description:
              "The caregiver's last name (if provided — ask if multiple matches)",
          },
          current_shift_date: {
            type: "string",
            description:
              "The current date of the shift in YYYY-MM-DD format (e.g. 2026-03-11)",
          },
          current_shift_time: {
            type: "string",
            description:
              "The current shift start time in HH:MM 24-hour format (e.g. 09:00). Optional but helps disambiguate.",
          },
          new_date: {
            type: "string",
            description:
              "The new date for the shift in YYYY-MM-DD format. Required if changing the date.",
          },
          new_start_time: {
            type: "string",
            description:
              "The new start time in HH:MM 24-hour format (e.g. 14:00). Required if changing the time.",
          },
          new_end_time: {
            type: "string",
            description:
              "The new end time in HH:MM 24-hour format (e.g. 18:00). Optional — if not provided, the original shift duration is preserved.",
          },
          reason: {
            type: "string",
            description: "Brief reason for the schedule change.",
          },
        },
        required: ["caregiver_first_name", "current_shift_date"],
      },
    });
  }

  // ── States ─────────────────────────────────────────────────────
  const states: RetellState[] = [];

  // ── STATE: Identify Issue ─────────────────────────────────────
  const callTypeItems = [
    { flag: row.handle_caregiver_call_out, label: "caregiver calling out sick or unavailable" },
    { flag: row.handle_schedule_change, label: "schedule change request" },
    { flag: row.handle_reschedule_request, label: "reschedule request" },
    { flag: row.handle_missed_visit, label: "missed visit or late caregiver" },
    { flag: row.handle_shift_coverage_issue, label: "shift coverage issue" },
    { flag: row.handle_availability_update, label: "availability update" },
    { flag: row.handle_open_shift_question, label: "open shift question" },
    { flag: row.handle_same_day_coverage, label: "same-day coverage request" },
  ];

  const escalationItems = [
    { flag: row.escalate_medical_emergency, label: "medical emergency" },
    { flag: row.escalate_abuse_report, label: "abuse report" },
    { flag: row.escalate_billing_dispute, label: "billing dispute" },
    { flag: row.escalate_complaint, label: "complaint" },
    { flag: row.escalate_high_risk, label: "high-risk issue" },
  ];

  const handledCallTypes = listEnabledItems(callTypeItems);
  const escalationList = listEnabledItems(escalationItems);

  states.push({
    name: "identify_issue",
    state_prompt: [
      `This is the starting state. Identify why the caller is calling.`,
      `Ask: "How can I help you today?" if they haven't already stated their reason.`,
      ``,
      `Based on the caller's response, route them:`,
      ``,
      handledCallTypes !== "None"
        ? `→ Call types this line handles: ${handledCallTypes}`
        : ``,
      `→ If the caller is a CAREGIVER CALLING OUT sick or unavailable → go to "callout_intake"`,
      `→ If the caller has a SCHEDULE CHANGE or RESCHEDULE request → go to "schedule_change"`,
      `→ If the caller has an AVAILABILITY UPDATE or OPEN SHIFT question → go to "general_scheduling"`,
      escalationList !== "None"
        ? `→ If their issue is one of these, TRANSFER to human immediately: ${escalationList}`
        : ``,
      `→ If you're unsure what they need, ask one clarifying question, then route.`,
    ].filter(Boolean).join("\n"),
    edges: [
      { description: "Caregiver calling out sick/unavailable", destination_state_name: "callout_intake" },
      { description: "Schedule change or reschedule request", destination_state_name: "schedule_change" },
      { description: "Availability update, open shift question, or general scheduling", destination_state_name: "general_scheduling" },
      { description: "Sensitive issue requiring human escalation", destination_state_name: "escalation" },
    ],
  });

  // ── STATE: Call-Out Intake ─────────────────────────────────────
  const intakeFields = [
    { flag: row.collect_caregiver_name, label: "Caregiver name", prompt: "Can I get your full name?" },
    { flag: row.collect_caregiver_id, label: "Caregiver ID", prompt: "Do you have your caregiver ID or employee number?" },
    { flag: row.collect_client_name, label: "Client name", prompt: "Which client's shift are you calling about?" },
    { flag: row.collect_shift_date, label: "Shift date", prompt: "What date is the shift?" },
    { flag: row.collect_shift_time, label: "Shift time", prompt: "What time does the shift start?" },
    { flag: row.collect_reason, label: "Reason for call-out", prompt: "Can you briefly tell me the reason you can't make it?" },
    { flag: row.collect_urgency, label: "Urgency level", prompt: "How urgent is this — is it for today or a future shift?" },
    { flag: row.collect_same_day_flag, label: "Same-day flag", prompt: "Is this for a shift today?" },
    { flag: row.collect_notes, label: "Additional notes", prompt: "Is there anything else the scheduler should know?" },
  ];

  const enabledIntakeFields = intakeFields.filter((f) => f.flag);

  const afterIntakeActions: string[] = [];
  if (row.after_notify_scheduler) afterIntakeActions.push("notify the scheduler/coordinator immediately");
  if (row.after_create_task) afterIntakeActions.push("create a coverage task to find a replacement");

  // Build callout_intake prompt — behaviour differs based on auto_fill_shifts
  const calloutIntakeLines: string[] = [
    `The caller is a caregiver calling out of a shift.`,
    `Acknowledge their call: "I understand. Let me get some details so we can arrange coverage."`,
    ``,
    `Collect the following information one question at a time:`,
    ...enabledIntakeFields.map((f, i) => `${i + 1}. ${f.label}: "${f.prompt}"`),
    ``,
    `After collecting all information, confirm the details back to the caller.`,
  ];

  if (row.auto_fill_shifts) {
    calloutIntakeLines.push(
      ``,
      `Once you have the caregiver's name and shift date, use the cancel_shift tool to cancel the shift immediately.`,
      `Pass the caregiver's first name, last name (if provided), shift date (YYYY-MM-DD), and shift time (HH:MM 24h, if known).`,
      ``,
      `After the tool returns:`,
      `- If result is "success": relay the confirmation message to the caller exactly as returned (it may say the shift was cancelled, or that the team will review — just pass along the message).`,
      `- If result is "multiple_matches": ask for the last name and call the tool again.`,
      `- If result is "not_found" or "no_shift": let them know, and say "I've noted the details — the scheduling team will follow up."`,
      `- If result is "error": say "I wasn't able to update the schedule right now, but I've noted everything. The scheduling team will take care of it."`,
    );
  } else {
    calloutIntakeLines.push(
      afterIntakeActions.length > 0
        ? `Let them know: "I've noted everything. The team will ${afterIntakeActions.join(" and ")}. Thank you for letting us know."`
        : `Let them know: "Thank you for letting us know. I'll pass this along to the scheduling team."`,
    );
  }

  calloutIntakeLines.push(``, `Then go to "wrap_up".`);

  states.push({
    name: "callout_intake",
    state_prompt: calloutIntakeLines.join("\n"),
    edges: [
      { description: "All call-out information collected", destination_state_name: "wrap_up" },
    ],
  });

  // ── STATE: Schedule Change ─────────────────────────────────────
  const scheduleChangeLines: string[] = [
    `The caller has a schedule change or reschedule request.`,
    `Acknowledge: "I can help with that. Let me get the details."`,
    ``,
    `Collect:`,
    `1. Their name (first and last name if possible)`,
    `2. What change they need (change time, change date, cancel visit, etc.)`,
    `3. The current shift date (in YYYY-MM-DD format)`,
    `4. The current shift time (approximate start time, if known)`,
    `5. The new date and/or time they want`,
    `6. The reason for the change (optional, don't push if they don't want to share)`,
  ];

  if (row.auto_fill_shifts) {
    scheduleChangeLines.push(
      ``,
      `Once you have the caregiver's name, current shift date, and the new date/time:`,
      `- If they want to CANCEL the shift → use the cancel_shift tool`,
      `- If they want to RESCHEDULE (change date or time) → use the change_schedule tool`,
      `  Pass: caregiver_first_name, caregiver_last_name (if known), current_shift_date (YYYY-MM-DD), current_shift_time (HH:MM 24h, if known), new_date (YYYY-MM-DD), new_start_time (HH:MM 24h), new_end_time (HH:MM 24h, optional), reason`,
      ``,
      `After the tool returns:`,
      `- If result is "success": relay the confirmation message to the caller exactly as returned.`,
      `- If result is "multiple_matches": ask for the last name and call the tool again.`,
      `- If result is "not_found" or "no_shift": let them know, and say "I've noted the details — the scheduling team will follow up."`,
      `- If result is "error": say "I wasn't able to update the schedule right now, but I've noted everything. The scheduling team will take care of it."`,
    );
  } else {
    scheduleChangeLines.push(
      ``,
      `Confirm the details and let them know: "I'll get this to the scheduling team right away. They'll follow up with you to confirm."`,
    );
  }

  scheduleChangeLines.push(``, `Then go to "wrap_up".`);

  states.push({
    name: "schedule_change",
    state_prompt: scheduleChangeLines.join("\n"),
    edges: [
      { description: "Schedule change details collected", destination_state_name: "wrap_up" },
    ],
  });

  // ── STATE: General Scheduling ──────────────────────────────────
  states.push({
    name: "general_scheduling",
    state_prompt: [
      `The caller has a general scheduling question — availability update, open shift question, etc.`,
      ``,
      `For AVAILABILITY UPDATES:`,
      `- Collect their name and the days/times they're now available or unavailable`,
      `- Confirm and note it for the scheduler`,
      ``,
      `For OPEN SHIFT QUESTIONS:`,
      `- Let them know you can note their interest but can't confirm assignments`,
      `- Collect their name and which shift(s) they're interested in`,
      ``,
      `For OTHER scheduling questions:`,
      `- Answer if you can, otherwise offer to transfer to the scheduling team`,
      ``,
      `After handling, go to "wrap_up".`,
    ].join("\n"),
    edges: [
      { description: "Scheduling question handled", destination_state_name: "wrap_up" },
    ],
  });

  // ── STATE: Escalation ──────────────────────────────────────────
  states.push({
    name: "escalation",
    state_prompt: [
      `The caller has a sensitive issue that needs human attention.`,
      ``,
      `Acknowledge with empathy: "I understand this is serious. Let me connect you with someone who can help right away."`,
      ``,
      `Use the transfer_to_human tool to transfer the call.`,
      `If the transfer fails, provide the backup number and ask them to call directly.`,
    ].join("\n"),
  });

  // ── STATE: Wrap Up ─────────────────────────────────────────────
  states.push({
    name: "wrap_up",
    state_prompt: [
      `The conversation is wrapping up.`,
      `Thank the caller: "Thank you for calling. Is there anything else I can help you with?"`,
      ``,
      `If they have another question, route them back to "identify_issue".`,
      `If they say no or goodbye, say "Take care!" and end the call.`,
    ].join("\n"),
    edges: [
      { description: "Caller has another question", destination_state_name: "identify_issue" },
    ],
  });

  return {
    begin_message: beginMessage,
    general_prompt: generalPrompt,
    general_tools: generalTools,
    starting_state: "identify_issue",
    states,
    model: "gpt-4.1",
    model_temperature: 0.3,
  };
}
