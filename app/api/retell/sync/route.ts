import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import {
  mapReceptionistConfigRowToApi,
  type ReceptionistConfigRow,
} from "@/lib/db/receptionist.mapper";
import { syncConfigToRetell } from "@/lib/retell/sync";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

/**
 * POST /api/retell/sync
 * Manual re-sync: fetches the current receptionist config and pushes to Retell.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    // Fetch current config
    const { data: row, error } = await supabase
      .from("receptionist_config")
      .select("*")
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch receptionist config for sync:", error);
      return errorResponse("Failed to fetch config", 500);
    }

    if (!row) {
      return errorResponse("No receptionist config found. Complete setup first.", 404);
    }

    console.log("[Retell Sync API] DB row escalation_number:", row.escalation_number);
    console.log("[Retell Sync API] DB row reception_line:", row.reception_line);

    const serviceClient = createServerSupabaseServiceClient();
    if (!serviceClient) {
      return errorResponse("Service client not configured", 500);
    }

    const syncResult = await syncConfigToRetell(
      row as ReceptionistConfigRow,
      serviceClient
    );

    // Re-fetch to get updated sync status
    const { data: refreshed } = await supabase
      .from("receptionist_config")
      .select("*")
      .eq("agency_id", agencyId)
      .single();

    const config = mapReceptionistConfigRowToApi(
      (refreshed as ReceptionistConfigRow) ?? (row as ReceptionistConfigRow)
    );

    return jsonResponse(
      {
        data: config,
        sync: syncResult,
      },
      200
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
