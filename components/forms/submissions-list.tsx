"use client"

import * as React from "react"
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Download,
  PenLine,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow, format } from "date-fns"
import { useAuthStore } from "@/store/useAuthStore"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Submission {
  id: string
  form_id: string
  respondent_email: string | null
  respondent_name: string | null
  respondent_type: string
  data: Record<string, unknown>
  signature_urls: Record<string, string> | null
  submitted_at: string
}

interface FormOption {
  id: string
  title: string
  status: string
}

interface FormSchemaField {
  name: string
  label: string
}

export function SubmissionsList() {
  const { currentAgencyId } = useAuthStore()
  const [forms, setForms] = React.useState<FormOption[]>([])
  const [selectedFormId, setSelectedFormId] = React.useState<string>("")
  const [submissions, setSubmissions] = React.useState<Submission[]>([])
  const [labelMap, setLabelMap] = React.useState<Record<string, string>>({})
  const [loadingForms, setLoadingForms] = React.useState(true)
  const [loadingSubmissions, setLoadingSubmissions] = React.useState(false)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!currentAgencyId) return
    const fetchForms = async () => {
      setLoadingForms(true)
      try {
        const res = await fetch(`/api/forms`, {
          headers: { "x-agency-id": currentAgencyId },
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        const publishedForms = (json.data ?? []).filter((f: FormOption) => f.status === "published")
        setForms(publishedForms)
        if (publishedForms.length > 0) setSelectedFormId(publishedForms[0].id)
      } catch {
        toast.error("Failed to load forms.")
      } finally {
        setLoadingForms(false)
      }
    }
    fetchForms()
  }, [currentAgencyId])

  React.useEffect(() => {
    if (!selectedFormId || !currentAgencyId) return
    const fetchSubmissions = async () => {
      setLoadingSubmissions(true)
      try {
        const res = await fetch(`/api/forms/${selectedFormId}/submissions`, {
          headers: { "x-agency-id": currentAgencyId },
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setSubmissions(json.data ?? [])

        // Build name -> label lookup from the form schema
        const map: Record<string, string> = {}
        for (const field of (json.form?.schema ?? []) as FormSchemaField[]) {
          if (field.name && field.label) map[field.name] = field.label
        }
        setLabelMap(map)
      } catch {
        toast.error("Failed to load submissions.")
      } finally {
        setLoadingSubmissions(false)
      }
    }
    fetchSubmissions()
  }, [selectedFormId, currentAgencyId])

  const handleExportJSON = () => {
    if (submissions.length === 0) return
    const labeled = submissions.map((s) => ({
      ...s,
      data: Object.fromEntries(
        Object.entries(s.data).map(([k, v]) => [labelMap[k] ?? k, v])
      ),
    }))
    const blob = new Blob([JSON.stringify(labeled, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `submissions-${selectedFormId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    if (submissions.length === 0) return
    // Collect all data keys across submissions
    const allKeys = Array.from(
      new Set(submissions.flatMap((s) => Object.keys(s.data)))
    )
    const header = ["id", "submitted_at", "respondent_email", "respondent_name", ...allKeys.map((k) => labelMap[k] ?? k)]
    const rows = submissions.map((s) => [
      s.id,
      s.submitted_at,
      s.respondent_email ?? "",
      s.respondent_name ?? "",
      ...allKeys.map((k) => {
        const val = s.data[k]
        if (typeof val === "string" && val.startsWith("[signature:")) return "[signature image]"
        return JSON.stringify(val ?? "")
      }),
    ])
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `submissions-${selectedFormId}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loadingForms) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-neutral-200 bg-neutral-50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-base font-semibold mb-2">No submissions yet</h3>
        <p className="text-sm text-muted-foreground">
          Publish a form and share it to start collecting responses.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Form selector + export */}
      <div className="flex items-center gap-3">
        <Select value={selectedFormId} onValueChange={setSelectedFormId}>
          <SelectTrigger className="w-64 h-8 text-[13px]">
            <SelectValue placeholder="Select a form" />
          </SelectTrigger>
          <SelectContent>
            {forms.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-[13px]">
                {f.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
          >
            <Download className="h-3 w-3" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            onClick={handleExportJSON}
            disabled={submissions.length === 0}
          >
            <Download className="h-3 w-3" />
            JSON
          </Button>
        </div>
      </div>

      {/* Submissions */}
      {loadingSubmissions ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-neutral-200 bg-neutral-50 animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[13px] text-neutral-500">No submissions for this form yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {submissions.map((sub) => {
            const isExpanded = expandedId === sub.id
            const name = sub.respondent_name ?? sub.respondent_email ?? "Anonymous"
            return (
              <div key={sub.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                >
                  <div className="h-7 w-7 rounded-full bg-neutral-100 flex items-center justify-center text-[11px] font-semibold text-neutral-600 shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-neutral-900 truncate block">{name}</span>
                    <span className="text-[11px] text-neutral-400">
                      {format(new Date(sub.submitted_at), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 mr-2 hidden sm:block">
                    {Object.keys(sub.data).length} field{Object.keys(sub.data).length !== 1 ? "s" : ""}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-neutral-100 px-4 py-4 bg-neutral-50/60">
                    <div className="space-y-2.5">
                      {Object.entries(sub.data).map(([key, value]) => {
                        const isSignatureRef = typeof value === "string" && value.startsWith("[signature:")
                        const signatureUrl = sub.signature_urls?.[key]

                        return (
                          <div key={key} className="flex gap-3">
                            <span className="text-[12px] font-medium text-neutral-500 w-32 shrink-0 pt-0.5">{labelMap[key] ?? key}</span>
                            <div className="flex-1 min-w-0">
                              {isSignatureRef && signatureUrl ? (
                                <div className="flex items-center gap-2">
                                  <PenLine className="h-3.5 w-3.5 text-neutral-400" />
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={signatureUrl}
                                    alt="Signature"
                                    className="max-h-20 border border-neutral-200 rounded bg-white"
                                  />
                                </div>
                              ) : isSignatureRef ? (
                                <span className="text-[12px] text-neutral-400 italic">Signature captured</span>
                              ) : (
                                <span className="text-[13px] text-neutral-800 break-words">
                                  {value === null || value === undefined
                                    ? <span className="text-neutral-400 italic">—</span>
                                    : typeof value === "boolean"
                                    ? value ? "Yes" : "No"
                                    : String(value)}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
