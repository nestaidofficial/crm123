import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

const BUCKET = "client-documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const DOC_TYPES = [
  "intake_form",
  "care_plan",
  "contract",
  "insurance",
  "consent",
  "medical_record",
  "certification",
  "other",
] as const;

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[/\\]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 200) || "file"
  );
}

function formatSize(bytes: number | null): string {
  if (bytes == null || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** GET /api/clients/[id]/documents — list documents with signed URLs */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { id: clientId } = await params;
    if (!clientId) return errorResponse("Missing client id", 400);

    const { data: rows, error } = await supabase
      .from("client_documents")
      .select("id, name, type, file_path, file_size_bytes, mime_type, uploaded_at, expiry_date")
      .eq("client_id", clientId)
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
    }>;

    // Use service client for signed URL generation (private bucket)
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
          url,
        };
      })
    );

    return jsonResponse({ data }, 200);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "An unexpected error occurred", 500);
  }
}

/** POST /api/clients/[id]/documents — upload one or more files */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;
    const { id: clientId } = await params;
    if (!clientId) return errorResponse("Missing client id", 400);

    // Use service client for storage uploads (private bucket)
    const storageClient = createServerSupabaseServiceClient();
    if (!storageClient) {
      return errorResponse(
        "Storage not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
        500
      );
    }

    const { data: clientRecord } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("agency_id", agencyId)
      .single();
    if (!clientRecord) return errorResponse("Client not found", 404);

    const formData = await request.formData();
    const typeInput = formData.get("type");
    const docType = DOC_TYPES.includes(
      (typeInput as (typeof DOC_TYPES)[number]) ?? ""
    )
      ? (typeInput as (typeof DOC_TYPES)[number])
      : "other";

    let perFileMeta: Array<{ name?: string; expiryDate?: string }> = [];
    const metadataRaw = formData.get("metadata");
    if (typeof metadataRaw === "string") {
      try {
        perFileMeta = JSON.parse(metadataRaw) as typeof perFileMeta;
      } catch {
        // ignore malformed metadata
      }
    }

    const raw = formData.getAll("files");
    const files = raw.filter(
      (v): v is File => v instanceof File && v.size > 0
    );
    if (files.length === 0) return errorResponse("No files provided", 400);

    const created: Array<{
      id: string;
      name: string;
      type: string;
      size: string;
      uploadedDate: string;
      expiryDate?: string;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const meta = perFileMeta[i] ?? {};
      const fileName = meta.name?.trim() || file.name;
      const expiryDate = meta.expiryDate?.trim() || null;
      const contentType = file.type || undefined;

      if (file.size > MAX_FILE_BYTES) {
        return errorResponse(`File "${file.name}" exceeds 10MB limit`, 400);
      }

      const sanitized = sanitizeFileName(file.name);
      const path = `${agencyId}/${clientId}/${crypto.randomUUID()}-${sanitized}`;

      const { error: uploadError } = await storageClient.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: contentType || undefined,
          upsert: false,
        });

      if (uploadError) {
        return errorResponse(
          uploadError.message ||
            "Upload failed. If the bucket is private, set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
          500
        );
      }

      const { data: row, error: insertError } = await supabase
        .from("client_documents")
        .insert({
          client_id: clientId,
          agency_id: agencyId,
          name: fileName,
          type: docType,
          file_path: path,
          file_size_bytes: file.size,
          mime_type: contentType ?? null,
          expiry_date: expiryDate,
        })
        .select("id, name, type, file_size_bytes, uploaded_at, expiry_date")
        .single();

      if (insertError) {
        await storageClient.storage.from(BUCKET).remove([path]);
        return errorResponse(
          insertError.message || "Failed to save document record",
          500
        );
      }

      const r = row as {
        id: string;
        name: string;
        type: string;
        file_size_bytes: number | null;
        uploaded_at: string;
        expiry_date: string | null;
      };
      created.push({
        id: r.id,
        name: r.name,
        type: r.type,
        size: formatSize(r.file_size_bytes),
        uploadedDate: r.uploaded_at,
        expiryDate: r.expiry_date ?? undefined,
      });
    }

    return jsonResponse({ data: created }, 201);
  } catch (e) {
    return errorResponse(
      e instanceof Error ? e.message : "An unexpected error occurred",
      500
    );
  }
}
