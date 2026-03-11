import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateEmployeeSchema } from "@/lib/validation/employee.schema";
import {
  mapCreateEmployeeToRow,
  mapRowToEmployee,
  type EmployeeRow,
} from "@/lib/db/employee.mapper";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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

/** GET /api/employees — list with pagination, optional search, exclude archived by default */
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
      .from("employees")
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
        `first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`
      );
    }

    const { data: rows, error, count } = await query;

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to list employees";
      return errorResponse(message, 500);
    }

    const employeeRows = (rows ?? []) as EmployeeRow[];
    const data = employeeRows.map((row) => mapRowToEmployee(row));

    return jsonResponse({ data, count: count ?? 0 }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/** POST /api/employees — create employee */
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

    const parsed = CreateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const row = { ...mapCreateEmployeeToRow(input), agency_id: agencyId };

    const { data: inserted, error } = await supabase
      .from("employees")
      .insert(row)
      .select()
      .single();

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to create employee";
      return errorResponse(message, 500);
    }

    const employeeId = (inserted as EmployeeRow).id;

    // Create default verification checklist items
    const defaultVerifications = [
      { name: "Background Check", sort_order: 1 },
      { name: "Reference 1 Verified", sort_order: 2 },
      { name: "Reference 2 Verified", sort_order: 3 },
      { name: "I-9 Form", sort_order: 4 },
      { name: "HIPAA Training", sort_order: 5 },
    ];

    const verificationRows = defaultVerifications.map((v) => ({
      employee_id: employeeId,
      agency_id: agencyId,
      name: v.name,
      status: "pending" as const,
      sort_order: v.sort_order,
    }));

    const { error: verificationError } = await supabase
      .from("employee_verifications")
      .insert(verificationRows);

    if (verificationError) {
      console.error("Failed to create verification items:", verificationError);
      // Don't fail the entire request if verification items fail
    }

    const api = mapRowToEmployee(inserted as EmployeeRow);
    return jsonResponse({ data: api }, 201);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
