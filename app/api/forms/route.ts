import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { serializeFormFields } from "@/lib/form-builder-serialization"
import type { FormBuilderField } from "@/types/form-builder-field"
import type { FormCustomization } from "@/types/form-customization"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (isAuthError(auth)) return auth
    const { supabase, agencyId } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let query = supabase
      .from("forms")
      .select("id, title, description, status, short_id, created_at, updated_at, created_by, schema, customization")
      .eq("agency_id", agencyId)
      .order("updated_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (isAuthError(auth)) return auth
    const { supabase, agencyId, userId } = auth

    const body = await request.json()
    const { title, description, fields, customization } = body as {
      title: string
      description?: string
      fields: FormBuilderField[]
      customization: FormCustomization
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const schema = serializeFormFields(fields ?? [])

    const { data, error } = await supabase
      .from("forms")
      .insert({
        agency_id: agencyId,
        created_by: userId,
        title,
        description,
        schema,
        customization: customization ?? {},
        status: "draft",
      })
      .select("id, title, status, short_id, created_at")
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
