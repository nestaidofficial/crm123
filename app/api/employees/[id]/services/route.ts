import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const UpdateEmployeeServicesSchema = z.object({
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

/** PUT /api/employees/[id]/services */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { id: employeeId } = await params;

    // Validate employee exists and belongs to agency
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("agency_id", agencyId)
      .single();

    if (employeeError || !employee) {
      return errorResponse("Employee not found", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = UpdateEmployeeServicesSchema.safeParse(body);
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

    // Delete existing employee services
    const { error: deleteError } = await supabase
      .from("employee_services")
      .delete()
      .eq("employee_id", employeeId)
      .eq("agency_id", agencyId);

    if (deleteError) {
      return errorResponse("Failed to remove existing services", 500);
    }

    // Insert new employee services
    if (serviceIds.length > 0) {
      const insertData = serviceIds.map(serviceId => ({
        employee_id: employeeId,
        service_id: serviceId,
        agency_id: agencyId,
      }));

      const { error: insertError } = await supabase
        .from("employee_services")
        .insert(insertData);

      if (insertError) {
        return errorResponse("Failed to add services", 500);
      }
    }

    // Fetch updated services to return
    const { data: updatedServices } = await supabase
      .from("employee_services")
      .select(`
        service_id,
        agency_services!inner(id, name)
      `)
      .eq("employee_id", employeeId)
      .eq("agency_id", agencyId);

    const services = updatedServices?.map(es => {
      const svc = es.agency_services as unknown as { id: string; name: string };
      return { id: svc.id, name: svc.name };
    }) || [];

    return jsonResponse({ data: services }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}