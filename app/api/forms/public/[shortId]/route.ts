import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseServiceClient } from "@/lib/supabase/server"

/**
 * Public endpoint — no auth required.
 * Returns the form schema and customization for rendering the fill page.
 * Also marks a linked invitation as "viewed" if a token is provided.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    const service = createServerSupabaseServiceClient()
    if (!service) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    const { shortId } = await params
    const token = new URL(request.url).searchParams.get("token")

    const { data: form, error } = await service
      .from("forms")
      .select("id, title, description, schema, customization, status, agency_id")
      .eq("short_id", shortId)
      .eq("status", "published")
      .single()

    if (error || !form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // Mark the invitation as viewed if a token was provided
    if (token) {
      await service
        .from("form_invitations")
        .update({ status: "viewed" })
        .eq("token", token)
        .eq("form_id", form.id)
        .eq("status", "pending")
    }

    return NextResponse.json({ data: form })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
