"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FileText, Plus, Edit2, Globe, Clock, MoreHorizontal, Trash2, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/store/useAuthStore"
import { useFormBuilderStore } from "@/stores/form-builder"
import { deserializeFormFields, type SerializedFormField } from "@/lib/form-builder-serialization"
import type { FormCustomization } from "@/types/form-customization"
import { SendFormDialog } from "@/components/forms/send-form-dialog"
import { formatDistanceToNow } from "date-fns"

interface FormRecord {
  id: string
  title: string
  description: string | null
  status: "draft" | "published" | "archived"
  short_id: string | null
  created_at: string
  updated_at: string
  schema: SerializedFormField[]
  customization: FormCustomization
}

export function FormsList() {
  const router = useRouter()
  const { currentAgencyId } = useAuthStore()
  const { setFormId, setFormShortId, setFormFields, updateCustomization, resetCustomization } = useFormBuilderStore()

  const [forms, setForms] = React.useState<FormRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sendDialog, setSendDialog] = React.useState<{ open: boolean; form: FormRecord | null }>({ open: false, form: null })

  const fetchForms = React.useCallback(async () => {
    if (!currentAgencyId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/forms?status=draft&status=published`, {
        headers: { "x-agency-id": currentAgencyId },
      })
      const res2 = await fetch(`/api/forms`, {
        headers: { "x-agency-id": currentAgencyId },
      })
      const json = await res2.json()
      if (!res2.ok) throw new Error(json.error)
      setForms((json.data ?? []).filter((f: FormRecord) => f.status !== "archived"))
    } catch {
      toast.error("Failed to load forms.")
    } finally {
      setLoading(false)
    }
  }, [currentAgencyId])

  React.useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const openInBuilder = (form: FormRecord) => {
    setFormId(form.id)
    setFormShortId(form.short_id)
    resetCustomization()
    updateCustomization(form.customization)
    setFormFields(deserializeFormFields(form.schema ?? []))
    router.push("/forms/builder")
  }

  const handleArchive = async (formId: string) => {
    if (!currentAgencyId) return
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: "DELETE",
        headers: { "x-agency-id": currentAgencyId },
      })
      if (!res.ok) throw new Error("Failed to archive")
      toast.success("Form archived.")
      fetchForms()
    } catch {
      toast.error("Failed to archive form.")
    }
  }

  const handlePublish = async (form: FormRecord) => {
    if (!currentAgencyId) return
    try {
      const res = await fetch(`/api/forms/${form.id}/publish`, {
        method: "POST",
        headers: { "x-agency-id": currentAgencyId },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success("Form published!")
      fetchForms()
    } catch {
      toast.error("Failed to publish form.")
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl border border-neutral-200 bg-neutral-50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-base font-semibold mb-2">No forms yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Start with the form builder to create your first form. Send it to clients, caregivers, or employees.
        </p>
        <Button onClick={() => router.push("/forms/builder")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {forms.map((form) => (
          <div
            key={form.id}
            className="group relative flex flex-col rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300 hover:shadow-sm transition-all"
          >
            {/* Status badge */}
            <div className="flex items-start justify-between mb-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  form.status === "published"
                    ? "bg-green-50 text-green-700"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {form.status === "published" ? (
                  <Globe className="h-2.5 w-2.5" />
                ) : (
                  <Clock className="h-2.5 w-2.5" />
                )}
                {form.status === "published" ? "Published" : "Draft"}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => openInBuilder(form)}>
                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                    Edit in Builder
                  </DropdownMenuItem>
                  {form.status !== "published" && (
                    <DropdownMenuItem onClick={() => handlePublish(form)}>
                      <Globe className="h-3.5 w-3.5 mr-2" />
                      Publish
                    </DropdownMenuItem>
                  )}
                  {form.status === "published" && form.short_id && (
                    <DropdownMenuItem onClick={() => setSendDialog({ open: true, form })}>
                      <Send className="h-3.5 w-3.5 mr-2" />
                      Send Form
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleArchive(form.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Title & description */}
            <div className="flex-1 mb-3">
              <h3 className="text-[14px] font-semibold text-neutral-900 line-clamp-1">{form.title}</h3>
              {form.description && (
                <p className="text-[12px] text-neutral-500 mt-0.5 line-clamp-2">{form.description}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                {form.schema?.length ?? 0} field{form.schema?.length !== 1 ? "s" : ""}
              </span>
              <span className="text-[11px] text-neutral-400">
                {formatDistanceToNow(new Date(form.updated_at), { addSuffix: true })}
              </span>
            </div>

            {/* Click area */}
            <button
              className="absolute inset-0 rounded-xl"
              onClick={() => openInBuilder(form)}
              aria-label={`Open ${form.title} in builder`}
            />
          </div>
        ))}
      </div>

      {sendDialog.form && currentAgencyId && (
        <SendFormDialog
          open={sendDialog.open}
          onOpenChange={(open) => setSendDialog({ open, form: sendDialog.form })}
          formId={sendDialog.form.id}
          formTitle={sendDialog.form.title}
          shortId={sendDialog.form.short_id}
          agencyId={currentAgencyId}
        />
      )}
    </>
  )
}
