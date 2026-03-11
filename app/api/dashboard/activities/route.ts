import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

/**
 * GET /api/dashboard/activities
 * Returns recent activity log entries for the dashboard feed
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20),
      100
    );

    const { data: activities, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return errorResponse(error.message || "Failed to fetch activities", 500);
    }

    return jsonResponse({ data: activities ?? [] }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/dashboard/activities
 * Creates a new activity log entry
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { type, title, description, actor_name, status, client_id, employee_id, schedule_event_id, evv_visit_id, metadata } = body;

    if (!type || !title || !description || !actor_name) {
      return errorResponse("Missing required fields: type, title, description, actor_name", 400);
    }

    const { data: activity, error } = await supabase
      .from("activity_log")
      .insert({
        agency_id: agencyId,
        type,
        title,
        description,
        actor_name,
        status: status ?? "info",
        client_id: client_id ?? null,
        employee_id: employee_id ?? null,
        schedule_event_id: schedule_event_id ?? null,
        evv_visit_id: evv_visit_id ?? null,
        metadata: metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      return errorResponse(error.message || "Failed to create activity", 500);
    }

    return jsonResponse({ data: activity }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
