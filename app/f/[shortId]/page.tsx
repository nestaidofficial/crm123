import { notFound } from "next/navigation"
import { createServerSupabaseServiceClient } from "@/lib/supabase/server"
import { FormFill } from "@/components/forms/form-fill"
import type { FormCustomization } from "@/types/form-customization"
import type { SerializedFormField } from "@/lib/form-builder-serialization"

interface Props {
  params: Promise<{ shortId: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function FillFormPage({ params, searchParams }: Props) {
  const { shortId } = await params
  const { token } = await searchParams

  const service = createServerSupabaseServiceClient()
  if (!service) notFound()

  const { data: form, error } = await service
    .from("forms")
    .select("id, title, description, schema, customization, status, agency_id")
    .eq("short_id", shortId)
    .eq("status", "published")
    .single()

  if (error || !form) notFound()

  // Mark the invitation as viewed if a valid token was provided
  if (token) {
    await service
      .from("form_invitations")
      .update({ status: "viewed" })
      .eq("token", token)
      .eq("form_id", form.id)
      .eq("status", "pending")
  }

  return (
    <FormFill
      shortId={shortId}
      serializedFields={(form.schema as SerializedFormField[]) ?? []}
      customization={form.customization as FormCustomization}
      token={token}
    />
  )
}

export async function generateMetadata({ params }: Props) {
  const { shortId } = await params
  const service = createServerSupabaseServiceClient()
  if (!service) return {}

  const { data: form } = await service
    .from("forms")
    .select("title, description")
    .eq("short_id", shortId)
    .eq("status", "published")
    .single()

  return {
    title: form?.title ?? "Fill Form",
    description: form?.description ?? undefined,
  }
}
