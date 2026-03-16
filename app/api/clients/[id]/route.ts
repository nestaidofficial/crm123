import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import {
  CreateClientSchema,
  UpdateClientSchema,
  type UpdateClientInput,
} from "@/lib/validation/client.schema";
import {
  mapApiShapeToRow,
  mapRowToClient,
  type ClientRow,
  type ClientApiShape,
} from "@/lib/db/client.mapper";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  return jsonResponse(
    status === 400 && details
      ? { error: message, details }
      : { error: message },
    status
  );
}

/** Convert API shape to CreateClientInput for validation */
function apiShapeToCreateInput(api: ClientApiShape) {
  if (api.careType === "non_medical") {
    const cp = api.carePlan as { adlNeeds: string[]; schedulePreferences: { daysOfWeek: string[]; timeWindow: string; visitFrequency: string } };
    return {
      careType: "non_medical" as const,
      firstName: api.firstName,
      lastName: api.lastName,
      dob: api.dob,
      gender: api.gender,
      phone: api.phone,
      email: api.email ?? undefined,
      avatarUrl: api.avatarUrl ?? undefined,
      address: api.address,
      primaryContact: api.primaryContact,
      emergencyContact: api.emergencyContact,
      notes: api.notes ?? undefined,
      adlNeeds: cp.adlNeeds,
      schedulePreferences: cp.schedulePreferences,
    };
  }
  const cp = api.carePlan as { diagnosis: string; physician: { name: string; phone: string }; medications: { name: string; dose: string; frequency: string }[]; skilledServices: string[] };
  return {
    careType: "medical" as const,
    firstName: api.firstName,
    lastName: api.lastName,
    dob: api.dob,
    gender: api.gender,
    phone: api.phone,
    email: api.email ?? undefined,
    avatarUrl: api.avatarUrl ?? undefined,
    address: api.address,
    primaryContact: api.primaryContact,
    emergencyContact: api.emergencyContact,
    notes: api.notes ?? undefined,
    diagnosis: cp.diagnosis,
    physician: cp.physician,
    medications: cp.medications,
    skilledServices: cp.skilledServices,
  };
}

/** Deep-merge update into existing API shape */
function mergeUpdateIntoApiShape(
  existing: ClientApiShape,
  update: UpdateClientInput
): ClientApiShape {
  const merged: ClientApiShape = {
    ...existing,
    ...(update.firstName !== undefined && { firstName: update.firstName }),
    ...(update.lastName !== undefined && { lastName: update.lastName }),
    ...(update.dob !== undefined && { dob: update.dob }),
    ...(update.gender !== undefined && { gender: update.gender }),
    ...(update.phone !== undefined && { phone: update.phone }),
    ...(update.email !== undefined && { email: update.email || null }),
    ...(update.avatarUrl !== undefined && { avatarUrl: update.avatarUrl || null }),
    ...(update.notes !== undefined && { notes: update.notes ?? null }),
    ...(update.address !== undefined && {
      address: { ...existing.address, ...update.address },
    }),
    ...(update.primaryContact !== undefined && {
      primaryContact: { ...existing.primaryContact, ...update.primaryContact },
    }),
    ...(update.emergencyContact !== undefined && {
      emergencyContact: {
        ...existing.emergencyContact,
        ...update.emergencyContact,
      },
    }),
  };

  const careType = update.careType ?? existing.careType;

  if (careType === "non_medical") {
    const existingCp = existing.carePlan as {
      adlNeeds: string[];
      schedulePreferences: { daysOfWeek: string[]; timeWindow: string; visitFrequency: string };
    };
    merged.careType = "non_medical";
    merged.carePlan = {
      adlNeeds: update.adlNeeds ?? existingCp.adlNeeds,
      schedulePreferences: {
        daysOfWeek:
          update.schedulePreferences?.daysOfWeek ??
          existingCp.schedulePreferences.daysOfWeek,
        timeWindow:
          update.schedulePreferences?.timeWindow ??
          existingCp.schedulePreferences.timeWindow,
        visitFrequency:
          update.schedulePreferences?.visitFrequency ??
          existingCp.schedulePreferences.visitFrequency,
      },
    };
  } else {
    const existingCp = existing.carePlan as {
      diagnosis: string;
      physician: { name: string; phone: string };
      medications: { name: string; dose: string; frequency: string }[];
      skilledServices: string[];
    };
    merged.careType = "medical";
    merged.carePlan = {
      diagnosis: update.diagnosis ?? existingCp.diagnosis,
      physician: update.physician
        ? { ...existingCp.physician, ...update.physician }
        : existingCp.physician,
      medications: update.medications ?? existingCp.medications,
      skilledServices: update.skilledServices ?? existingCp.skilledServices,
    };
  }

  return merged;
}

/** GET /api/clients/[id] */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { id } = await params;
    const { data: row, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Client not found", 404);
      }
      return errorResponse(error.message || "Failed to fetch client", 500);
    }

    if (!row) {
      return errorResponse("Client not found", 404);
    }

    const api = mapRowToClient(row as ClientRow);
    
    // Fetch primary contact from guardians table
    const { data: primaryRow } = await supabase
      .from("client_guardians")
      .select("name, relationship, phone")
      .eq("client_id", id)
      .eq("agency_id", agencyId)
      .eq("is_primary", true)
      .maybeSingle();

    if (primaryRow) {
      api.primaryContact = {
        name: primaryRow.name,
        relation: primaryRow.relationship,
        phone: primaryRow.phone,
      };
    }

    // Fetch client services
    const { data: clientServices } = await supabase
      .from("client_services")
      .select(`
        service_id,
        agency_services!inner(id, name)
      `)
      .eq("client_id", id)
      .eq("agency_id", agencyId);

    if (clientServices) {
      api.services = clientServices.map(cs => ({
        id: cs.agency_services.id,
        name: cs.agency_services.name
      }));
    }

    return jsonResponse({ data: api }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/** PATCH /api/clients/[id] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { id } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = UpdateClientSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const { data: existingRow, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError || !existingRow) {
      if (fetchError?.code === "PGRST116") {
        return errorResponse("Client not found", 404);
      }
      return errorResponse(fetchError?.message || "Failed to fetch client", 500);
    }

    const existingApi = mapRowToClient(existingRow as ClientRow);
    const merged = mergeUpdateIntoApiShape(existingApi, parsed.data);

    const createInput = apiShapeToCreateInput(merged);
    const validated = CreateClientSchema.safeParse(createInput);
    if (!validated.success) {
      return errorResponse("Validation failed after merge", 400, validated.error.flatten());
    }

    const updateRow = mapApiShapeToRow(merged);
    const { data: updated, error: updateError } = await supabase
      .from("clients")
      .update({
        ...updateRow,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select()
      .single();

    if (updateError) {
      const message =
        typeof updateError.message === "string"
          ? updateError.message
          : "Failed to update client";
      return errorResponse(message, 500);
    }

    return jsonResponse({ data: mapRowToClient(updated as ClientRow) }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/** DELETE /api/clients/[id] — soft delete (set is_archived=true) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { id } = await params;

    const { data: updated, error } = await supabase
      .from("clients")
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Client not found", 404);
      }
      return errorResponse(error.message || "Failed to delete client", 500);
    }

    if (!updated) {
      return errorResponse("Client not found", 404);
    }

    return jsonResponse({ data: mapRowToClient(updated as ClientRow) }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
