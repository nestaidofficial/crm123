// =============================================================================
// Retell AI: Conversational Flow Builder
// =============================================================================
// Builds LLM configuration (prompt, states, tools) from receptionist config.
// This defines the entire conversational flow the AI receptionist follows.
// =============================================================================

import type { ReceptionistConfigRow } from "@/lib/db/receptionist.mapper";

/** Retell EndCallTool */
interface EndCallTool {
  type: "end_call";
  name: string;
  description?: string;
}

/** Retell TransferCallTool (matches SDK TransferCallTool shape) */
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

type RetellTool = EndCallTool | TransferCallTool;

/** Retell LLM state shape */
interface RetellState {
  name: string;
  state_prompt: string;
  edges?: Array<{
    description: string;
    destination_state_name: string;
    parameters?: Record<string, unknown>;
  }>;
  tools?: RetellTool[];
}

/** Full LLM config payload for create/update */
export interface RetellLlmConfig {
  begin_message: string;
  general_prompt: string;
  general_tools: RetellTool[];
  starting_state: string;
  states: RetellState[];
  model: string;
  model_temperature: number;
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX for US/CA).
 * Handles inputs like: 4129530622, (412) 953-0622, 1-412-953-0622, +14129530622
 */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;          // bare 10-digit US
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`; // 1XXXXXXXXXX
  if (raw.startsWith("+")) return raw;                     // already E.164
  return `+${digits}`;                                     // best effort
}

function listEnabledItems(
  items: Array<{ flag: boolean; label: string }>
): string {
  const enabled = items.filter((i) => i.flag).map((i) => i.label);
  return enabled.length > 0 ? enabled.join(", ") : "None";
}

function formatPerDayHours(row: ReceptionistConfigRow): string {
  if (row.business_hours === "24/7") return "24/7 — always available";

  const days = [
    { label: "Monday", value: row.hours_monday },
    { label: "Tuesday", value: row.hours_tuesday },
    { label: "Wednesday", value: row.hours_wednesday },
    { label: "Thursday", value: row.hours_thursday },
    { label: "Friday", value: row.hours_friday },
    { label: "Saturday", value: row.hours_saturday },
    { label: "Sunday", value: row.hours_sunday },
  ];

  const lines = days.map(
    (d) => `- ${d.label}: ${d.value || "Closed"}`
  );

  const label = row.business_hours_label;
  if (label) {
    lines.push(`\nSummary: ${label}`);
  }

  return lines.join("\n");
}

const DEFAULT_SERVICES = `- Personal care: bathing, grooming, dressing, hygiene, and mobility assistance
- Companion care: conversation, light housekeeping, errands, meal preparation, and transportation
- Skilled nursing: medication management, wound care, vital monitoring, and health assessments
- Memory care and Alzheimer's / dementia support
- Respite care for family caregivers who need a break
- Post-surgical and post-hospital discharge recovery care
- Live-in and 24-hour continuous care`;

// ─── Main Builder ─────────────────────────────────────────────────

export function buildLlmConfig(row: ReceptionistConfigRow): RetellLlmConfig {
  const agencyName = row.agency_name || "our agency";
  const servicesSummary = row.services_summary?.trim() || "";

  // ── General prompt (applies to ALL states) ─────────────────────
  const generalPrompt = `## IDENTITY & ROLE
You are the AI receptionist for ${agencyName}, a licensed home care agency providing compassionate, personalized care for seniors and individuals with disabilities.

Your name is not important — you represent ${agencyName}. You sound warm, patient, and professional — like a seasoned front-desk receptionist who genuinely cares about every person who calls. You are confident, clear, and calming.

## HOURS OF OPERATION
${formatPerDayHours(row)}

## COMMUNICATION STYLE
- Speak in short, natural sentences. This is a phone call — be conversational, not textbook.
- Once you know the caller's name, use it once or twice — it makes the interaction feel personal.
- Match the caller's energy. If they sound distressed or elderly, slow down and be extra empathetic.
- If asked "Are you a real person?" or "Am I talking to a robot?", be honest: say "I'm an AI assistant for ${agencyName}, but I'm here to help you fully. Is there something I can assist you with?" — then continue naturally.
- Never use hollow filler phrases like "Absolutely!", "Certainly!", "Of course!" — they sound robotic. Use natural acknowledgments like "Got it", "I understand", "That makes sense".
- Never rush the caller. Give them time to think and speak.

