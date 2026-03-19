import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateClientSchema } from "@/lib/validation/client.schema";
import {
  mapCreateClientToRow,
  mapRowToClient,
  type ClientRow,
} from "@/lib/db/client.mapper";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number, details?: unknown): NextResponse {
  return jsonResponse(
    status === 400 && details ? { error: message, details } : { error: message },
    status
  );
}

/** GET /api/clients — list with pagination, optional search, exclude archived by default */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
    const q = searchParams.get("q")?.trim() ?? "";
    const includeArchived = searchParams.get("includeArchived") === "true";

    const needCount = searchParams.get("count") === "true";
    let query = supabase
      .from("clients")
      .select("*", { count: needCount ? "exact" : undefined })
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    if (q.length > 0) {
      const safe = q.replace(/,/g, " ").trim();
      const pattern = `%${safe}%`;
      query = query.or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern}`
      );
    }

    const { data: rows, error, count } = await query;

    if (error) {
      return errorResponse(error.message || "Failed to list clients", 500);
    }

    const clientRows = (rows ?? []) as ClientRow[];
    const clientIds = clientRows.map((r) => r.id);
    const { data: primaryGuardians } = clientIds.length > 0
      ? await supabase
          .from("client_guardians")
          .select("client_id, name, relationship, phone")
          .in("client_id", clientIds)
          .eq("agency_id", agencyId)
          .eq("is_primary", true)
      : { data: [] as Array<{ client_id: string; name: string; relationship: string; phone: string }> };

    const primaryByClientId = new Map(
      (primaryGuardians ?? []).map((g) => [
        g.client_id,
        { name: g.name, relation: g.relationship, phone: g.phone },
      ])
    );

    // Batch-fetch services for all clients in one query
    const { data: allClientServices } = clientIds.length > 0
      ? await supabase
          .from("client_services")
          .select("client_id, agency_services!inner(id, name)")
          .in("client_id", clientIds)
          .eq("agency_id", agencyId)
      : { data: [] as Array<{ client_id: string; agency_services: { id: string; name: string } }> };

    const servicesByClientId = new Map<string, { id: string; name: string }[]>();
    for (const cs of allClientServices ?? []) {
      const svc = cs.agency_services as unknown as { id: string; name: string };
      const list = servicesByClientId.get(cs.client_id) ?? [];
      list.push({ id: svc.id, name: svc.name });
      servicesByClientId.set(cs.client_id, list);
    }

    const data = clientRows.map((row) => {
      const api = mapRowToClient(row);
      const primary = primaryByClientId.get(row.id);
      if (primary) api.primaryContact = primary;
      api.services = servicesByClientId.get(row.id) ?? [];
      return api;
    });
    return jsonResponse({ data, count: count ?? 0 }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/** POST /api/clients — create client */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = CreateClientSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const row = { ...mapCreateClientToRow(input), agency_id: agencyId };

    const { data: inserted, error } = await supabase
      .from("clients")
      .insert(row)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message || "Failed to create client", 500);
    }

    const clientId = (inserted as ClientRow).id;
    const { error: guardianError } = await supabase.from("client_guardians").insert({
      client_id: clientId,
      agency_id: agencyId,
      name: input.primaryContact.name,
      relationship: input.primaryContact.relation,
      phone: input.primaryContact.phone,
      is_primary: true,
    });

    if (guardianError) {
      return errorResponse(guardianError.message || "Failed to create primary contact", 500);
    }

    const api = mapRowToClient(inserted as ClientRow);
    api.primaryContact = {
      name: input.primaryContact.name,
      relation: input.primaryContact.relation,
      phone: input.primaryContact.phone,
    };
    return jsonResponse({ data: api }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
