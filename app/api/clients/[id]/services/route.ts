import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const UpdateClientServicesSchema = z.object({
  serviceIds: z.array(z.string().uuid()),
});

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number, details?: unknown): NextResponse {
  return jsonResponse(
    status === 400 && details ? { error: message, details } : { error: message },
    status
  );
}

/** PUT /api/clients/[id]/services */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { id: clientId } = await params;

    // Validate client exists and belongs to agency
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("agency_id", agencyId)
      .single();

    if (clientError || !client) {
      return errorResponse("Client not found", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = UpdateClientServicesSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const { serviceIds } = parsed.data;

    // Validate all service IDs exist and belong to the agency
    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await supabase
        .from("agency_services")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("is_active", true)
        .in("id", serviceIds);

      if (servicesError) {
        return errorResponse("Failed to validate services", 500);
      }

      if (!services || services.length !== serviceIds.length) {
        return errorResponse("One or more service IDs are invalid", 400);
      }
    }

    // Delete existing client services
    const { error: deleteError } = await supabase
      .from("client_services")
      .delete()
      .eq("client_id", clientId)
      .eq("agency_id", agencyId);

    if (deleteError) {
      return errorResponse("Failed to remove existing services", 500);
    }

    // Insert new client services
    if (serviceIds.length > 0) {
      const insertData = serviceIds.map(serviceId => ({
        client_id: clientId,
        service_id: serviceId,
        agency_id: agencyId,
      }));

      const { error: insertError } = await supabase
        .from("client_services")
        .insert(insertData);

      if (insertError) {
        return errorResponse("Failed to add services", 500);
      }
    }

    // Fetch updated services to return
    const { data: updatedServices } = await supabase
      .from("client_services")
      .select(`
        service_id,
        agency_services!inner(id, name)
      `)
      .eq("client_id", clientId)
      .eq("agency_id", agencyId);

    const services = updatedServices?.map(cs => ({
      id: cs.agency_services.id,
      name: cs.agency_services.name
    })) || [];

    return jsonResponse({ data: services }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}