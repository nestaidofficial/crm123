import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

const BUCKET = "employee-documents";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

/** GET /api/reports/staff-document-expiry — list all staff documents with expiry info */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const type = searchParams.get("type")?.trim() ?? "";
    const expiryStatus = searchParams.get("expiryStatus")?.trim() ?? "all";
    const role = searchParams.get("role")?.trim() ?? "";

    // Build query: join employees + employee_documents filtered by agency
    let query = supabase
      .from("employee_documents")
      .select(
        `
        id,
        name,
        type,
        file_path,
        expiry_date,
        uploaded_at,
        employee_id,
        employees!inner(
          id,
          first_name,
          last_name,
          avatar_url,
          role,
          is_archived
        )
      `
      )
      .eq("agency_id", agencyId)
      .eq("employees.is_archived", false)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    // Filter by employee name (search)
    if (search) {
      query = query.or(
        `employees.first_name.ilike.%${search}%,employees.last_name.ilike.%${search}%`
      );
    }

    // Filter by document type
    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    // Filter by employee role
    if (role && role !== "all") {
      query = query.eq("employees.role", role);
    }

    // Filter by expiry status
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (expiryStatus === "overdue") {
      query = query.lt("expiry_date", today).not("expiry_date", "is", null);
    } else if (expiryStatus === "7") {
      const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      query = query
        .gte("expiry_date", today)
        .lte("expiry_date", sevenDaysLater)
        .not("expiry_date", "is", null);
    } else if (expiryStatus === "30") {
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      query = query
        .gte("expiry_date", today)
        .lte("expiry_date", thirtyDaysLater)
        .not("expiry_date", "is", null);
    } else if (expiryStatus === "60") {
      const sixtyDaysLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      query = query
        .gte("expiry_date", today)
        .lte("expiry_date", sixtyDaysLater)
        .not("expiry_date", "is", null);
    }
    // "all" means no filter on expiry

    const { data: rows, error } = await query;

    if (error) {
      return errorResponse(error.message || "Failed to fetch report data", 500);
    }

    const list = (rows ?? []).map((row: any) => ({
      id: row.id as string,
      name: row.name as string,
      type: row.type as string,
      file_path: row.file_path as string,
      expiry_date: row.expiry_date as string | null,
      uploaded_at: row.uploaded_at as string,
      employee_id: row.employee_id as string,
      employees: Array.isArray(row.employees) ? row.employees[0] : row.employees,
    }));

    const serviceClient = createServerSupabaseServiceClient();
    const signedUrlExpiry = 3600;
    const data = await Promise.all(
      list.map(async (row) => {
        let url: string | undefined;
        try {
          if (serviceClient) {
            const { data: signed } = await serviceClient.storage
              .from(BUCKET)
              .createSignedUrl(row.file_path, signedUrlExpiry);
            url = signed?.signedUrl;
          }
        } catch {
          // omit url if signed URL fails
        }
        return {
          employee: {
            id: row.employees.id,
            firstName: row.employees.first_name,
            lastName: row.employees.last_name,
            avatarUrl: row.employees.avatar_url ?? undefined,
            role: row.employees.role,
          },
          document: {
            id: row.id,
            name: row.name,
            type: row.type,
            expiryDate: row.expiry_date ?? undefined,
            uploadedAt: row.uploaded_at,
            url,
          },
        };
      })
    );

    return jsonResponse({ data }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
