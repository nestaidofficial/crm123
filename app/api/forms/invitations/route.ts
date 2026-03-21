import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (isAuthError(auth)) return auth
    const { supabase, agencyId } = auth

    const { data, error, count } = await supabase
      .from("form_invitations")
      .select(
        `id, form_id, recipient_email, recipient_name, recipient_type, status, sent_at, completed_at,
         forms:form_id (title, short_id)`,
        { count: "exact" }
      )
      .eq("agency_id", agencyId)
      .order("sent_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ data, count: count ?? 0 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
