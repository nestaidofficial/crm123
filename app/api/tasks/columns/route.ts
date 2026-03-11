import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { CreateKanbanColumnSchema } from "@/lib/validation/task.schema";
import {
  mapColumnRowToColumn,
  mapCreateColumnToRow,
  type KanbanColumnRow,
} from "@/lib/db/task.mapper";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number, details?: unknown): NextResponse {
  return jsonResponse(
    status === 400 && details ? { error: message, details } : { error: message },
    status
  );
}

/**
 * GET /api/tasks/columns
 * List all kanban columns for the agency
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    const { data: columnRows, error } = await supabase
      .from("kanban_columns")
      .select("*")
      .eq("agency_id", agencyId)
      .order("position", { ascending: true });

    if (error) {
      return errorResponse(error.message || "Failed to fetch columns", 500);
    }

    const columns = (columnRows || []).map((row: KanbanColumnRow) => mapColumnRowToColumn(row));

    return jsonResponse({ data: columns }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/tasks/columns
 * Create a new kanban column
 */
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

    const parsed = CreateKanbanColumnSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    // Check if slug already exists for this agency
    const { data: existing } = await supabase
      .from("kanban_columns")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("slug", input.slug)
      .maybeSingle();

    if (existing) {
      return errorResponse("A column with this slug already exists", 409);
    }

    // Get max position if not provided
    let position = input.position;
    if (position === undefined) {
      const { data: maxPosRow } = await supabase
        .from("kanban_columns")
        .select("position")
        .eq("agency_id", agencyId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      position = maxPosRow ? maxPosRow.position + 1 : 0;
    }

    const columnRow = {
      ...mapCreateColumnToRow(input, agencyId),
      position,
    };

    const { data: insertedColumn, error: insertError } = await supabase
      .from("kanban_columns")
      .insert(columnRow)
      .select()
      .single();

    if (insertError) {
      return errorResponse(insertError.message || "Failed to create column", 500);
    }

    const column = mapColumnRowToColumn(insertedColumn as KanbanColumnRow);

    return jsonResponse({ data: column }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
