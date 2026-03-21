import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { nanoid } from "nanoid"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (isAuthError(auth)) return auth
    const { supabase, agencyId } = auth
    const { id } = await params

    // Check the form exists and belongs to this agency
    const { data: existing, error: fetchError } = await supabase
      .from("forms")
      .select("id, short_id, status")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // Generate a short_id if not yet published
    const shortId = existing.short_id ?? nanoid(8)

    const { data, error } = await supabase
      .from("forms")
      .update({ status: "published", short_id: shortId })
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select("id, title, status, short_id")
      .single()

    if (error) throw error

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"

    return NextResponse.json({
      data: {
        ...data,
        shareUrl: `${baseUrl}/f/${shortId}`,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
