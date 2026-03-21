import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { createServerSupabaseServiceClient } from "@/lib/supabase/server"
import { sendFormInvitationEmail, getAppBaseUrl } from "@/lib/email"

interface Recipient {
  email: string
  name?: string
  type?: string
  id?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (isAuthError(auth)) return auth
    const { supabase, agencyId } = auth
    const { id } = await params

    const body = await request.json()
    const { recipients } = body as { recipients: Recipient[] }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: "At least one recipient is required" }, { status: 400 })
    }

    // Fetch the form + agency name
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id, title, short_id, status")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    if (form.status !== "published" || !form.short_id) {
      return NextResponse.json(
        { error: "Form must be published before sending. Publish it first." },
        { status: 400 }
      )
    }

    const { data: agency } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", agencyId)
      .single()

    const agencyName = agency?.name ?? "Your Care Provider"

    // Use service client for inserting invitations (needs to bypass RLS on insert from server)
    const service = createServerSupabaseServiceClient()
    if (!service) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    const baseUrl = getAppBaseUrl()
    const results: Array<{ email: string; success: boolean; error?: string }> = []

    for (const recipient of recipients) {
      if (!recipient.email) continue

      // Create invitation record
      const { data: invitation, error: inviteError } = await service
        .from("form_invitations")
        .insert({
          form_id: id,
          agency_id: agencyId,
          recipient_email: recipient.email,
          recipient_name: recipient.name ?? null,
          recipient_type: recipient.type ?? "external",
          recipient_id: recipient.id ?? null,
        })
        .select("id, token")
        .single()

      if (inviteError || !invitation) {
        results.push({ email: recipient.email, success: false, error: inviteError?.message })
        continue
      }

      const formUrl = `${baseUrl}/f/${form.short_id}?token=${invitation.token}`

      const emailResult = await sendFormInvitationEmail({
        to: recipient.email,
        recipientName: recipient.name,
        formTitle: form.title,
        agencyName,
        formUrl,
      })

      results.push({ email: recipient.email, ...emailResult })
    }

    const sent = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return NextResponse.json({
      data: { sent, failed, results },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
