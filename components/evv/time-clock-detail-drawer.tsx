"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  History,
  Check,
  AlertTriangle,
  Send,
  Pencil,
  X,
  Save,
  UserCheck,
  MoreHorizontal,
} from "lucide-react";
import { TimeClockEntry } from "./time-clock-table";
import { EVVMap } from "./evv-map";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface AuditEvent {
  label: string;
  detail: string;
  time: string;
  icon: "create" | "clockin" | "clockout" | "edit" | "resolve";
}

interface TimeClockDetailDrawerProps {
  entry: TimeClockEntry | null;
  open: boolean;
  onClose: () => void;
  onApprove: (entry: TimeClockEntry) => void;
  onRequestCorrection: (entry: TimeClockEntry) => void;
  onOverride: (entry: TimeClockEntry) => void;
  onMarkNoShow: (entry: TimeClockEntry) => void;
  onResolveException?: (entry: TimeClockEntry) => void;
  onEntryUpdated?: (entry: TimeClockEntry) => void;
}

const CORRECTION_REASONS = [
  "Caregiver forgot to clock in/out",
  "Technical / app issue",
  "Phone battery died",
  "No signal at client location",
  "Shift time is correct — system error",
  "Client refused electronic verification",
  "Other",
];

export function TimeClockDetailDrawer({
  entry,
  open,
  onClose,
  onApprove,
  onRequestCorrection,
  onOverride,
  onMarkNoShow,
  onResolveException,
  onEntryUpdated,
}: TimeClockDetailDrawerProps) {
  // ── Clock correction state ────────────────────────────────────────────────
  const [editingClockIn, setEditingClockIn] = React.useState(false);
  const [editingClockOut, setEditingClockOut] = React.useState(false);
  const [editedClockIn, setEditedClockIn] = React.useState("");
  const [editedClockOut, setEditedClockOut] = React.useState("");
  const [clockInReason, setClockInReason] = React.useState("");
  const [clockOutReason, setClockOutReason] = React.useState("");
  const [savedClockIn, setSavedClockIn] = React.useState<string | null>(null);
  const [savedClockOut, setSavedClockOut] = React.useState<string | null>(null);

  // ── Exception resolution state ────────────────────────────────────────────
  const [resolvedExceptions, setResolvedExceptions] = React.useState<
    Record<number, { note: string; resolvedAt: string }>
  >({});
  const [resolutionNotes, setResolutionNotes] = React.useState<Record<number, string>>({});
  const [expandedResolution, setExpandedResolution] = React.useState<number | null>(null);

  // ── Live GPS status (updates immediately after capture without prop change) ──
  const [liveGpsStatus, setLiveGpsStatus] = React.useState<"verified" | "outside" | "missing">("missing");

  // ── Persisted GPS captures loaded from DB ────────────────────────────────
  const [savedClockInGps, setSavedClockInGps] = React.useState<{ lat: number; lng: number; accuracy?: number; capturedAt?: string } | null>(null);
  const [savedClockOutGps, setSavedClockOutGps] = React.useState<{ lat: number; lng: number; accuracy?: number; capturedAt?: string } | null>(null);

  // ── Audit log ─────────────────────────────────────────────────────────────
  const [auditEvents, setAuditEvents] = React.useState<AuditEvent[]>([]);

  // ── Current user (for corrected_by/resolved_by) ───────────────────────────
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();
  const agencyId = useAuthStore((s) => s.currentAgencyId);

  React.useEffect(() => {
    async function getCurrentUser() {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
    }
    getCurrentUser();
  }, []);

  // Reset state when drawer opens for a new entry
  React.useEffect(() => {
    if (open && entry) {
      setEditingClockIn(false);
      setEditingClockOut(false);
      setSavedClockIn(null);
      setSavedClockOut(null);
      setClockInReason("");
      setClockOutReason("");
      setResolvedExceptions({});
      setResolutionNotes({});
      setExpandedResolution(null);
      setLiveGpsStatus(entry.gpsStatus);
      setAuditEvents([]); // will be repopulated by fetchAuditLog effect
      setSavedClockInGps(null);
      setSavedClockOutGps(null);
    }
  }, [open, entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch persisted audit log from DB when drawer opens for a visit
  React.useEffect(() => {
    if (!open || !entry) return;
    async function fetchAuditLog() {
      const { data, error } = await supabase
        .from("evv_audit_log")
        .select("event_type, label, detail, created_at")
        .eq("visit_id", entry!.id)
        .order("created_at", { ascending: true });

      if (error || !data) return;

      const iconMap: Record<string, AuditEvent["icon"]> = {
        create: "create",
        clockin: "clockin",
        clockout: "clockout",
        edit: "edit",
        resolve: "resolve",
        approve: "resolve",
      };

      type AuditRow = { label: string; detail: string | null; created_at: string | null; event_type: string };
      const events: AuditEvent[] = (data as AuditRow[]).map((row) => ({
        label: row.label,
        detail: row.detail ?? "",
        time: row.created_at
          ? new Date(row.created_at).toLocaleString("en-US", {
              month: "short", day: "numeric", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })
          : "",
        icon: iconMap[row.event_type] ?? "create",
      }));

      setAuditEvents(events);
    }
    fetchAuditLog();
  }, [open, entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch persisted GPS captures when drawer opens for a visit
  React.useEffect(() => {
    if (!open || !entry) return;
    async function fetchGpsCaptures() {
      const { data, error } = await supabase
        .from("evv_gps_captures")
        .select("capture_type, latitude, longitude, accuracy_meters, captured_at")
        .eq("visit_id", entry!.id)
        .order("captured_at", { ascending: true });

      if (error || !data) return;

      for (const row of data) {
        const point = {
          lat: row.latitude,
          lng: row.longitude,
          accuracy: row.accuracy_meters ?? undefined,
          capturedAt: row.captured_at
            ? new Date(row.captured_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : undefined,
        };
        if (row.capture_type === "clock_in") {
          setSavedClockInGps(point);
        } else if (row.capture_type === "clock_out") {
          setSavedClockOutGps(point);
        }
      }
    }
    fetchGpsCaptures();
  }, [open, entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) return null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toDatetimeLocal = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatTime = (time?: string | null) => {
    if (!time) return "Not recorded";
    return new Date(time).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes <= 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const effectiveClockIn = savedClockIn ?? entry.clockIn;
  const effectiveClockOut = savedClockOut ?? entry.clockOut;

  const calculateTotalHours = () => {
    if (!effectiveClockIn || !effectiveClockOut) return 0;
    const diffMs = new Date(effectiveClockOut).getTime() - new Date(effectiveClockIn).getTime();
    return Math.max(0, Math.floor(diffMs / 60000) - entry.breaks);
  };

  const totalMinutes = calculateTotalHours();
  const regularHours = Math.min(totalMinutes, 480);
  const overtimeMinutes = Math.max(0, totalMinutes - 480);

  const now = new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // ── Save handlers ─────────────────────────────────────────────────────────
  const handleSaveClockIn = async () => {
    if (!editedClockIn) return;
    const iso = new Date(editedClockIn).toISOString();

    try {
      const { error: correctionError } = await supabase.from("evv_corrections").insert({
        visit_id: entry.id,
        ...(agencyId ? { agency_id: agencyId } : {}),
        field_corrected: "clock_in",
        original_value: effectiveClockIn ?? null,
        new_value: iso,
        reason: clockInReason || "No reason provided",
        corrected_by: currentUserId,
      });

      if (correctionError) throw correctionError;

      const clockInUpdateQuery = supabase
        .from("evv_visits")
        .update({ clock_in: iso })
        .eq("id", entry.id);
      const { error: updateError } = agencyId
        ? await clockInUpdateQuery.eq("agency_id", agencyId)
        : await clockInUpdateQuery;

      if (updateError) throw updateError;

      await supabase.from("evv_audit_log").insert({
        visit_id: entry.id,
        ...(agencyId ? { agency_id: agencyId } : {}),
        event_type: "edit",
        label: "Clock-in manually corrected",
        detail: `Set to ${formatTime(iso)}. Reason: ${clockInReason || "—"}`,
        actor_id: currentUserId,
      });

      // Update local state
      setSavedClockIn(iso);
      setAuditEvents((prev) => [
        ...prev,
        {
          label: "Clock-in manually corrected",
          detail: `Set to ${formatTime(iso)}. Reason: ${clockInReason || "—"}`,
          time: now,
          icon: "edit",
        },
      ]);
      setEditingClockIn(false);
      setClockInReason("");

      toast.success("Clock-in time updated successfully");
    } catch (err: any) {
      const msg = err?.message ?? err?.details ?? JSON.stringify(err);
      console.error("Failed to save clock-in correction:", msg);
      toast.error(`Failed to save correction: ${msg}`);
    }
  };

  const handleSaveClockOut = async () => {
    if (!editedClockOut) return;
    const iso = new Date(editedClockOut).toISOString();

    try {
      const { error: correctionError } = await supabase.from("evv_corrections").insert({
        visit_id: entry.id,
        ...(agencyId ? { agency_id: agencyId } : {}),
        field_corrected: "clock_out",
        original_value: effectiveClockOut ?? null,
        new_value: iso,
        reason: clockOutReason || "No reason provided",
        corrected_by: currentUserId,
      });

      if (correctionError) throw correctionError;

      const clockOutUpdateQuery = supabase
        .from("evv_visits")
        .update({ clock_out: iso })
        .eq("id", entry.id);
      const { error: updateError } = agencyId
        ? await clockOutUpdateQuery.eq("agency_id", agencyId)
        : await clockOutUpdateQuery;

      if (updateError) throw updateError;

      await supabase.from("evv_audit_log").insert({
        visit_id: entry.id,
        ...(agencyId ? { agency_id: agencyId } : {}),
        event_type: "edit",
        label: "Clock-out manually corrected",
        detail: `Set to ${formatTime(iso)}. Reason: ${clockOutReason || "—"}`,
        actor_id: currentUserId,
      });

      // Update local state
      setSavedClockOut(iso);
      setAuditEvents((prev) => [
        ...prev,
        {
          label: "Clock-out manually corrected",
          detail: `Set to ${formatTime(iso)}. Reason: ${clockOutReason || "—"}`,
          time: now,
          icon: "edit",
        },
      ]);
      setEditingClockOut(false);
      setClockOutReason("");

      toast.success("Clock-out time updated successfully");
    } catch (err: any) {
      const msg = err?.message ?? err?.details ?? JSON.stringify(err);
      console.error("Failed to save clock-out correction:", msg);
      toast.error(`Failed to save correction: ${msg}`);
    }
  };

  const handleResolveException = async (idx: number) => {
    const note = resolutionNotes[idx] ?? "";
    const exception = entry.exceptions[idx];
    if (!exception) return;

    try {
      // Update exception to resolved using the ID we already have
      const { error: updateError } = await supabase
        .from("evv_exceptions")
        .update({
          is_resolved: true,
          resolved_by: currentUserId,
          resolved_at: new Date().toISOString(),
          resolution_note: note || null,
        })
        .eq("id", exception.id);

      if (updateError) throw updateError;

      // Check if all exceptions are now resolved
      const updatedExceptions = entry.exceptions.map((ex, i) =>
        i === idx ? { ...ex, is_resolved: true } : ex
      );
      const allNowResolved = updatedExceptions.every(ex => ex.is_resolved);

      // If all exceptions resolved, update the visit's verification_status in database
      if (allNowResolved && entry.verificationStatus === "exception") {
        const { error: visitUpdateError } = await supabase
          .from("evv_visits")
          .update({
            verification_status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        if (visitUpdateError) {
          console.error("Failed to update visit verification_status:", visitUpdateError);
        }
      }

      await supabase.from("evv_audit_log").insert({
        visit_id: entry.id,
        ...(agencyId ? { agency_id: agencyId } : {}),
        event_type: "resolve",
        label: `Exception resolved: ${exception.type}`,
        detail: note || "No resolution note added.",
        actor_id: currentUserId,
      });

      // Update local state
      const newResolvedExceptions = {
        ...resolvedExceptions,
        [idx]: { note, resolvedAt: now },
      };
      setResolvedExceptions(newResolvedExceptions);
      setAuditEvents((prev) => [
        ...prev,
        {
          label: `Exception resolved: ${exception.type}`,
          detail: note || "No resolution note added.",
          time: now,
          icon: "resolve",
        },
      ]);
      setExpandedResolution(null);

      // Propagate to parent so the table row and entry state update immediately
      const updatedEntry: TimeClockEntry = {
        ...entry,
        exceptions: updatedExceptions,
        // Move out of "exception" status once all issues are cleared
        verificationStatus: allNowResolved && entry.verificationStatus === "exception"
          ? "pending"
          : entry.verificationStatus,
      };
      onEntryUpdated?.(updatedEntry);

      toast.success("Exception resolved successfully");
    } catch (err: any) {
      const msg = err?.message ?? err?.details ?? JSON.stringify(err);
      console.error("Failed to resolve exception:", msg);
      toast.error(`Failed to resolve exception: ${msg}`);
    }
  };

  // An exception is considered resolved if either: (a) it was loaded from DB with is_resolved=true,
  // or (b) we resolved it in this session via resolvedExceptions local state.
  const allExceptionsResolved =
    entry.exceptions.length > 0 &&
    entry.exceptions.every((ex, i) => ex.is_resolved || !!resolvedExceptions[i]);

  // ── GPS capture handler ───────────────────────────────────────────────────
  const handleGPSCapture = async (
    captureType: "clock_in" | "clock_out",
    loc: { lat: number; lng: number; accuracy?: number }
  ) => {
    try {
      const capturedAt = new Date().toISOString();

      const res = await fetch("/api/evv/gps-capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(agencyId ? { "x-agency-id": agencyId } : {}),
        },
        body: JSON.stringify({
          visitId: entry.id,
          captureType,
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy ?? null,
          capturedAt,
          actorId: currentUserId,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Unknown server error");
      }

      // Sync GPS badge immediately
      setLiveGpsStatus("verified");

      // Sync timeline tab: update the clock-in or clock-out display
      if (captureType === "clock_in") {
        setSavedClockIn(capturedAt);
      } else {
        setSavedClockOut(capturedAt);
      }

      // Update the local GPS pin state so the map renders immediately
      const point = {
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
        capturedAt: new Date(capturedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
      if (captureType === "clock_in") {
        setSavedClockInGps(point);
      } else {
        setSavedClockOutGps(point);
      }

      // Notify parent so the table row updates
      const updatedEntry: TimeClockEntry = {
        ...entry,
        gpsStatus: "verified",
        clockIn: captureType === "clock_in" ? capturedAt : entry.clockIn,
        clockOut: captureType === "clock_out" ? capturedAt : entry.clockOut,
      };
      onEntryUpdated?.(updatedEntry);

      toast.success(`Clocked ${captureType === "clock_in" ? "in" : "out"} with GPS`);
    } catch (err: any) {
      const msg = err?.message ?? JSON.stringify(err);
      console.error("Failed to save GPS location:", msg);
      toast.error(`Failed to save GPS location: ${msg}`);
    }
  };

  // ── Audit icon helper ─────────────────────────────────────────────────────
  const AuditIcon = ({ type }: { type: AuditEvent["icon"] }) => {
    const cls = "h-4 w-4 mt-0.5";
    switch (type) {
      case "clockin":  return <CheckCircle2 className={cn(cls, "text-green-600")} />;
      case "clockout": return <XCircle className={cn(cls, "text-red-600")} />;
      case "edit":     return <Pencil className={cn(cls, "text-blue-600")} />;
      case "resolve":  return <UserCheck className={cn(cls, "text-purple-600")} />;
      default:         return <History className={cn(cls, "text-muted-foreground")} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[88vh] flex flex-col overflow-hidden p-0 gap-0">
        {/* Fixed header — never scrolls */}
        <div className="flex-none px-6 pt-6 pb-4 border-b border-neutral-100">
        <DialogHeader className="px-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-snug">
                {entry.caregiver.name} → {entry.client.name}
              </DialogTitle>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <p className="text-sm text-muted-foreground">Visit ID: {entry.id}</p>
                <span className="text-muted-foreground text-sm">•</span>
                <Badge variant="outline" className="h-auto text-[10px] px-2 py-0.5 bg-neutral-50 text-neutral-700 border-neutral-200 rounded-full">
                  {entry.serviceType}
                </Badge>
                <Badge variant="outline" className="h-auto text-[10px] px-2 py-0.5 bg-neutral-50 text-neutral-700 border-neutral-200 rounded-full">
                  {entry.fundingSource}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 items-center flex-none">
              {entry.verificationStatus === "verified" && (
                <Badge variant="outline" className="h-auto px-2.5 py-1 bg-green-50 text-green-900 border-green-200 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
              {entry.verificationStatus === "pending" && (
                <Badge variant="outline" className="h-auto px-2.5 py-1 bg-amber-50 text-amber-900 border-amber-200 text-xs">
                  <Clock className="h-3 w-3 mr-1" /> Pending
                </Badge>
              )}
              {entry.verificationStatus === "exception" && (
                <Badge variant="outline" className="h-auto px-2.5 py-1 bg-red-50 text-red-900 border-red-200 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Exception
                </Badge>
              )}
              {allExceptionsResolved && (
                <Badge variant="outline" className="h-auto px-2.5 py-1 bg-purple-50 text-purple-900 border-purple-200 text-xs">
                  <UserCheck className="h-3 w-3 mr-1" /> All Resolved
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>
        </div>

        {/* Scrollable tab area — fills remaining height */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-4">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="gps">GPS</TabsTrigger>
            <TabsTrigger value="notes">Care Notes</TabsTrigger>
            <TabsTrigger value="exceptions" className="relative">
              Exceptions
              {entry.exceptions.length > 0 && (
                <span className={cn(
                  "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  allExceptionsResolved
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}>
                  {entry.exceptions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* ── TIMELINE TAB ────────────────────────────────────────────── */}
          <TabsContent value="timeline" className="space-y-4 mt-4">
            <div className="space-y-4">

              {/* Scheduled times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Scheduled Start</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatTime(entry.shiftTime.start)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Scheduled End</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatTime(entry.shiftTime.end)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Clock-In ── */}
              <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {effectiveClockIn ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground block">Clock-In</Label>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          !effectiveClockIn && "text-red-600"
                        )}>
                          {effectiveClockIn ? formatTime(effectiveClockIn) : "Missing — not recorded"}
                        </span>
                        {savedClockIn && (
                          <Badge variant="outline" className="h-auto text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 rounded-full">
                            Manually Corrected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {!editingClockIn && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setEditingClockIn(true);
                        setEditedClockIn(toDatetimeLocal(effectiveClockIn));
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      {effectiveClockIn ? "Edit" : "Add Time"}
                    </Button>
                  )}
                </div>

                {editingClockIn && (
                  <div className="space-y-3 pt-1 border-t border-neutral-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Corrected Clock-In Time</Label>
                        <Input
                          type="datetime-local"
                          value={editedClockIn}
                          onChange={(e) => setEditedClockIn(e.target.value)}
                          className="text-sm h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Reason for Correction</Label>
                        <Select value={clockInReason} onValueChange={setClockInReason}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CORRECTION_REASONS.map((r) => (
                              <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-primary-500 hover:bg-primary-600 text-white"
                        onClick={handleSaveClockIn}
                        disabled={!editedClockIn}
                      >
                        <Save className="h-3 w-3" /> Save Correction
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setEditingClockIn(false)}
                      >
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Clock-Out ── */}
              <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {effectiveClockOut ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground block">Clock-Out</Label>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          !effectiveClockOut && "text-red-600"
                        )}>
                          {effectiveClockOut ? formatTime(effectiveClockOut) : "Missing — not recorded"}
                        </span>
                        {savedClockOut && (
                          <Badge variant="outline" className="h-auto text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 rounded-full">
                            Manually Corrected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {!editingClockOut && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setEditingClockOut(true);
                        setEditedClockOut(toDatetimeLocal(effectiveClockOut));
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      {effectiveClockOut ? "Edit" : "Add Time"}
                    </Button>
                  )}
                </div>

                {editingClockOut && (
                  <div className="space-y-3 pt-1 border-t border-neutral-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Corrected Clock-Out Time</Label>
                        <Input
                          type="datetime-local"
                          value={editedClockOut}
                          onChange={(e) => setEditedClockOut(e.target.value)}
                          className="text-sm h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Reason for Correction</Label>
                        <Select value={clockOutReason} onValueChange={setClockOutReason}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CORRECTION_REASONS.map((r) => (
                              <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-primary-500 hover:bg-primary-600 text-white"
                        onClick={handleSaveClockOut}
                        disabled={!editedClockOut}
                      >
                        <Save className="h-3 w-3" /> Save Correction
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setEditingClockOut(false)}
                      >
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Breaks */}
              {entry.breaks > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Breaks</Label>
                  <span className="text-sm font-medium">{formatDuration(entry.breaks)}</span>
                </div>
              )}

              {/* Totals */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Total Hours</Label>
                  <p className="text-lg font-semibold mt-1">{formatDuration(totalMinutes)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Regular Hours</Label>
                  <p className="text-lg font-semibold mt-1">{formatDuration(regularHours)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Overtime</Label>
                  <p className={cn("text-lg font-semibold mt-1", overtimeMinutes > 0 && "text-orange-600")}>
                    {formatDuration(overtimeMinutes)}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── GPS TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="gps" className="space-y-4 mt-4">
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-sm font-medium">Location Verification</Label>
                </div>
                {liveGpsStatus === "verified" ? (
                  <Badge variant="outline" className="h-auto px-2.5 py-1 bg-green-50 text-green-900 border-green-200 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                ) : liveGpsStatus === "outside" ? (
                  <Badge variant="outline" className="h-auto px-2.5 py-1 bg-amber-50 text-amber-900 border-amber-200 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Outside Geofence
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-auto px-2.5 py-1 bg-red-50 text-red-900 border-red-200 text-xs">
                    <XCircle className="h-3 w-3 mr-1" /> Missing
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {liveGpsStatus === "verified"
                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                    : <XCircle className="h-4 w-4 text-red-600" />}
                  <span className="text-sm">
                    Clock-in within allowed zone: {liveGpsStatus === "verified" ? "Yes" : "No"}
                  </span>
                </div>
                {entry.gpsDistance !== undefined && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Distance from client location: {entry.gpsDistance}m
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Allowed Radius</Label>
                    <p className="text-sm font-medium mt-1">100m</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">GPS Accuracy</Label>
                    <p className="text-sm font-medium mt-1">±5m</p>
                  </div>
                </div>
              </div>

              <EVVMap
                showClockInButton={true}
                clockInAlreadyRecorded={!!(effectiveClockIn)}
                initialClockInLoc={savedClockInGps}
                initialClockOutLoc={savedClockOutGps}
                onClockIn={(loc) => handleGPSCapture("clock_in", loc)}
                onClockOut={(loc) => handleGPSCapture("clock_out", loc)}
              />
            </div>
          </TabsContent>

          {/* ── CARE NOTES TAB ──────────────────────────────────────────── */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="caregiver-note">Caregiver Care Notes</Label>
                  {entry.careNotesCompleted ? (
                    <Badge variant="outline" className="h-auto px-2 py-0.5 bg-green-50 text-green-900 border-green-200 text-[10px]">
                      <Check className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="h-auto px-2 py-0.5 bg-amber-50 text-amber-900 border-amber-200 text-[10px]">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Missing
                    </Badge>
                  )}
                </div>
                <Textarea
                  id="caregiver-note"
                  placeholder="No caregiver notes recorded..."
                  className="min-h-[100px]"
                  defaultValue={
                    entry.careNotesCompleted
                      ? "Client was in good spirits. Assisted with personal care, meal preparation, and light housekeeping. All tasks completed as scheduled."
                      : ""
                  }
                  readOnly
                />
              </div>
            </div>
          </TabsContent>

          {/* ── EXCEPTIONS TAB ──────────────────────────────────────────── */}
          <TabsContent value="exceptions" className="space-y-4 mt-4">
            {entry.exceptions.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/30">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-3" />
                <p className="text-sm font-medium">No Exceptions</p>
                <p className="text-xs text-muted-foreground mt-1">This visit has no exceptions or issues</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entry.exceptions.map((exception, idx) => {
                  // Resolved if it came back from DB as resolved, OR was resolved this session
                  const sessionResolved = resolvedExceptions[idx];
                  const resolved: { note: string; resolvedAt: string } | undefined =
                    exception.is_resolved
                      ? { note: "", resolvedAt: "Previously resolved" }
                      : sessionResolved;
                  const isExpanded = expandedResolution === idx;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "border rounded-lg overflow-hidden transition-all",
                        resolved
                          ? "border-green-200 bg-green-50/30"
                          : exception.severity === "critical" && "border-red-200 bg-red-50/30",
                        !resolved && exception.severity === "error" && "border-amber-200 bg-amber-50/30",
                        !resolved && exception.severity === "warning" && "border-yellow-200 bg-yellow-50/30"
                      )}
                    >
                      {/* Exception header */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {resolved ? (
                            <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-600 shrink-0" />
                          ) : (
                            <AlertTriangle
                              className={cn(
                                "h-5 w-5 mt-0.5 shrink-0",
                                exception.severity === "critical" && "text-red-600",
                                exception.severity === "error" && "text-amber-600",
                                exception.severity === "warning" && "text-yellow-600"
                              )}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-sm font-medium">{exception.type}</p>
                              {resolved ? (
                                <Badge variant="outline" className="h-auto text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border-green-200 rounded-full">
                                  RESOLVED
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-auto text-[10px] px-2 py-0.5 rounded-full",
                                    exception.severity === "critical" && "bg-red-50 text-red-700 border-red-200",
                                    exception.severity === "error" && "bg-amber-50 text-amber-700 border-amber-200",
                                    exception.severity === "warning" && "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  )}
                                >
                                  {exception.severity.toUpperCase()}
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                              {exception.type.includes("Late") && "Clock-in was 15 minutes after scheduled start time."}
                              {exception.type.includes("No-Show") && "Caregiver did not clock in for scheduled shift."}
                              {exception.type.includes("Geofence") && `Clock-in location was ${entry.gpsDistance}m from client address, exceeding the 100m radius.`}
                              {exception.type.includes("Signature") && "Client signature was not captured at visit completion."}
                              {exception.type.includes("Missing Clock") && "Clock-in or clock-out time was not recorded by caregiver."}
                              {exception.type.includes("Note") && "Care notes were not completed after the visit."}
                            </p>

                            {resolved && (
                              <div className="mt-2 p-2 rounded bg-green-100/60 text-xs text-green-800 space-y-0.5">
                                <p className="font-medium">
                                  Resolved by Admin
                                  {resolved.resolvedAt !== "Previously resolved" && ` • ${resolved.resolvedAt}`}
                                </p>
                                {resolved.note && <p className="text-green-700">{resolved.note}</p>}
                              </div>
                            )}
                          </div>

                          {!resolved && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 shrink-0 border-neutral-300"
                              onClick={() => setExpandedResolution(isExpanded ? null : idx)}
                            >
                              <UserCheck className="h-3 w-3" />
                              {isExpanded ? "Cancel" : "Resolve"}
                            </Button>
                          )}
                        </div>

                        {/* Inline resolution form */}
                        {!resolved && isExpanded && (
                          <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Resolution Note <span className="text-neutral-400">(optional)</span>
                            </Label>
                            <Textarea
                              placeholder="Describe how this exception was resolved..."
                              className="min-h-[70px] text-xs"
                              value={resolutionNotes[idx] ?? ""}
                              onChange={(e) =>
                                setResolutionNotes((prev) => ({ ...prev, [idx]: e.target.value }))
                              }
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleResolveException(idx)}
                            >
                              <Check className="h-3 w-3" /> Mark as Resolved
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── AUDIT LOG TAB ───────────────────────────────────────────── */}
          <TabsContent value="audit" className="space-y-4 mt-4">
            <div className="space-y-3">
              {/* Static events from the entry */}
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <History className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Entry created</p>
                  <p className="text-xs text-muted-foreground">
                    System • {formatTime(entry.clockIn || entry.shiftTime.start)}
                  </p>
                </div>
              </div>

              {entry.clockIn && (
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Clock-in recorded</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.caregiver.name} • {formatTime(entry.clockIn)}
                    </p>
                  </div>
                </div>
              )}

              {entry.clockOut && (
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Clock-out recorded</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.caregiver.name} • {formatTime(entry.clockOut)}
                    </p>
                  </div>
                </div>
              )}

              {/* Dynamic events from manual edits/resolutions */}
              {auditEvents.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                  <AuditIcon type={ev.icon} />
                  <div>
                    <p className="text-sm font-medium">{ev.label}</p>
                    <p className="text-xs text-muted-foreground">{ev.detail}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Admin • {ev.time}</p>
                  </div>
                </div>
              ))}

              {auditEvents.length === 0 && !entry.clockIn && !entry.clockOut && (
                <p className="text-xs text-muted-foreground text-center py-4">No activity recorded yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </div>{/* end scrollable area */}

        <DialogFooter className="flex-none flex items-center justify-between gap-2 border-t bg-background px-6 py-4">
          {/* Left: Close */}
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>

          {/* Right: secondary dropdown + primary CTA */}
          <div className="flex items-center gap-2">
            {/* More actions dropdown — hidden when already verified */}
            {entry.verificationStatus !== "verified" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {entry.verificationStatus === "pending" && (
                    <>
                      <DropdownMenuItem onClick={() => onRequestCorrection(entry)}>
                        <Send className="mr-2 h-4 w-4" />
                        Request Correction
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOverride(entry)}>
                        Override
                      </DropdownMenuItem>
                    </>
                  )}
                  {entry.arrivalStatus !== "no-show" && (
                    <>
                      {entry.verificationStatus === "pending" && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => onMarkNoShow(entry)}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Mark No-Show
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Primary CTA */}
            {(savedClockIn || savedClockOut) ? (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="mr-2 h-4 w-4" />
                Submit Corrections
              </Button>
            ) : entry.verificationStatus === "pending" ? (
              <Button size="sm" onClick={() => onApprove(entry)} className="bg-primary-500 hover:bg-primary-600 text-white">
                <Check className="mr-2 h-4 w-4" />
                Approve & Verify
              </Button>
            ) : entry.verificationStatus === "verified" ? (
              <Button size="sm" disabled className="bg-neutral-100 text-neutral-500 cursor-default">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Verified
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
