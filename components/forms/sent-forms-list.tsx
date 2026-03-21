"use client"

import * as React from "react"
import { Send, Clock, CheckCircle2, Eye, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { useAuthStore } from "@/store/useAuthStore"
import { Badge } from "@/components/ui/badge"

interface Invitation {
  id: string
  form_id: string
  recipient_email: string
  recipient_name: string | null
  recipient_type: string
  status: "pending" | "viewed" | "completed" | "expired"
  sent_at: string
  completed_at: string | null
  forms: { title: string; short_id: string | null } | null
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-50 text-amber-700 border-amber-200" },
  viewed: { label: "Viewed", icon: Eye, className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-green-50 text-green-700 border-green-200" },
  expired: { label: "Expired", icon: AlertCircle, className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
}

export function SentFormsList() {
  const { currentAgencyId } = useAuthStore()
  const [invitations, setInvitations] = React.useState<Invitation[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!currentAgencyId) return
    const fetchInvitations = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/forms/invitations`, {
          headers: { "x-agency-id": currentAgencyId },
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setInvitations(json.data ?? [])
      } catch {
        toast.error("Failed to load sent forms.")
      } finally {
        setLoading(false)
      }
    }
    fetchInvitations()
  }, [currentAgencyId])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-neutral-200 bg-neutral-50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-16">
        <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-base font-semibold mb-2">No sent forms</h3>
        <p className="text-sm text-muted-foreground">
          Forms sent to employees, clients, or caregivers will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {invitations.map((inv) => {
        const cfg = statusConfig[inv.status] ?? statusConfig.pending
        const StatusIcon = cfg.icon
        return (
          <div
            key={inv.id}
            className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-[12px] font-semibold text-neutral-600 shrink-0">
              {(inv.recipient_name ?? inv.recipient_email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-neutral-900 truncate">
                  {inv.recipient_name ?? inv.recipient_email}
                </span>
                {inv.recipient_name && (
                  <span className="text-[11px] text-neutral-400 truncate hidden sm:block">
                    {inv.recipient_email}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-neutral-500 truncate">
                {inv.forms?.title ?? "Unknown form"}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${cfg.className}`}>
                <StatusIcon className="h-2.5 w-2.5" />
                {cfg.label}
              </span>
              <span className="text-[11px] text-neutral-400 hidden sm:block">
                {formatDistanceToNow(new Date(inv.sent_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
