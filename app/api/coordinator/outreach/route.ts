import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { getRetellClient } from "@/lib/retell/client";
import { ensureOutboundAgent, ensureOutboundChatAgent } from "@/lib/retell/outbound-sync";
import { toE164 } from "@/lib/phone";

/**
 * POST /api/coordinator/outreach
 *
 * Initiates outbound calls (via Retell createPhoneCall) and/or
 * SMS (via Retell createSMSChat) to caregivers for a vacant shift.
 *
 * Body: {
 *   eventId: string,
 *   caregivers: Array<{ id: string, call: boolean, text: boolean }>
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { supabase, agencyId } = auth;

  let body: { eventId: string; caregivers: Array<{ id: string; call: boolean; text: boolean }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId, caregivers } = body;
  if (!eventId || !caregivers?.length) {
    return NextResponse.json({ error: "eventId and caregivers are required" }, { status: 400 });
  }

  // Fetch shift details
  const { data: shift } = await supabase
    .from("schedule_events")
    .select("*, clients(first_name, last_name)")
    .eq("id", eventId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  // Fetch agency name for outbound calls
  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .maybeSingle();

  // Fetch coordinator config for the coverage line
  const { data: coordConfig } = await supabase
    .from("coordinator_config")
    .select("coverage_line, agency_timezone")
    .eq("agency_id", agencyId)
    .maybeSingle();

  // Fetch employees for phone numbers
  const caregiverIds = caregivers.map((c) => c.id);
  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name, phone")
    .in("id", caregiverIds);

  const empMap = new Map((employees ?? []).map((e: any) => [e.id, e]));

  // Build shift details for call/SMS
  const agencyTimezone = coordConfig?.agency_timezone ?? "America/New_York";
  const clientName = shift.clients
    ? `${shift.clients.first_name ?? ""} ${shift.clients.last_name ?? ""}`.trim()
    : "a client";
  const startAt = new Date(shift.start_at);
  const endAt = new Date(shift.end_at);
  const shiftDate = startAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: agencyTimezone,
  });
  const shiftTime = `${startAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: agencyTimezone,
  })} - ${endAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: agencyTimezone,
  })}`;
  const careTypeLabels: Record<string, string> = {
    personal_care: "Personal Care",
    companion_care: "Companion Care",
    skilled_nursing: "Skilled Nursing",
    respite_care: "Respite Care",
    live_in: "Live-In",
  };
  const careType = careTypeLabels[shift.care_type] ?? shift.care_type ?? "Care";
  const payRate = shift.pay_rate ? `$${Number(shift.pay_rate).toFixed(0)}/hr` : "standard rate";
  const agencyName = agency?.name ?? "your agency";
  const coverageLine = coordConfig?.coverage_line ? toE164(coordConfig.coverage_line) : null;

  // Service client for outbound agent setup
  const serviceClient = createServerSupabaseServiceClient();
  const retell = getRetellClient();

  // Lazy-init outbound agents as needed
  const hasAnyCalls = caregivers.some((c) => c.call);
  const hasAnyTexts = caregivers.some((c) => c.text);

  let outboundAgentId: string | null = null;
  let outboundChatAgentId: string | null = null;

  if (serviceClient) {
    if (hasAnyCalls) {
      outboundAgentId = await ensureOutboundAgent(agencyId, serviceClient);
    }
    if (hasAnyTexts) {
      outboundChatAgentId = await ensureOutboundChatAgent(agencyId, serviceClient);
    }
  }

  const dynamicVars = {
    caregiver_name: "", // set per-caregiver below
    agency_name: agencyName,
    client_name: clientName,
    shift_date: shiftDate,
    shift_time: shiftTime,
    care_type: careType,
    pay_rate: payRate,
  };

  const results: Array<{ caregiverId: string; channel: string; success: boolean; error?: string }> = [];

  for (const cg of caregivers) {
    const emp = empMap.get(cg.id);
    if (!emp) continue;

    const caregiverName = `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim();
    const phone = emp.phone ? toE164(emp.phone) : null;

    // ── Call (Retell createPhoneCall) ───────────────────────
    if (cg.call && phone) {
      const { data: attempt } = await supabase
        .from("outreach_attempts")
        .insert({
          agency_id: agencyId,
          event_id: eventId,
          caregiver_id: cg.id,
          channel: "call",
          status: "pending",
        })
        .select("id")
        .single();

      if (retell && outboundAgentId && coverageLine && attempt) {
        try {
          const call = await retell.call.createPhoneCall({
            from_number: coverageLine,
            to_number: phone,
            override_agent_id: outboundAgentId,
            retell_llm_dynamic_variables: { ...dynamicVars, caregiver_name: caregiverName },
            metadata: {
              outreach_attempt_id: attempt.id,
              event_id: eventId,
              caregiver_id: cg.id,
              agency_id: agencyId,
            },
          } as any);

          await supabase
            .from("outreach_attempts")
            .update({ retell_call_id: call.call_id, status: "in_progress" })
            .eq("id", attempt.id);

          results.push({ caregiverId: cg.id, channel: "call", success: true });
        } catch (err) {
          console.error(`[outreach] Call failed for ${cg.id}:`, err);
          await supabase
            .from("outreach_attempts")
            .update({ status: "failed" })
            .eq("id", attempt.id);
          results.push({
            caregiverId: cg.id,
            channel: "call",
            success: false,
            error: err instanceof Error ? err.message : "Call failed",
          });
        }
      } else {
        if (attempt) {
          await supabase
            .from("outreach_attempts")
            .update({ status: "failed", response_notes: "Retell not configured or no coverage line" })
            .eq("id", attempt.id);
        }
        results.push({ caregiverId: cg.id, channel: "call", success: false, error: "Retell not configured" });
      }
    }

    // ── SMS (Retell createSMSChat) ─────────────────────────
    if (cg.text && phone) {
      const { data: attempt } = await supabase
        .from("outreach_attempts")
        .insert({
          agency_id: agencyId,
          event_id: eventId,
          caregiver_id: cg.id,
          channel: "sms",
          status: "pending",
        })
        .select("id")
        .single();

      if (retell && coverageLine && attempt) {
        try {
          const chat = await retell.chat.createSMSChat({
            from_number: coverageLine,
            to_number: phone,
            ...(outboundChatAgentId && { override_agent_id: outboundChatAgentId }),
            retell_llm_dynamic_variables: { ...dynamicVars, caregiver_name: caregiverName },
            metadata: {
              outreach_attempt_id: attempt.id,
              event_id: eventId,
              caregiver_id: cg.id,
              agency_id: agencyId,
            },
          } as any);

          await supabase
            .from("outreach_attempts")
            .update({ retell_chat_id: chat.chat_id, status: "in_progress" })
            .eq("id", attempt.id);

          results.push({ caregiverId: cg.id, channel: "sms", success: true });
        } catch (err) {
          console.error(`[outreach] SMS chat failed for ${cg.id}:`, err);
          await supabase
            .from("outreach_attempts")
            .update({ status: "failed" })
            .eq("id", attempt.id);
          results.push({
            caregiverId: cg.id,
            channel: "sms",
            success: false,
            error: err instanceof Error ? err.message : "SMS failed",
          });
        }
      } else {
        if (attempt) {
          await supabase
            .from("outreach_attempts")
            .update({ status: "failed", response_notes: "Retell not configured or no coverage line" })
            .eq("id", attempt.id);
        }
        results.push({ caregiverId: cg.id, channel: "sms", success: false, error: "Retell not configured" });
      }
    }
  }

  return NextResponse.json({ data: results });
}
