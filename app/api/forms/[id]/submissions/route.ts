import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (isAuthError(auth)) return auth
    const { supabase, agencyId } = auth
    const { id } = await params

    // Verify the form belongs to this agency
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id, title, schema")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    const { data, error, count } = await supabase
      .from("form_submissions")
      .select("*", { count: "exact" })
      .eq("form_id", id)
      .eq("agency_id", agencyId)
      .order("submitted_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data, count: count ?? 0, form })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