## ABOUT ${agencyName.toUpperCase()}
${servicesSummary ? servicesSummary : `${agencyName} provides in-home care services including:\n${DEFAULT_SERVICES}`}

We serve seniors, adults with disabilities, and individuals recovering from illness or surgery. Our caregivers are thoroughly background-checked, trained, supervised, and matched to each client's unique needs.

## YOUR JOB
You handle inbound calls for ${agencyName}. Your goals are:
1. Greet the caller warmly and identify their need
2. Collect intake information from new clients or caregiver applicants
3. Route scheduling/coordination issues to the care coordinator
4. Escalate billing, complaints, and urgent issues to a human
5. Answer general questions about ${agencyName}'s services

## CRITICAL RULES — ALWAYS FOLLOW
1. NEVER invent information. Never quote specific pricing, caregiver names, wait times, or availability — say "I don't have that detail right now, but one of our team members will follow up with you directly."
2. EMERGENCY PROTOCOL: If a caller mentions a fall, medical emergency, safety threat, or life-threatening situation — immediately say "If this is a life-threatening emergency, please call 911 right now" and then use the transfer_to_human tool.
3. ALWAYS be empathetic. Many callers are adult children worried about a parent, seniors in vulnerable situations, or caregivers under stress. Treat every call with compassion.
4. Do not make promises you cannot keep — never guarantee a specific caregiver, start date, or price without human confirmation.
5. Keep responses short. One or two sentences per turn. Let the caller guide the pace.
6. If a caller is hard to understand (accent, poor connection, elderly speech) — ask one clarifying question politely. Never make them feel bad for repeating themselves.`;



  // ── Begin message ──────────────────────────────────────────────
  const beginMessage = row.greeting_script || `Thank you for calling ${agencyName}, how can I help you today?`;

  // ── Tools (available in all states) ────────────────────────────
  const escalationNumber = row.escalation_number
    ? toE164(row.escalation_number)
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
      description: "Transfer the caller to a human agent for issues you cannot handle, urgent matters, billing disputes, complaints, or when the caller explicitly requests a person.",
      transfer_destination: {
        type: "predefined",
        number: escalationNumber,
      },
      transfer_option: {
        type: "cold_transfer",
      },
      speak_during_execution: true,
      execution_message_description: "Let me transfer you to a team member who can help. One moment please.",
    },
  ];

  // ── States ─────────────────────────────────────────────────────
  const states: RetellState[] = [];

  // ── STATE: Identify Intent ─────────────────────────────────────
  const routeToCoordinatorItems = [
    { flag: row.route_caregiver_call_out, label: "caregiver calling out sick" },
    { flag: row.route_schedule_change, label: "schedule change request" },
    { flag: row.route_reschedule_request, label: "reschedule request" },
    { flag: row.route_missed_visit, label: "missed visit or late caregiver" },
    { flag: row.route_missed_clocking, label: "missed clock in/out" },
    { flag: row.route_shift_coverage_issue, label: "shift coverage issue" },
    { flag: row.route_availability_update, label: "availability update" },
    { flag: row.route_open_shift_question, label: "open shift question" },
  ];

  const escalateToHumanItems = [
    { flag: row.escalate_billing_question, label: "billing question" },
    { flag: row.escalate_billing_dispute, label: "billing dispute" },
    { flag: row.escalate_complaint_escalation, label: "complaint" },
    { flag: row.escalate_urgent_issue, label: "urgent issue" },
  ];

  const routeToCoordinatorList = listEnabledItems(routeToCoordinatorItems);
  const escalateToHumanList = listEnabledItems(escalateToHumanItems);

  states.push({
    name: "identify_intent",
    state_prompt: [
      `This is the starting state. Identify why the caller is calling.`,
      `Ask: "How can I help you today?" if they haven't already stated their reason.`,
      ``,
      `Based on the caller's response, route them:`,
      ``,
      `→ If they are a NEW CLIENT looking for care services → go to "client_intake"`,
      `→ If they are a CAREGIVER looking for work or applying → go to "caregiver_intake"`,
      routeToCoordinatorList !== "None"
        ? `→ If their issue is one of these, TRANSFER to coordinator: ${routeToCoordinatorList}`
        : ``,
      escalateToHumanList !== "None"
        ? `→ If their issue is one of these, TRANSFER to human immediately: ${escalateToHumanList}`
        : ``,
      `→ If they want general information about ${agencyName} → go to "general_info"`,
      `→ If they ask to speak to a specific person → use transfer_to_human tool`,
      `→ If you're unsure what they need, ask one clarifying question, then route.`,
    ].filter(Boolean).join("\n"),
    edges: [
      { description: "Caller wants care services (new client)", destination_state_name: "client_intake" },
      { description: "Caller is a caregiver looking for work", destination_state_name: "caregiver_intake" },
      { description: "Caller has general questions", destination_state_name: "general_info" },
      { description: "Caller wants to schedule, route, or coordinate", destination_state_name: "coordinator_routing" },
    ],
  });

  // ── STATE: Coordinator Routing ─────────────────────────────────
  states.push({
    name: "coordinator_routing",
    state_prompt: [
      `The caller has a scheduling or coordination issue.`,
      `Briefly acknowledge their concern and let them know you're transferring them to the care coordinator.`,
      `Say something like: "Let me connect you with our care coordinator who can help with that right away."`,
      `Then use the transfer_to_coordinator tool.`,
    ].join("\n"),
    tools: [
      {
        type: "transfer_call",
        name: "transfer_to_coordinator",
        description: "Transfer to the care coordinator for scheduling and coordination issues.",
        transfer_destination: {
          type: "predefined",
          number: escalationNumber,
        },
        transfer_option: {
          type: "cold_transfer",
        },
        speak_during_execution: true,
        execution_message_description: "Let me connect you with our care coordinator right away.",
      },
    ],
  });

  // ── STATE: Client Intake ───────────────────────────────────────
  const clientFieldsToCollect = [
    { flag: row.intake_client_name, label: "Full name", prompt: "May I have your full name?" },
    { flag: row.intake_client_phone_number, label: "Phone number", prompt: "What's the best phone number to reach you?" },
    { flag: row.intake_client_email, label: "Email address", prompt: "Do you have an email address we can use?" },
    { flag: row.intake_client_address, label: "Address", prompt: "What is the address where care would be needed?" },
    { flag: row.intake_client_type_of_care, label: "Type of care", prompt: "What type of care are you looking for? For example, personal care, companion care, or skilled nursing?" },
    { flag: row.intake_client_preferred_days, label: "Preferred days and hours", prompt: "What days and times would you prefer?" },
    { flag: row.intake_client_estimated_hours, label: "Estimated hours per week", prompt: "Approximately how many hours per week do you think you'll need?" },
    { flag: row.intake_client_preferred_start, label: "Preferred start date", prompt: "When would you like to start services?" },
    { flag: row.intake_client_notes, label: "Special notes", prompt: "Is there anything else we should know — any special requirements or notes?" },
  ];

  const enabledClientFields = clientFieldsToCollect.filter((f) => f.flag);

  states.push({
    name: "client_intake",
    state_prompt: [
      `The caller is a potential new client interested in care services.`,
      `Warmly acknowledge their interest: "I'd be happy to help get you started. Let me collect some information."`,
      ``,
      `Collect the following information one question at a time. Be conversational, not robotic:`,
      ...enabledClientFields.map((f, i) => `${i + 1}. ${f.label}: "${f.prompt}"`),
      ``,
      `After collecting all information, confirm the details back to the caller.`,
      ...(row.auto_schedule_consultation
        ? [`Let them know: "I'll have our coordinator reach out to schedule a consultation with you shortly."`]
        : [`Let them know: "Thank you! One of our team members will follow up with you soon."`]),
      ``,
      `Then go to "wrap_up".`,
    ].join("\n"),
    edges: [
      { description: "All intake information collected", destination_state_name: "wrap_up" },
    ],
  });

  // ── STATE: Caregiver Intake ────────────────────────────────────
  const cgFieldsToCollect = [
    { enabled: row.intake_cg_full_name, required: row.intake_cg_full_name_required, label: "Full name", prompt: "What is your full name?" },
    { enabled: row.intake_cg_phone_number, required: row.intake_cg_phone_number_required, label: "Phone number", prompt: "What's the best phone number to reach you?" },
    { enabled: row.intake_cg_email, required: row.intake_cg_email_required, label: "Email address", prompt: "What's your email address?" },
    { enabled: row.intake_cg_location, required: row.intake_cg_location_required, label: "Location", prompt: "What area are you located in?" },
    { enabled: row.intake_cg_experience, required: row.intake_cg_experience_required, label: "Experience", prompt: "Can you tell me about your caregiving experience?" },
    { enabled: row.intake_cg_certifications, required: row.intake_cg_certifications_required, label: "Certifications", prompt: "Do you have any certifications, like CNA, HHA, or LPN?" },
    { enabled: row.intake_cg_availability, required: row.intake_cg_availability_required, label: "Availability", prompt: "What is your availability — days and times you can work?" },
    { enabled: row.intake_cg_transportation, required: row.intake_cg_transportation_required, label: "Transportation", prompt: "Do you have reliable transportation?" },
    { enabled: row.intake_cg_notes, required: row.intake_cg_notes_required, label: "Additional notes", prompt: "Is there anything else you'd like us to know?" },
  ];

  const enabledCgFields = cgFieldsToCollect.filter((f) => f.enabled);

  states.push({
    name: "caregiver_intake",
    state_prompt: [
      `The caller is a caregiver interested in working with ${agencyName}.`,
      `Warmly welcome them: "Great, we're always looking for dedicated caregivers. Let me get some information from you."`,
      ``,
      `Collect the following information one question at a time:`,
      ...enabledCgFields.map((f, i) => {
        const tag = f.required ? "(REQUIRED)" : "(optional)";
        return `${i + 1}. ${f.label} ${tag}: "${f.prompt}"`;
      }),
      ``,
      `For REQUIRED fields, you must collect an answer before moving on. For optional fields, if the caller doesn't have an answer or skips it, that's fine — move on.`,
      ``,
      `After collecting all information, confirm the key details.`,
      `Let them know: "Thank you for your interest! Our hiring team will review your information and reach out to you soon."`,
      ``,
      `Then go to "wrap_up".`,
    ].join("\n"),
    edges: [
      { description: "All caregiver information collected", destination_state_name: "wrap_up" },
    ],
  });

  // ── STATE: General Info ────────────────────────────────────────
  states.push({
    name: "general_info",
    state_prompt: [
      `The caller has general questions about ${agencyName}.`,
      `You can answer basic questions about home care services:`,
      `- ${agencyName} provides home care and support services`,
      servicesSummary
        ? `- Services: ${servicesSummary}`
        : `- Services may include personal care, companion care, skilled nursing, and more`,
      `- Business hours: ${formatPerDayHours(row)}`,
      `- For specific service details, pricing, or availability, offer to transfer to a team member`,
      ``,
      `If the caller wants to proceed with services → go to "client_intake"`,
      `If they want to apply as a caregiver → go to "caregiver_intake"`,
      `If they need to speak with someone specific → use transfer_to_human tool`,
      `If they're satisfied → go to "wrap_up"`,
    ].join("\n"),
    edges: [
      { description: "Caller wants to sign up for services", destination_state_name: "client_intake" },
      { description: "Caller wants to apply as caregiver", destination_state_name: "caregiver_intake" },
      { description: "Caller is satisfied or done", destination_state_name: "wrap_up" },
    ],
  });

  // ── STATE: Wrap Up ─────────────────────────────────────────────
  states.push({
    name: "wrap_up",
    state_prompt: [
      `The conversation is wrapping up.`,
      `Thank the caller warmly: "Thank you for calling ${agencyName}. Is there anything else I can help you with?"`,
      ``,
      `If they have another question, route them back to the appropriate state.`,
      `If they say no or goodbye, say "Have a wonderful day!" and end the call.`,
    ].join("\n"),
    edges: [
      { description: "Caller has another question", destination_state_name: "identify_intent" },
    ],
  });

  return {
    begin_message: beginMessage,
    general_prompt: generalPrompt,
    general_tools: generalTools,
    starting_state: "identify_intent",
    states,
    model: "gpt-4.1",
    model_temperature: 0.3,
  };
}
