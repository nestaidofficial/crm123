import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { getRetellClient } from "@/lib/retell/client";
import { ensureOutboundAgent } from "@/lib/retell/outbound-sync";
import { toE164 } from "@/lib/phone";

/**
 * GET /api/cron/auto-scheduler-timeout
 *
 * Vercel cron running every 1 minute.
 * Checks for expired auto_coverage_sessions (deadline_at < now)
 * and handles timeout: re-assigns original caregiver, places callback.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  // Find expired sessions
  const { data: expiredSessions, error } = await supabase
    .from("auto_coverage_sessions")
    .select("*, employees!auto_coverage_sessions_original_caregiver_id_fkey!left(first_name, last_name, phone)")
    .eq("status", "outreach")
    .lt("deadline_at", new Date().toISOString());

  if (error) {
    console.error("[auto-scheduler-timeout] Query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!expiredSessions || expiredSessions.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const retell = getRetellClient();
  let processed = 0;

  for (const session of expiredSessions) {
    try {
      // 1. Update session status to expired
      await supabase
        .from("auto_coverage_sessions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", session.id);

      // 2. Re-assign original caregiver if present, otherwise just cancel outreach
      if (session.original_caregiver_id) {
        const { data: reassigned } = await supabase
          .from("schedule_events")
          .update({ caregiver_id: session.original_caregiver_id, status: "scheduled", is_open_shift: false })
          .eq("id", session.event_id)
          .is("caregiver_id", null)
          .select("id, start_at, end_at")
          .maybeSingle();

        if (reassigned) {
          // Audit log
          await supabase.from("schedule_audit_log").insert({
            event_id: session.event_id,
            agency_id: session.agency_id,
            action: "auto_reassigned",
            field_changed: "caregiver_id",
            old_value: JSON.stringify({ caregiver_id: null }),
            new_value: JSON.stringify({ caregiver_id: session.original_caregiver_id }),
            actor_id: null,
            notes: "No coverage found within 10 min — original caregiver re-assigned",
          });

          // 3. Call original caregiver back via Retell
          const employee = session.employees as any;
          const phone = session.original_caregiver_phone || (employee?.phone ? toE164(employee.phone) : null);
          const caregiverName = employee
            ? `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim()
            : "there";

          if (phone && retell) {
            // Fetch agency name
            const { data: agency } = await supabase
              .from("agencies")
              .select("name")
              .eq("id", session.agency_id)
              .maybeSingle();

            const { data: coordConfig } = await supabase
              .from("coordinator_config")
              .select("coverage_line")
              .eq("agency_id", session.agency_id)
              .maybeSingle();

            const coverageLine = coordConfig?.coverage_line ? toE164(coordConfig.coverage_line) : null;
            const outboundAgentId = await ensureOutboundAgent(session.agency_id, supabase);

            if (outboundAgentId && coverageLine) {
              const startAt = new Date(reassigned.start_at);
              const shiftDate = startAt.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              });
              const shiftTime = startAt.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              try {
                const call = await retell.call.createPhoneCall({
                  from_number: coverageLine,
                  to_number: phone,
                  override_agent_id: outboundAgentId,
                  retell_llm_dynamic_variables: {
                    caregiver_name: caregiverName,
                    agency_name: agency?.name ?? "your agency",
                    callback_message: `Unfortunately, we were unable to find a replacement for your shift on ${shiftDate} at ${shiftTime}. The shift cannot be cancelled. Please contact your supervisor if you need further assistance.`,
                  },
                  metadata: {
                    auto_coverage_session_id: session.id,
                    callback_type: "no_coverage_found",
                    agency_id: session.agency_id,
                  },
                } as any);

                // Store callback call ID
                await supabase
                  .from("auto_coverage_sessions")
                  .update({ callback_call_id: call.call_id })
                  .eq("id", session.id);
              } catch (callErr) {
                console.error(`[auto-scheduler-timeout] Callback call failed for session ${session.id}:`, callErr);
              }
            }
          }
        }
      }

      // 4. Cancel remaining pending/in_progress outreach attempts
      await supabase
        .from("outreach_attempts")
        .update({ status: "cancelled" })
        .eq("event_id", session.event_id)
        .in("status", ["pending", "in_progress"]);

      processed++;
    } catch (err) {
      console.error(`[auto-scheduler-timeout] Error processing session ${session.id}:`, err);
    }
  }

  return NextResponse.json({ processed });
}
