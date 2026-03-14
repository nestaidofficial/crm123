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

/** Retell ExtractDynamicVariableTool — captures structured data as reusable {{variables}} */
interface ExtractDynamicVariableTool {
  type: "extract_dynamic_variable";
  name: string;
  description: string;
  variables: Array<{
    name: string;
    type: "string" | "number" | "enum" | "boolean";
    description: string;
    required?: boolean;
    examples?: string[];
    choices?: string[];
  }>;
}

type RetellTool = EndCallTool | TransferCallTool | CustomTool | ExtractDynamicVariableTool;

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

## CURRENT DATE
IMPORTANT: Before processing any date-related request, you MUST call the get_current_date tool to get today's actual date. Do NOT assume or guess the current date. Use the date returned by the tool to resolve relative dates: "tomorrow" = next day after today, "next Monday" = the coming Monday, etc.
When passing dates to tools, always convert to YYYY-MM-DD format.

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

  const appUrl = getAppUrl();

  const generalTools: RetellTool[] = [
    {
      type: "custom",
      name: "get_current_date",
      description:
        "Get today's current date in the agency's local timezone. MUST be called before resolving any relative dates (tomorrow, next Monday, etc.) or passing dates to other tools.",
      url: `${appUrl}/api/retell/tools/current-date?tz=${encodeURIComponent(row.agency_timezone || "America/New_York")}`,
      speak_during_execution: false,
      execution_message_description: "",
    },
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
    generalTools.push({
      type: "custom",
      name: "cancel_shift",
      description:
        "Cancel a caregiver's upcoming shift in the schedule. Use this when a caregiver calls out and you have collected their employee ID and shift date. Returns a confirmation message to relay to the caller.",
      url: `${appUrl}/api/retell/tools/cancel-shift`,
      speak_during_execution: true,
      execution_message_description:
        "Let me look up that shift and cancel it for you.",
      parameters: {
        type: "object",
        properties: {
          caregiver_short_id: {
            type: "string",
            description:
              "Employee ID (REQUIRED — e.g. E-1001, 1005). Always pass this. If the caller only gave digits like '1005', pass '1005' — the system will add the E prefix.",
          },
          caregiver_first_name: {
            type: "string",
            description: "The caregiver's first name (optional, for display purposes)",
          },
          caregiver_last_name: {
            type: "string",
            description:
              "The caregiver's last name (optional)",
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
        required: ["caregiver_short_id", "shift_date"],
      },
    });

    generalTools.push({
      type: "custom",
      name: "change_schedule",
      description:
        "Reschedule a caregiver's shift to a new date and/or time. Use this when a caller requests a schedule change and you have collected the caregiver's employee ID, current shift date, and the new date/time. Returns a confirmation message to relay to the caller.",
      url: `${appUrl}/api/retell/tools/change-schedule`,
      speak_during_execution: true,
      execution_message_description:
        "Let me look up that shift and reschedule it for you.",
      parameters: {
        type: "object",
        properties: {
          caregiver_short_id: {
            type: "string",
            description:
              "Employee ID (REQUIRED — e.g. E-1001, 1005). Always pass this. If the caller only gave digits like '1005', pass '1005' — the system will add the E prefix.",
          },
          caregiver_first_name: {
            type: "string",
            description: "The caregiver's first name (optional, for display purposes)",
          },
          caregiver_last_name: {
            type: "string",
            description:
              "The caregiver's last name (optional)",
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
        required: ["caregiver_short_id", "current_shift_date"],
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
      `→ If the caller wants to CALL OUT, is SICK, CAN'T MAKE IT, needs to CANCEL a shift, or is UNAVAILABLE → go to "callout_intake"`,
      `  Keywords: "call out", "sick", "can't make it", "cancel my shift", "won't be able to come in", "need to cancel"`,
      `→ If the caller wants to MOVE, RESCHEDULE, or CHANGE THE TIME/DATE of a shift (NOT cancel) → go to "schedule_change"`,
      `  Keywords: "move my shift", "change the time", "reschedule", "swap", "switch to a different day"`,
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
  const afterIntakeActions: string[] = [];
  if (row.after_notify_scheduler) afterIntakeActions.push("notify the scheduler/coordinator immediately");
  if (row.after_create_task) afterIntakeActions.push("create a coverage task to find a replacement");

  // Build callout_intake prompt — behaviour differs based on auto_fill_shifts
  const calloutIntakeLines: string[] = [
    `The caller is a caregiver calling out of a shift (sick, unavailable, or cancelling).`,
    `Acknowledge: "I understand. Let me get some details so we can arrange coverage."`,
    ``,
    `Collect in order: 1) Employee ID (REQUIRED), 2) Shift date, 3) Reason.`,
    `Employee ID format: E-1005. Accept spoken variants ("E ten oh five", "1005", "e1005").`,
    `Confirm the ID once: "That's E-1005?" — then move on. Do NOT repeat information already collected.`,
    `If they give their name first, acknowledge it, then ask for the employee ID.`,
    `If they cannot provide the ID after two attempts, transfer to human via transfer_to_human.`,
    `Do NOT fall back to name-only identification.`,
    ``,
    `As soon as you have the employee ID and shift date, call extract_callout_info to lock in the details.`,
  ];

  if (row.auto_fill_shifts) {
    calloutIntakeLines.push(
      `Then call get_current_date, then call cancel_shift with {{employee_id}} as caregiver_short_id and {{shift_date}} as shift_date.`,
      `Also pass {{caregiver_name}} (if available) and {{shift_time}} (if known).`,
      ``,
      `After cancel_shift returns:`,
      `- "needs_id": ask for employee ID again.`,
      `- "success": relay the confirmation message exactly as returned.`,
      `- "multiple_matches": ask for last name, call cancel_shift again.`,
      `- "not_found" / "no_shift": say "I've noted the details — the scheduling team will follow up."`,
      `- "error": say "I wasn't able to update the schedule right now, but I've noted everything. The scheduling team will take care of it."`,
    );
  } else {
    calloutIntakeLines.push(
      afterIntakeActions.length > 0
        ? `Let them know: "I've noted everything. The team will ${afterIntakeActions.join(" and ")}. Thank you for letting us know."`
        : `Let them know: "Thank you for letting us know. I'll pass this along to the scheduling team."`,
    );
  }

  calloutIntakeLines.push(``, `Then go to "wrap_up".`);

  const calloutTools: RetellTool[] = [
    {
      type: "extract_dynamic_variable",
      name: "extract_callout_info",
      description: "Extract the caregiver's details for the call-out. Call this as soon as you have their employee ID and shift date.",
      variables: [
        { name: "employee_id", type: "string", description: "Employee ID (e.g. E-1005, 1005)", required: true, examples: ["E-1005", "1005", "E-2341"] },
        { name: "caregiver_name", type: "string", description: "Caregiver's full name", required: false },
        { name: "shift_date", type: "string", description: "Shift date in YYYY-MM-DD", required: true, examples: ["2026-03-15"] },
        { name: "shift_time", type: "string", description: "Shift start time HH:MM 24h", required: false, examples: ["09:00", "14:30"] },
        { name: "callout_reason", type: "string", description: "Reason for calling out", required: false },
      ],
    },
  ];

  states.push({
    name: "callout_intake",
    state_prompt: calloutIntakeLines.join("\n"),
    tools: calloutTools,
    edges: [
      { description: "All call-out information collected", destination_state_name: "wrap_up" },
    ],
  });

  // ── STATE: Schedule Change ─────────────────────────────────────
  // NOTE: This state handles RESCHEDULE only. Cancellations go through callout_intake.
  const scheduleChangeLines: string[] = [
    `The caller wants to RESCHEDULE or CHANGE the date/time of a shift (NOT cancel it).`,
    `If they actually want to cancel or call out, tell them "Let me route you to the right place" and go to "callout_intake".`,
    `Acknowledge: "I can help with that. Let me get the details."`,
    ``,
    `Collect in order: 1) Employee ID (REQUIRED), 2) Current shift date, 3) New date/time, 4) Reason (optional).`,
    `Employee ID format: E-1005. Accept spoken variants ("E ten oh five", "1005", "e1005").`,
    `Confirm the ID once: "That's E-1005?" — then move on. Do NOT repeat information already collected.`,
    `If they give their name first, acknowledge it, then ask for the employee ID.`,
    `If they cannot provide the ID after two attempts, transfer to human via transfer_to_human.`,
    `Do NOT fall back to name-only identification.`,
    ``,
    `As soon as you have the employee ID, current shift date, and new date/time, call extract_schedule_change_info to lock in the details.`,
  ];

  if (row.auto_fill_shifts) {
    scheduleChangeLines.push(
      `Then call get_current_date, then call change_schedule with {{employee_id}} as caregiver_short_id, {{current_shift_date}} as current_shift_date, {{new_date}} as new_date, {{new_start_time}} as new_start_time, {{new_end_time}} as new_end_time (if known).`,
      `Also pass {{caregiver_name}} (if available), {{current_shift_time}} (if known), and {{schedule_change_reason}} (if provided).`,
      ``,
      `After change_schedule returns:`,
      `- "needs_id": ask for employee ID again.`,
      `- "success": relay the confirmation message exactly as returned.`,
      `- "multiple_matches": ask for last name, call change_schedule again.`,
      `- "not_found" / "no_shift": say "I've noted the details — the scheduling team will follow up."`,
      `- "error": say "I wasn't able to update the schedule right now, but I've noted everything. The scheduling team will take care of it."`,
    );
  } else {
    scheduleChangeLines.push(
      ``,
      `Confirm the details and let them know: "I'll get this to the scheduling team right away. They'll follow up with you to confirm."`,
    );
  }

  scheduleChangeLines.push(``, `Then go to "wrap_up".`);

  const scheduleChangeTools: RetellTool[] = [
    {
      type: "extract_dynamic_variable",
      name: "extract_schedule_change_info",
      description: "Extract the caregiver's details for the schedule change. Call this as soon as you have their employee ID, current shift date, and new date/time.",
      variables: [
        { name: "employee_id", type: "string", description: "Employee ID (e.g. E-1005, 1005)", required: true, examples: ["E-1005", "1005", "E-2341"] },
        { name: "caregiver_name", type: "string", description: "Caregiver's full name", required: false },
        { name: "current_shift_date", type: "string", description: "Current shift date in YYYY-MM-DD", required: true, examples: ["2026-03-15"] },
        { name: "current_shift_time", type: "string", description: "Current shift start time HH:MM 24h", required: false, examples: ["09:00", "14:30"] },
        { name: "new_date", type: "string", description: "New shift date in YYYY-MM-DD", required: false, examples: ["2026-03-20"] },
        { name: "new_start_time", type: "string", description: "New start time HH:MM 24h", required: false, examples: ["10:00", "15:00"] },
        { name: "new_end_time", type: "string", description: "New end time HH:MM 24h", required: false, examples: ["14:00", "19:00"] },
        { name: "schedule_change_reason", type: "string", description: "Reason for the schedule change", required: false },
      ],
    },
  ];

  states.push({
    name: "schedule_change",
    state_prompt: scheduleChangeLines.join("\n"),
    tools: scheduleChangeTools,
    edges: [
      { description: "Schedule change details collected", destination_state_name: "wrap_up" },
      { description: "Caller actually wants to cancel/call out, not reschedule", destination_state_name: "callout_intake" },
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
