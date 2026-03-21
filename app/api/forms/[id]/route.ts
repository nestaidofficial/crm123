import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { serializeFormFields } from "@/lib/form-builder-serialization"
import type { FormBuilderField } from "@/types/form-builder-field"
import type { FormCustomization } from "@/types/form-customization"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (isAuthError(auth)) return auth
    const { supabase, agencyId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Form not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (isAuthError(auth)) return auth
    const { supabase, agencyId } = auth
    const { id } = await params

    const body = await request.json()
    const { title, description, fields, customization } = body as {
      title?: string
      description?: string
      fields?: FormBuilderField[]
      customization?: FormCustomization
    }

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (fields !== undefined) updates.schema = serializeFormFields(fields)
    if (customization !== undefined) updates.customization = customization

    const { data, error } = await supabase
      .from("forms")
      .update(updates)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select("id, title, status, short_id, updated_at")
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Form not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (isAuthError(auth)) return auth
    const { supabase, agencyId } = auth
    const { id } = await params

    const { error } = await supabase
      .from("forms")
      .update({ status: "archived" })
      .eq("id", id)
      .eq("agency_id", agencyId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
