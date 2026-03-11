import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  type UpdateEmployeeInput,
} from "@/lib/validation/employee.schema";
import {
  mapApiShapeToRow,
  mapRowToEmployee,
  type EmployeeRow,
  type EmployeeApiShape,
} from "@/lib/db/employee.mapper";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number, details?: unknown): NextResponse {
  return jsonResponse(
    status === 400 && details ? { error: message, details } : { error: message },
    status
  );
}

function apiShapeToCreateInput(api: EmployeeApiShape) {
  return {
    firstName: api.firstName,
    lastName: api.lastName,
    middleName: api.middleName ?? undefined,
    email: api.email,
    phone: api.phone,
    dob: api.dob ?? undefined,
    ssn: api.ssn ?? undefined,
    gender: api.gender ?? undefined,
    avatarUrl: api.avatarUrl ?? undefined,
    role: api.role,
    status: api.status,
    startDate: api.startDate,
    department: api.department,
    supervisor: api.supervisor,
    address: api.address,
    emergencyContact: api.emergencyContact,
    payRate: api.payRate,
    payType: api.payType,
    payroll: api.payroll,
    workAuthorization: api.workAuthorization ?? undefined,
    notes: api.notes ?? undefined,
    skills: api.skills,
  };
}

function mergeUpdateIntoApiShape(existing: EmployeeApiShape, update: UpdateEmployeeInput): EmployeeApiShape {
  return {
    ...existing,
    ...(update.firstName !== undefined && { firstName: update.firstName }),
    ...(update.lastName !== undefined && { lastName: update.lastName }),
    ...(update.middleName !== undefined && { middleName: update.middleName || null }),
    ...(update.email !== undefined && { email: update.email }),
    ...(update.phone !== undefined && { phone: update.phone }),
    ...(update.dob !== undefined && { dob: update.dob || null }),
    ...(update.ssn !== undefined && { ssn: update.ssn || null }),
    ...(update.gender !== undefined && { gender: update.gender || null }),
    ...(update.avatarUrl !== undefined && { avatarUrl: update.avatarUrl || null }),
    ...(update.role !== undefined && { role: update.role }),
    ...(update.status !== undefined && { status: update.status }),
    ...(update.startDate !== undefined && { startDate: update.startDate }),
    ...(update.department !== undefined && { department: update.department }),
    ...(update.supervisor !== undefined && { supervisor: update.supervisor }),
    ...(update.payRate !== undefined && { payRate: update.payRate }),
    ...(update.payType !== undefined && { payType: update.payType }),
    ...(update.workAuthorization !== undefined && { workAuthorization: update.workAuthorization || null }),
    ...(update.notes !== undefined && { notes: update.notes ?? null }),
    ...(update.skills !== undefined && { skills: update.skills }),
    ...(update.address !== undefined && { address: { ...existing.address, ...update.address } }),
    ...(update.emergencyContact !== undefined && { emergencyContact: { ...existing.emergencyContact, ...update.emergencyContact } }),
    ...(update.payroll !== undefined && { payroll: { ...existing.payroll, ...update.payroll } }),
  };
}

/** GET /api/employees/[id] */
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
      .from("employees")
      .select("*")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return errorResponse("Employee not found", 404);
      return errorResponse(error.message || "Failed to fetch employee", 500);
    }
    if (!row) return errorResponse("Employee not found", 404);

    return jsonResponse({ data: mapRowToEmployee(row as EmployeeRow) }, 200);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "An unexpected error occurred", 500);
  }
}

/** PATCH /api/employees/[id] */
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

    const parsed = UpdateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const { data: existingRow, error: fetchError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError || !existingRow) {
      if (fetchError?.code === "PGRST116") return errorResponse("Employee not found", 404);
      return errorResponse(fetchError?.message || "Failed to fetch employee", 500);
    }

    const existingApi = mapRowToEmployee(existingRow as EmployeeRow);
    const merged = mergeUpdateIntoApiShape(existingApi, parsed.data);

    const createInput = apiShapeToCreateInput(merged);
    const validated = CreateEmployeeSchema.safeParse(createInput);
    if (!validated.success) {
      return errorResponse("Validation failed after merge", 400, validated.error.flatten());
    }

    const updateRow = mapApiShapeToRow(merged);
    const { data: updated, error: updateError } = await supabase
      .from("employees")
      .update({ ...updateRow, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select()
      .single();

    if (updateError) {
      return errorResponse(updateError.message || "Failed to update employee", 500);
    }

    return jsonResponse({ data: mapRowToEmployee(updated as EmployeeRow) }, 200);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "An unexpected error occurred", 500);
  }
}

/** DELETE /api/employees/[id] — soft delete */
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
      .from("employees")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return errorResponse("Employee not found", 404);
      return errorResponse(error.message || "Failed to delete employee", 500);
    }
    if (!updated) return errorResponse("Employee not found", 404);

    return jsonResponse({ data: mapRowToEmployee(updated as EmployeeRow) }, 200);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "An unexpected error occurred", 500);
  }
}
