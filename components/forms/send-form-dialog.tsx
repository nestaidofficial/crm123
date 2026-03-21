"use client"

import * as React from "react"
import { X, Plus, Send, Loader2, Check, Copy } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface Recipient {
  email: string
  name: string
}

interface SendFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formId: string
  formTitle: string
  shortId: string | null
  agencyId: string
}

export function SendFormDialog({
  open,
  onOpenChange,
  formId,
  formTitle,
  shortId,
  agencyId,
}: SendFormDialogProps) {
  const [recipients, setRecipients] = React.useState<Recipient[]>([
    { email: "", name: "" },
  ])
  const [isSending, setIsSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [linkCopied, setLinkCopied] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<{ email: string; name: string }[]>([])

  const shareUrl = shortId
    ? `${window.location.origin}/f/${shortId}`
    : null

  React.useEffect(() => {
    // Load employee/client suggestions for quick selection
    const loadSuggestions = async () => {
      const supabase = getSupabaseBrowserClient()
      const [{ data: employees }, { data: clients }] = await Promise.all([
        supabase
          .from("employees")
          .select("email, first_name, last_name")
          .eq("agency_id", agencyId)
          .not("email", "is", null)
          .limit(50),
        supabase
          .from("clients")
          .select("email, first_name, last_name")
          .eq("agency_id", agencyId)
          .not("email", "is", null)
          .limit(50),
      ])
      const all = [
        ...(employees ?? []).map((e: { email: string | null; first_name: string; last_name: string }) => ({ email: e.email ?? "", name: `${e.first_name} ${e.last_name}`.trim() })),
        ...(clients ?? []).map((c: { email: string | null; first_name: string; last_name: string }) => ({ email: c.email ?? "", name: `${c.first_name} ${c.last_name}`.trim() })),
      ].filter((s) => s.email)
      setSuggestions(all)
    }
    if (open) loadSuggestions()
  }, [open, agencyId])

  const addRecipient = () =>
    setRecipients((r) => [...r, { email: "", name: "" }])

  const removeRecipient = (i: number) =>
    setRecipients((r) => r.filter((_, idx) => idx !== i))

  const updateRecipient = (i: number, field: keyof Recipient, value: string) =>
    setRecipients((r) =>
      r.map((rec, idx) => (idx === i ? { ...rec, [field]: value } : rec))
    )

  const selectSuggestion = (i: number, suggestion: { email: string; name: string }) => {
    setRecipients((r) =>
      r.map((rec, idx) => (idx === i ? { email: suggestion.email, name: suggestion.name } : rec))
    )
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleSend = async () => {
    const validRecipients = recipients.filter((r) => r.email.trim())
    if (validRecipients.length === 0) {
      toast.error("Please add at least one recipient email.")
      return
    }

    setIsSending(true)
    try {
      const res = await fetch(`/api/forms/${formId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agency-id": agencyId,
        },
        body: JSON.stringify({ recipients: validRecipients }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Send failed")
      setSent(true)
      toast.success(`Form sent to ${json.data.sent} recipient${json.data.sent !== 1 ? "s" : ""}.`)
      setTimeout(() => {
        setSent(false)
        onOpenChange(false)
        setRecipients([{ email: "", name: "" }])
      }, 1800)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send form.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold">Send Form</DialogTitle>
          <DialogDescription className="text-[13px] text-neutral-500">
            Send &ldquo;{formTitle}&rdquo; to clients, caregivers, or employees via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Share link */}
          {shareUrl && (
            <div className="space-y-1.5">
              <Label className="text-[12px] text-neutral-500">Share link</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[12px] font-mono text-neutral-600">
                  {shareUrl}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0"
                  onClick={handleCopyLink}
                >
                  {linkCopied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Recipients */}
          <div className="space-y-2">
            <Label className="text-[12px] text-neutral-500">Send via email</Label>
            <div className="space-y-2">
              {recipients.map((rec, i) => (
                <RecipientRow
                  key={i}
                  recipient={rec}
                  suggestions={suggestions}
                  onUpdate={(field, val) => updateRecipient(i, field, val)}
                  onRemove={recipients.length > 1 ? () => removeRecipient(i) : undefined}
                  onSelectSuggestion={(s) => selectSuggestion(i, s)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addRecipient}
              className="flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add another
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[13px]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-[13px]"
              onClick={handleSend}
              disabled={isSending || sent}
            >
              {sent ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Sent
                </>
              ) : isSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send Form
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface RecipientRowProps {
  recipient: Recipient
  suggestions: { email: string; name: string }[]
  onUpdate: (field: keyof Recipient, value: string) => void
  onRemove?: () => void
  onSelectSuggestion: (s: { email: string; name: string }) => void
}

function RecipientRow({
  recipient,
  suggestions,
  onUpdate,
  onRemove,
  onSelectSuggestion,
}: RecipientRowProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  const filtered = recipient.email
    ? suggestions.filter(
        (s) =>
          s.email.toLowerCase().includes(recipient.email.toLowerCase()) ||
          s.name.toLowerCase().includes(recipient.email.toLowerCase())
      )
    : suggestions.slice(0, 6)

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          type="email"
          placeholder="Email address"
          value={recipient.email}
          onChange={(e) => onUpdate("email", e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className="h-8 text-[13px]"
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-neutral-200/80 bg-white shadow-lg max-h-[180px] overflow-y-auto py-1.5">
            {filtered.map((s, i) => (
              <button
                key={i}
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left"
                onMouseDown={() => onSelectSuggestion(s)}
              >
                <div className="h-6 w-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-semibold text-neutral-600 shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] text-neutral-800 truncate">{s.name}</div>
                  <div className="text-[11px] text-neutral-400 truncate">{s.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <Input
        placeholder="Name (optional)"
        value={recipient.name}
        onChange={(e) => onUpdate("name", e.target.value)}
        className="h-8 text-[13px] w-32"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
