import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseServiceClient } from "@/lib/supabase/server"

/**
 * Public endpoint — no auth required.
 * Validates submission data, uploads any signature images to Storage,
 * persists the submission, and marks the invitation as completed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    const service = createServerSupabaseServiceClient()
    if (!service) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    const { shortId } = await params
    const body = await request.json()
    const {
      data: formData,
      token,
      respondentEmail,
      respondentName,
      respondentType = "external",
    } = body as {
      data: Record<string, unknown>
      token?: string
      respondentEmail?: string
      respondentName?: string
      respondentType?: string
    }

    // Fetch the form to get agency_id and schema
    const { data: form, error: formError } = await service
      .from("forms")
      .select("id, agency_id, schema, status")
      .eq("short_id", shortId)
      .eq("status", "published")
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: "Form not found or not published" }, { status: 404 })
    }

    // Resolve the invitation
    let invitationId: string | null = null
    if (token) {
      const { data: invitation } = await service
        .from("form_invitations")
        .select("id, recipient_email, recipient_name, recipient_type, recipient_id")
        .eq("token", token)
        .eq("form_id", form.id)
        .single()

      if (invitation) {
        invitationId = invitation.id
        if (!respondentEmail) body.respondentEmail = invitation.recipient_email
        if (!respondentName) body.respondentName = invitation.recipient_name
      }
    }

    // Separate signature fields from regular data and upload to storage
    const signatureUrls: Record<string, string> = {}
    const cleanData: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(formData)) {
      if (
        typeof value === "string" &&
        value.startsWith("data:image/") &&
        value.includes("base64,")
      ) {
        // Convert base64 data URL to a buffer and upload to Supabase Storage
        const base64 = value.split(",")[1]
        const buffer = Buffer.from(base64, "base64")
        const path = `${form.agency_id}/${form.id}/${Date.now()}_${key}.png`

        const { data: uploadData, error: uploadError } = await service.storage
          .from("form-signatures")
          .upload(path, buffer, {
            contentType: "image/png",
            upsert: false,
          })

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = service.storage
            .from("form-signatures")
            .getPublicUrl(uploadData.path)
          signatureUrls[key] = publicUrl
          cleanData[key] = `[signature:${key}]`
        } else {
          cleanData[key] = value
        }
      } else {
        cleanData[key] = value
      }
    }

    // Insert the submission
    const { data: submission, error: insertError } = await service
      .from("form_submissions")
      .insert({
        form_id: form.id,
        agency_id: form.agency_id,
        invitation_id: invitationId,
        respondent_email: respondentEmail ?? null,
        respondent_name: respondentName ?? null,
        respondent_type: respondentType,
        data: cleanData,
        signature_urls: Object.keys(signatureUrls).length > 0 ? signatureUrls : null,
      })
      .select("id, submitted_at")
      .single()

    if (insertError) throw insertError

    // Mark the invitation as completed
    if (invitationId) {
      await service
        .from("form_invitations")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", invitationId)
    }

    return NextResponse.json({ data: { id: submission.id, submitted_at: submission.submitted_at } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
