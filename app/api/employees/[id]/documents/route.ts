import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

const BUCKET = "employee-documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const DOC_TYPES = [
  // Compliance workflow types
  "application",
  "cori",
  "sori",
  "training",
  "i9",
  "policy",
  "emergency",
  "w4",
  "direct_deposit",
  "offer_letter",
  "reference",
  "interview",
  "transportation",
  "other",
  // Legacy types kept for backwards compatibility
  "id",
  "contract",
  "certification",
] as const;

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 200) || "file";
}

function formatSize(bytes: number | null): string {
  if (bytes == null || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** GET /api/employees/[id]/documents — list documents, optional signed URLs */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { id: employeeId } = await params;
    if (!employeeId) return errorResponse("Missing employee id", 400);

    const { data: rows, error } = await supabase
      .from("employee_documents")
      .select("id, name, type, file_path, file_size_bytes, mime_type, uploaded_at, expiry_date, compliance_step_id")
      .eq("employee_id", employeeId)
      .eq("agency_id", agencyId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return errorResponse(error.message || "Failed to list documents", 500);
    }

    const list = (rows ?? []) as Array<{
      id: string;
      name: string;
      type: string;
      file_path: string;
      file_size_bytes: number | null;
      mime_type: string | null;
      uploaded_at: string;
      expiry_date: string | null;
      compliance_step_id: string | null;
    }>;

    const storageClient = createServerSupabaseServiceClient();
    const signedUrlExpiry = 3600;
    const data = await Promise.all(
      list.map(async (row) => {
        let url: string | undefined;
        try {
          if (storageClient) {
            const { data: signed } = await storageClient.storage
              .from(BUCKET)
              .createSignedUrl(row.file_path, signedUrlExpiry);
            url = signed?.signedUrl;
          }
        } catch {
          // omit url if signed URL fails
        }
        return {
          id: row.id,
          name: row.name,
          type: row.type,
          size: formatSize(row.file_size_bytes),
          uploadedDate: row.uploaded_at,
          expiryDate: row.expiry_date ?? undefined,
          complianceStepId: row.compliance_step_id ?? undefined,
          url,
        };
      })
    );

    return jsonResponse({ data }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/** POST /api/employees/[id]/documents — upload one or more files */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { id: employeeId } = await params;
    if (!employeeId) return errorResponse("Missing employee id", 400);

    const client = createServerSupabaseServiceClient();

    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("agency_id", agencyId)
      .single();
    if (!employee) return errorResponse("Employee not found", 404);

    const formData = await request.formData();
    const typeInput = formData.get("type");
    const docType = DOC_TYPES.includes((typeInput as (typeof DOC_TYPES)[number]) ?? "")
      ? (typeInput as (typeof DOC_TYPES)[number])
      : "other";

    const nameInput = formData.get("name");
    const documentName =
      typeof nameInput === "string" && nameInput.trim().length > 0
        ? nameInput.trim().slice(0, 500)
        : null;
    if (!documentName) return errorResponse("Document name is required", 400);

    const expiryInput = formData.get("expiry");
    let expiryDate: string | null = null;
    if (typeof expiryInput === "string" && expiryInput.trim()) {
      const d = new Date(expiryInput.trim());
      if (!Number.isNaN(d.getTime())) expiryDate = d.toISOString().slice(0, 10);
    }

    const stepIdInput = formData.get("step_id");
    const complianceStepId =
      typeof stepIdInput === "string" && stepIdInput.trim().length > 0
        ? stepIdInput.trim().slice(0, 100)
        : null;

    const raw = formData.getAll("files");
    const files = raw.filter(
      (v): v is File => v instanceof File && v.size > 0
    );
    if (files.length === 0) return errorResponse("No files provided", 400);

    const created: Array<{ id: string; name: string; type: string; size: string; uploadedDate: string; expiryDate?: string; complianceStepId?: string }> = [];

    for (const file of files) {
      const fileName = file.name;
      const contentType = file.type || undefined;
      if (file.size > MAX_FILE_BYTES) {
        return errorResponse(`File "${fileName}" exceeds 10MB limit`, 400);
      }
      const sanitized = sanitizeFileName(fileName);
      const path = `${agencyId}/${employeeId}/${crypto.randomUUID()}-${sanitized}`;

      if (!client) {
        return errorResponse("Storage not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.", 500);
      }

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(path, file, { contentType: contentType || undefined, upsert: false });

      if (uploadError) {
        return errorResponse(
          uploadError.message ||
            "Upload failed. If the bucket is private, set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
          500
        );
      }

      const { data: row, error: insertError } = await supabase
        .from("employee_documents")
        .insert({
          employee_id: employeeId,
          agency_id: agencyId,
          name: documentName,
          type: docType,
          file_path: path,
          file_size_bytes: file.size,
          mime_type: contentType ?? null,
          expiry_date: expiryDate,
          compliance_step_id: complianceStepId,
        })
        .select("id, name, type, file_size_bytes, uploaded_at, expiry_date, compliance_step_id")
        .single();

      if (insertError) {
        if (client) await client.storage.from(BUCKET).remove([path]);
        return errorResponse(insertError.message || "Failed to save document record", 500);
      }

      const r = row as { id: string; name: string; type: string; file_size_bytes: number | null; uploaded_at: string; expiry_date: string | null; compliance_step_id: string | null };
      created.push({
        id: r.id,
        name: r.name,
        type: r.type,
        size: formatSize(r.file_size_bytes),
        uploadedDate: r.uploaded_at,
        expiryDate: r.expiry_date ?? undefined,
        complianceStepId: r.compliance_step_id ?? undefined,
      });
    }

    return jsonResponse({ data: created }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}

/** DELETE /api/employees/[id]/documents — delete a document by documentId in query params */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { id: employeeId } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return errorResponse("Missing documentId query parameter", 400);
    }

    const storageClient = createServerSupabaseServiceClient();
    const { supabase, agencyId } = auth;

    // Verify employee exists and belongs to agency
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("agency_id", agencyId)
      .single();

    if (empError || !employee) {
      return errorResponse("Employee not found", 404);
    }

    // Get document to retrieve file_path for storage deletion
    const { data: document, error: fetchError } = await supabase
      .from("employee_documents")
      .select("file_path")
      .eq("id", documentId)
      .eq("employee_id", employeeId)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError || !document) {
      return errorResponse("Document not found", 404);
    }

    // Delete file from storage bucket
    try {
      if (storageClient) {
        await storageClient.storage.from(BUCKET).remove([document.file_path]);
      }
    } catch (storageError) {
      console.warn("Failed to delete file from storage:", storageError);
    }

    // Delete document record
    const { error } = await supabase
      .from("employee_documents")
      .delete()
      .eq("id", documentId)
      .eq("employee_id", employeeId)
      .eq("agency_id", agencyId);

    if (error) {
      const message =
        typeof error.message === "string"
          ? error.message
          : "Failed to delete document";
      return errorResponse(message, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
