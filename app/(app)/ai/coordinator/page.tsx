"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  Loader2,
  MessageSquare,
  Search,
  Settings,
  User,
  X,
  Zap,
  Database,
  Activity,
  ClipboardList,
  MapPin,
  AlertCircle,
  Phone,
  MessageCircle,
  Clock,
  FileText,
} from "lucide-react";
import { CoordinatorSetup } from "@/components/ai/coordinator-setup";
import { useCoordinatorStore } from "@/store/useCoordinatorStore";
import { useEmployeesStore } from "@/store/useEmployeesStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useClientsStore } from "@/store/useClientsStore";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { useSupabaseRealtimeMulti } from "@/lib/hooks/useSupabaseRealtime";
import { useAuthStore } from "@/store/useAuthStore";

// ─────────────────────────────────────────
// Types & Mock Data for Coverage Log
// ─────────────────────────────────────────

type CoverageStatus = "open" | "in_progress" | "filled" | "cancelled";
type CoverageUrgency = "urgent" | "high" | "normal";

interface CoverageRequest {
  id: string;
  caregiver: string;
  client: string;
  shift: string;
  reason: string;
  urgency: CoverageUrgency;
  status: CoverageStatus;
  assignedTo: string | null;
  time: string;
}

// COVERAGE_REQUESTS is now fetched from the API (coverage_requests table)

// ─────────────────────────────────────────
// Badge helpers — matching receptionist
// ─────────────────────────────────────────

const neutralBadge = "bg-neutral-100 text-neutral-700 border border-neutral-200 text-[11px] font-medium capitalize";
const urgentBadge = "bg-neutral-900 text-white border border-neutral-900 text-[11px] font-medium capitalize";
const highBadge = "bg-neutral-200 text-neutral-800 border border-neutral-300 text-[11px] font-medium capitalize";

function urgencyClass(u: CoverageUrgency) {
  if (u === "urgent") return urgentBadge;
  if (u === "high") return highBadge;
  return neutralBadge;
}

function statusClass(s: CoverageStatus) {
  if (s === "filled") return "bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-medium capitalize";
  if (s === "in_progress") return "bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-medium capitalize";
  if (s === "cancelled") return "bg-neutral-100 text-neutral-500 border border-neutral-200 text-[11px] font-medium capitalize";
  return "bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-medium capitalize";
}

// ─────────────────────────────────────────
// Coverage Log Table — matching receptionist design
// ─────────────────────────────────────────

interface CoverageLogTableProps {
  records: CoverageRequest[];
}

function CoverageLogTable({ records }: CoverageLogTableProps) {
  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04, duration: 0.25, ease: "easeOut" as const },
    }),
  } as const;

  const thClass = "py-2 px-3 text-left";
  const thLabel = "text-[10px] font-medium text-neutral-500 uppercase tracking-wide";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-neutral-200">
            {["Caregiver", "Client", "Shift", "Reason", "Urgency", "Status", "Assigned To", "Time"].map((h) => (
              <th key={h} className={thClass}>
                <span className={thLabel}>{h}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {records.length > 0 ? (
            records.map((record, index) => (
              <motion.tr
                key={record.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={rowVariants}
                className="hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                {/* Caregiver */}
                <td className="py-2.5 px-3">
                  <div className="text-[13px] font-medium text-neutral-900 whitespace-nowrap">{record.caregiver}</div>
                </td>

                {/* Client */}
                <td className="py-2.5 px-3">
                  <div className="text-[12px] text-neutral-900 whitespace-nowrap">{record.client}</div>
                </td>

                {/* Shift */}
                <td className="py-2.5 px-3">
                  <div className="text-[12px] text-neutral-900 whitespace-nowrap">{record.shift}</div>
                </td>

                {/* Reason */}
                <td className="py-2.5 px-3">
                  <Badge className={neutralBadge}>{record.reason}</Badge>
                </td>

                {/* Urgency */}
                <td className="py-2.5 px-3">
                  <Badge className={urgencyClass(record.urgency)}>{record.urgency}</Badge>
                </td>

                {/* Status */}
                <td className="py-2.5 px-3">
                  <Badge className={statusClass(record.status)}>{record.status.replace("_", " ")}</Badge>
                </td>

                {/* Assigned To */}
                <td className="py-2.5 px-3">
                  <div className="text-[12px] text-neutral-900 whitespace-nowrap">
                    {record.assignedTo || "---"}
                  </div>
                </td>

                {/* Time */}
                <td className="py-2.5 px-3">
                  <div className="text-[12px] text-neutral-500 whitespace-nowrap">{record.time}</div>
                </td>
              </motion.tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="py-12 text-center text-[13px] text-neutral-400">
                No coverage requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────
// Types & Table for Coordinator Requests (Tab: Requests)
// ─────────────────────────────────────────

type RequestStatus = "pending" | "approved" | "rejected";

interface CoordinatorRequestRow {
  id: string;
  requestType: string;
  caregiverName: string | null;
  shiftDate: string | null;
  shiftTime: string | null;
  reason: string | null;
  status: RequestStatus;
  createdAt: string;
}

function requestStatusClass(s: RequestStatus) {
  if (s === "approved") return "bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-medium capitalize";
  if (s === "rejected") return "bg-neutral-100 text-neutral-500 border border-neutral-200 text-[11px] font-medium capitalize";
  return "bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-medium capitalize";
}

interface RequestsTableProps {
  records: CoordinatorRequestRow[];
  onAction: (id: string, action: "approve" | "reject") => void;
}

function RequestsTable({ records, onAction }: RequestsTableProps) {
  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04, duration: 0.25, ease: "easeOut" as const },
    }),
  } as const;

  const thClass = "py-2 px-3 text-left";
  const thLabel = "text-[10px] font-medium text-neutral-500 uppercase tracking-wide";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-neutral-200">
            {["Type", "Caregiver", "Shift", "Reason", "Status", "Requested", "Actions"].map((h) => (
              <th key={h} className={thClass}>
                <span className={thLabel}>{h}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {records.length > 0 ? (
            records.map((record, index) => (
              <motion.tr
                key={record.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={rowVariants}
                className="hover:bg-neutral-50 transition-colors"
              >
                <td className="py-2.5 px-3">
                  <Badge className={neutralBadge}>{record.requestType.replace("_", " ")}</Badge>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-[13px] font-medium text-neutral-900 whitespace-nowrap">
                    {record.caregiverName || "—"}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-[12px] text-neutral-900 whitespace-nowrap">
                    {record.shiftDate || "—"}
                    {record.shiftTime ? ` ${record.shiftTime}` : ""}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-[12px] text-neutral-600 whitespace-nowrap">
                    {record.reason || "—"}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <Badge className={requestStatusClass(record.status)}>{record.status}</Badge>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-[12px] text-neutral-500 whitespace-nowrap">
                    {new Date(record.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  {record.status === "pending" ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onAction(record.id, "approve")}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="Approve"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onAction(record.id, "reject")}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        title="Reject"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-[12px] text-neutral-400">—</div>
                  )}
                </td>
              </motion.tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="py-12 text-center text-[13px] text-neutral-400">
                No requests yet. Requests will appear here when caregivers call the coordinator.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────
// Types & Data for Coverage Coordinator (Tab 3)
// ─────────────────────────────────────────

interface OutreachCaregiver {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  initials: string;
  avatarColor: string;
  matchScore?: number;
  distance?: string;
  availability?: "available" | "limited" | "unavailable";
  lastWorkedWith?: string;
}

interface ResponseData {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  initials: string;
  avatarColor: string;
  status: "accepted" | "declined" | "no-answer";
  matchScore?: number;
  distance?: string;
  responseTime?: string;
  availability?: string;
  contactMethod?: "call" | "text" | "both";
  responseDetails?: {
    timestamp: string;
    duration?: string;
    message?: string;
    notes?: string;
  };
}

interface VacantShift {
  id: string;
  clientName: string;
  date: string;
  time: string;
  fullDateTime: string;
  careType?: string;
  urgency?: "urgent" | "high" | "normal";
  requiredRole?: string;
  payRate?: string;
  clientAddress?: string;
  specialInstructions?: string;
}

// OUTREACH_CAREGIVERS is now fetched from GET /api/coordinator/available-caregivers

// MOCK_RESPONSES is now fetched from GET /api/coordinator/outreach-responses

// VACANT_SHIFTS is now fetched from GET /api/coordinator/vacant-shifts

// Helper functions for the new coordinator tab
function getResponseStatusBadge(status: ResponseData["status"]) {
  if (status === "accepted")
    return (
      <Badge variant="positive" className="text-[10px] h-5 px-2">
        <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
        Accepted
      </Badge>
    );
  if (status === "declined")
    return (
      <Badge variant="negative" className="text-[10px] h-5 px-2">
        Declined
      </Badge>
    );
  return (
    <Badge variant="warning" className="text-[10px] h-5 px-2">
      No Answer
    </Badge>
  );
}


// ─────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────

export default function CoordinatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupComplete = useCoordinatorStore((state) => state.setupComplete);
  const [showSetup, setShowSetup] = useState(false);

  // Tab 1 state (Coverage Log)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  // Requests tab state
  const [coordRequests, setCoordRequests] = useState<CoordinatorRequestRow[]>([]);
  const [reqStatusFilter, setReqStatusFilter] = useState("all");
  const [reqLoading, setReqLoading] = useState(false);

  // Tab 1 state — Coverage Log (real data)
  const [coverageLogData, setCoverageLogData] = useState<CoverageRequest[]>([]);
  const [coverageLogLoading, setCoverageLogLoading] = useState(false);

  // Tab 3 state (Coverage Coordinator)
  const [outreachSearch, setOutreachSearch] = useState("");
  const [caregiverToggles, setCaregiverToggles] = useState<Record<string, { call: boolean; text: boolean }>>({});
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [assignedShifts, setAssignedShifts] = useState<Record<string, string>>({});
  const [autoSchedulerEnabled, setAutoSchedulerEnabled] = useState(false);
  const [outreachSent, setOutreachSent] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);

  // Tab 3 real data state
  const [vacantShifts, setVacantShifts] = useState<VacantShift[]>([]);
  const [vacantShiftsLoading, setVacantShiftsLoading] = useState(false);
  const [outreachCaregivers, setOutreachCaregivers] = useState<OutreachCaregiver[]>([]);
  const [outreachCaregiversLoading, setOutreachCaregiversLoading] = useState(false);
  const [outreachResponses, setOutreachResponses] = useState<ResponseData[]>([]);
  const [outreachSending, setOutreachSending] = useState(false);

  // Store hooks
  const { employees, hydrate: hydrateEmployees } = useEmployeesStore();
  const { events: scheduleEvents, createEvent, updateEvent, clearCache, hydrate: hydrateSchedule } = useScheduleStore();
  const { clients, hydrate: hydrateClients } = useClientsStore();
  const agencyId = useAuthStore((s) => s.currentAgencyId);

  // Check if setup parameter is in URL
  useEffect(() => {
    if (searchParams.get('setup') === 'true') {
      setShowSetup(true);
    }
  }, [searchParams]);

  // Fetch coordinator requests (extracted for re-use by realtime)
  const fetchCoordRequests = useCallback(async () => {
    if (!agencyId) return; // Wait for auth to be ready
    setReqLoading(true);
    try {
      const res = await apiFetch("/api/coordinator-requests");
      if (res.ok) {
        const { data } = await res.json();
        setCoordRequests(data);
      } else {
        console.error("[coordinator] Failed to fetch requests:", res.status, await res.text().catch(() => ""));
      }
    } finally {
      setReqLoading(false);
    }
  }, [agencyId]);

  // Fetch coverage log (Tab 1) — maps coverage_requests to CoverageRequest shape
  const fetchCoverageLog = useCallback(async () => {
    if (!agencyId) return;
    setCoverageLogLoading(true);
    try {
      const res = await apiFetch("/api/coordinator-requests?limit=100");
      if (res.ok) {
        const { data } = await res.json();
        const mapped: CoverageRequest[] = (data ?? []).map((r: any) => {
          // Derive urgency from shift date proximity
          let urgency: CoverageUrgency = "normal";
          if (r.shiftDate) {
            const shiftDate = new Date(r.shiftDate);
            const hoursUntil = (shiftDate.getTime() - Date.now()) / (1000 * 60 * 60);
            if (hoursUntil < 24) urgency = "urgent";
            else if (hoursUntil < 72) urgency = "high";
          }
          // Map request status to coverage status
          let status: CoverageStatus = "open";
          if (r.status === "approved") status = "filled";
          else if (r.status === "rejected") status = "cancelled";
          else if (r.status === "pending") status = "in_progress";

          return {
            id: r.id,
            caregiver: r.caregiverName ?? "Unknown",
            client: r.clientName ?? "—",
            shift: r.shiftDate ? `${r.shiftDate}${r.shiftTime ? ` ${r.shiftTime}` : ""}` : "—",
            reason: r.reason ?? r.requestType?.replace("_", " ") ?? "—",
            urgency,
            status,
            assignedTo: null,
            time: new Date(r.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
          };
        });
        setCoverageLogData(mapped);
      }
    } finally {
      setCoverageLogLoading(false);
    }
  }, [agencyId]);

  // Fetch vacant shifts (Tab 3)
  const fetchVacantShifts = useCallback(async () => {
    if (!agencyId) return;
    setVacantShiftsLoading(true);
    try {
      const res = await apiFetch("/api/coordinator/vacant-shifts");
      if (res.ok) {
        const { data } = await res.json();
        setVacantShifts(data ?? []);
      }
    } finally {
      setVacantShiftsLoading(false);
    }
  }, [agencyId]);

  // Fetch available caregivers for a shift
  const fetchAvailableCaregivers = useCallback(async (eventId: string) => {
    if (!agencyId) return;
    setOutreachCaregiversLoading(true);
    try {
      const res = await apiFetch(`/api/coordinator/available-caregivers?eventId=${eventId}`);
      if (res.ok) {
        const { data } = await res.json();
        setOutreachCaregivers(data ?? []);
      }
    } finally {
      setOutreachCaregiversLoading(false);
    }
  }, [agencyId]);

  // Fetch outreach responses for a shift
  const fetchOutreachResponses = useCallback(async (eventId: string) => {
    try {
      const res = await apiFetch(`/api/coordinator/outreach-responses?eventId=${eventId}`);
      if (res.ok) {
        const { data } = await res.json();
        setOutreachResponses(data ?? []);
      }
    } catch {
      // Silently fail — responses will update via realtime
    }
  }, []);

  // Hydrate stores on mount + fetch coordinator requests
  useEffect(() => {
    hydrateEmployees();
    hydrateClients();
    hydrateSchedule({ startDate: "2026-03-07", endDate: "2026-03-07" });
  }, [hydrateEmployees, hydrateClients, hydrateSchedule]);

  // Fetch requests + coverage log + vacant shifts once agency ID is available
  useEffect(() => {
    fetchCoordRequests();
    fetchCoverageLog();
    fetchVacantShifts();
  }, [fetchCoordRequests, fetchCoverageLog, fetchVacantShifts]);

  // ── Real-time: refresh Requests tab when coverage_requests changes ──
  const handleRequestsChange = useCallback(() => {
    fetchCoordRequests();
    fetchCoverageLog();
  }, [fetchCoordRequests, fetchCoverageLog]);

  const handleScheduleChange = useCallback(() => {
    clearCache();
    hydrateSchedule({ startDate: "2026-03-07", endDate: "2026-03-07" });
  }, [clearCache, hydrateSchedule]);

  useSupabaseRealtimeMulti("coverage_requests", {
    onInsert: useCallback(() => {
      handleRequestsChange();
      toast.info("New coordinator request received");
    }, [handleRequestsChange]),
    onUpdate: useCallback(() => {
      handleRequestsChange();
    }, [handleRequestsChange]),
    onDelete: useCallback(() => {
      handleRequestsChange();
    }, [handleRequestsChange]),
  });

  useSupabaseRealtimeMulti("schedule_events", {
    onInsert: useCallback(() => {
      handleScheduleChange();
    }, [handleScheduleChange]),
    onUpdate: useCallback(() => {
      handleScheduleChange();
    }, [handleScheduleChange]),
  });

  // ── Real-time: refresh outreach responses when outreach_attempts changes ──
  useSupabaseRealtimeMulti("outreach_attempts", {
    onInsert: useCallback(() => {
      if (selectedShift) fetchOutreachResponses(selectedShift);
    }, [selectedShift, fetchOutreachResponses]),
    onUpdate: useCallback(() => {
      if (selectedShift) fetchOutreachResponses(selectedShift);
    }, [selectedShift, fetchOutreachResponses]),
  });

  async function handleRequestAction(id: string, action: "approve" | "reject") {
    const res = await apiFetch(`/api/coordinator-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const json = await res.json();
      const warningMsg = json?.data?.warning;
      if (warningMsg) {
        toast.warning(warningMsg);
      } else {
        toast.success(`Request ${action === "approve" ? "approved" : "rejected"}`);
      }
      setCoordRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: (action === "approve" ? "approved" : "rejected") as RequestStatus }
            : r
        )
      );
    } else {
      toast.error(`Failed to ${action} request`);
    }
  }

  // Helper functions for new coordinator tab
  const handleToggleChange = (caregiverId: string, type: "call" | "text", value: boolean) => {
    setCaregiverToggles(prev => ({
      ...prev,
      [caregiverId]: {
        ...prev[caregiverId],
        [type]: value
      }
    }));
  };

  const handleApplyAll = (type: "call" | "text", value: boolean) => {
    const newToggles: Record<string, { call: boolean; text: boolean }> = {};
    outreachCaregivers.forEach(caregiver => {
      newToggles[caregiver.id] = {
        ...caregiverToggles[caregiver.id],
        [type]: value
      };
    });
    setCaregiverToggles(prev => ({ ...prev, ...newToggles }));
  };

  const handleSendOutreach = async () => {
    if (!selectedShift) return;

    const selected = outreachCaregivers.filter(caregiver => {
      const toggles = caregiverToggles[caregiver.id];
      return toggles && (toggles.call || toggles.text);
    });

    if (selected.length === 0) {
      toast.error("Please select at least one caregiver and communication method");
      return;
    }

    setOutreachSending(true);
    try {
      const res = await apiFetch("/api/coordinator/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedShift,
          caregivers: selected.map(cg => ({
            id: cg.id,
            call: caregiverToggles[cg.id]?.call ?? false,
            text: caregiverToggles[cg.id]?.text ?? false,
          })),
        }),
      });
      if (res.ok) {
        setOutreachSent(true);
        toast.success(`Outreach sent to ${selected.length} caregiver${selected.length === 1 ? '' : 's'}`);
        // Fetch responses after sending
        fetchOutreachResponses(selectedShift);
      } else {
        toast.error("Failed to send outreach");
      }
    } catch {
      toast.error("Failed to send outreach");
    } finally {
      setOutreachSending(false);
    }
  };

  const handleAutoSelectTopMatches = () => {
    const topMatches = outreachCaregivers
      .filter(cg => cg.availability === "available" && (cg.matchScore || 0) >= 60)
      .slice(0, 5);

    const newToggles: Record<string, { call: boolean; text: boolean }> = {};
    topMatches.forEach(caregiver => {
      newToggles[caregiver.id] = { call: true, text: true };
    });

    setCaregiverToggles(prev => ({ ...prev, ...newToggles }));
    toast.success(`Auto-selected ${topMatches.length} top matches`);
  };

  const handleSelectShift = (shiftId: string) => {
    setSelectedShift(shiftId);
    setOutreachSent(false);
    setCaregiverToggles({});
    setOutreachResponses([]);
    // Fetch caregivers and existing responses for this shift
    fetchAvailableCaregivers(shiftId);
    fetchOutreachResponses(shiftId);
  };

  const handleAssignToShift = async (caregiverId: string) => {
    if (!selectedShift) return;

    const caregiver = outreachResponses.find(r => r.id === caregiverId);
    const shift = vacantShifts.find(s => s.id === selectedShift);

    if (!shift) return;

    try {
      const res = await apiFetch("/api/coordinator/assign-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedShift, caregiverId }),
      });
      if (res.ok) {
        setAssignedShifts(prev => ({ ...prev, [selectedShift]: caregiverId }));
        setSelectedShift(null);
        setOutreachSent(false);
        const name = caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : "Caregiver";
        toast.success(`${name} assigned to ${shift.clientName} shift`);
        // Refresh vacant shifts
        fetchVacantShifts();
      } else {
        toast.error("Failed to assign shift");
      }
    } catch {
      toast.error("Failed to assign shift");
    }
  };

  // Computed values
  const filteredCaregivers = outreachCaregivers.filter(caregiver =>
    outreachSearch === "" ||
    `${caregiver.firstName} ${caregiver.lastName}`.toLowerCase().includes(outreachSearch.toLowerCase())
  );

  const availableShifts = vacantShifts.filter(shift => !assignedShifts[shift.id]);
  const selectedShiftData = selectedShift ? vacantShifts.find(s => s.id === selectedShift) : null;





  // Show setup wizard if not complete OR if explicitly requested via Settings
  if (!setupComplete || showSetup) {
    return (
      <CoordinatorSetup
        onComplete={() => setShowSetup(false)}
        isEditing={setupComplete}
      />
    );
  }

  // Filtered coverage requests for Tab 1
  const filteredRequests = coverageLogData.filter((r) => {
    const matchSearch =
      !search ||
      r.caregiver.toLowerCase().includes(search.toLowerCase()) ||
      r.client.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchUrgency = urgencyFilter === "all" || r.urgency === urgencyFilter;
    return matchSearch && matchStatus && matchUrgency;
  });

  return (
    <div className="space-y-4">
      {/* ── Page heading ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-neutral-900">AI Coordinator</h1>
          <p className="text-[12px] text-neutral-500 font-normal mt-0.5">
            Coverage requests, caregiver outreach, and shift reassignment log
          </p>
        </div>
        <div className="flex items-center gap-2 mr-8">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-[13px] px-4"
            onClick={() => setShowSetup(true)}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="coverage-log">
        <div className="flex items-center justify-between mb-3">
          <ScrollArea className="flex-1">
            <TabsList className="h-auto -space-x-px bg-background p-0 shadow-sm shadow-black/5 rtl:space-x-reverse">
              <TabsTrigger
                value="coverage-log"
                className="relative overflow-hidden rounded-none border border-border py-2 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 first:rounded-s last:rounded-e data-[state=active]:bg-muted data-[state=active]:after:bg-primary"
              >
                <Database
                  className="-ms-0.5 me-1.5 opacity-60"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                Coverage Log
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="relative overflow-hidden rounded-none border border-border py-2 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 first:rounded-s last:rounded-e data-[state=active]:bg-muted data-[state=active]:after:bg-primary"
              >
                <ClipboardList
                  className="-ms-0.5 me-1.5 opacity-60"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                Requests
                {coordRequests.filter((r) => r.status === "pending").length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                    {coordRequests.filter((r) => r.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="coordinator"
                className="relative overflow-hidden rounded-none border border-border py-2 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 first:rounded-s last:rounded-e data-[state=active]:bg-muted data-[state=active]:after:bg-primary"
              >
                <Activity
                  className="-ms-0.5 me-1.5 opacity-60"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                Coverage Coordinator
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          {/* Auto Scheduler Toggle */}
          <div className="flex items-center gap-2 ml-4 mr-8 rounded-full border border-neutral-200 bg-white px-3 py-2">
            <Switch
              checked={autoSchedulerEnabled}
              onCheckedChange={setAutoSchedulerEnabled}
              aria-label="Auto Scheduler"
            />
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-neutral-600" />
              <span className="text-[12px] font-medium text-neutral-700 select-none">
                Auto Scheduler
              </span>
            </div>
            {autoSchedulerEnabled && (
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════
            TAB 1 — Coverage Log (Data Table)
        ══════════════════════════════════════ */}
        <TabsContent value="coverage-log">
          <Card className="shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
              <CardTitle className="text-[14px] font-semibold">Coverage Requests</CardTitle>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 w-52 text-[12px]"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* Status filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-[12px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {/* Urgency filter */}
                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger className="h-8 w-[120px] text-[12px]">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgency</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>

                {(statusFilter !== "all" || urgencyFilter !== "all" || search) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-[12px]"
                    onClick={() => { setSearch(""); setStatusFilter("all"); setUrgencyFilter("all"); }}
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}

                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]">
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-0 px-4 pb-4">
              {coverageLogLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                </div>
              ) : (
                <CoverageLogTable records={filteredRequests} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════
            TAB — Requests (Approve / Reject)
        ══════════════════════════════════════ */}
        <TabsContent value="requests">
          <Card className="shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
              <CardTitle className="text-[14px] font-semibold">AI Coordinator Requests</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={reqStatusFilter} onValueChange={setReqStatusFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-[12px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                {reqStatusFilter !== "all" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-[12px]"
                    onClick={() => setReqStatusFilter("all")}
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4">
              {reqLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                </div>
              ) : (
                <RequestsTable
                  records={
                    reqStatusFilter === "all"
                      ? coordRequests
                      : coordRequests.filter((r) => r.status === reqStatusFilter)
                  }
                  onAction={handleRequestAction}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════
            TAB 3 — Coverage Coordinator (Outreach Workflow)
        ══════════════════════════════════════ */}
        <TabsContent value="coordinator">
          <div className="flex gap-4">
            {/* LEFT — Responses Collected (~40%) */}
            <div className="flex flex-col gap-3 min-w-[360px] w-[40%] shrink-0">
              <Card className="rounded-2xl border-neutral-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                <CardHeader className="px-4 py-3 border-b border-neutral-100 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-[13px] font-semibold text-neutral-900">Responses Collected</CardTitle>
                  {outreachResponses.length > 0 && (
                    <Badge variant="neutral" className="text-[10px] h-5 px-2">
                      {outreachResponses.length}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="flex flex-col gap-2 px-4 py-4 overflow-y-auto flex-1 min-h-0">
                  {outreachResponses.length > 0 ? (
                    outreachResponses.map((response) => {
                      const isExpanded = selectedResponseId === response.id;
                      return (
                        <div key={response.id} className="flex flex-col gap-0">
                          <div
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                              isExpanded
                                ? "border-neutral-900 bg-neutral-50"
                                : response.status !== "accepted"
                                  ? "border-neutral-100 bg-neutral-50 opacity-60 hover:opacity-100"
                                  : "border-neutral-100 bg-white hover:bg-neutral-50"
                            )}
                            onClick={() => {
                              setSelectedResponseId(isExpanded ? null : response.id);
                            }}
                          >
                            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-neutral-900 text-white text-[11px] font-bold">
                              {response.initials}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-[12px] font-medium text-neutral-900">
                                {response.firstName} {response.lastName}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="neutral" className="text-[10px] h-4 px-1.5">
                                  {response.role}
                                </Badge>
                                {getResponseStatusBadge(response.status)}
                              </div>
                            </div>
                            {response.status === "accepted" && selectedShift && !isExpanded && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignToShift(response.id);
                                }}
                                className="h-7 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] gap-1 px-2.5 shrink-0"
                              >
                                <Check className="h-3 w-3" />
                                Assign
                              </Button>
                            )}
                          </div>

                          {/* Expanded Response Details */}
                          {isExpanded && response.responseDetails && (
                            <div className="flex flex-col gap-3 p-3 mt-2 rounded-lg border border-neutral-200 bg-white">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-neutral-900">Response Summary</span>
                                <div className="flex items-center gap-1.5">
                                  {response.contactMethod === "call" && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100">
                                      <Phone className="h-3 w-3 text-neutral-600" />
                                      <span className="text-[10px] text-neutral-600">Call</span>
                                    </div>
                                  )}
                                  {response.contactMethod === "text" && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100">
                                      <MessageCircle className="h-3 w-3 text-neutral-600" />
                                      <span className="text-[10px] text-neutral-600">Text</span>
                                    </div>
                                  )}
                                  {response.contactMethod === "both" && (
                                    <>
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100">
                                        <Phone className="h-3 w-3 text-neutral-600" />
                                        <span className="text-[10px] text-neutral-600">Call</span>
                                      </div>
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100">
                                        <MessageCircle className="h-3 w-3 text-neutral-600" />
                                        <span className="text-[10px] text-neutral-600">Text</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Timestamp and Duration */}
                              <div className="flex items-center gap-3 text-[11px]">
                                <div className="flex items-center gap-1.5 text-neutral-600">
                                  <Clock className="h-3 w-3" />
                                  <span>{response.responseDetails.timestamp}</span>
                                </div>
                                {response.responseDetails.duration && (
                                  <div className="flex items-center gap-1.5 text-neutral-600">
                                    <span>•</span>
                                    <span>Duration: {response.responseDetails.duration}</span>
                                  </div>
                                )}
                              </div>

                              {/* Message */}
                              {response.responseDetails.message && (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <MessageSquare className="h-3 w-3 text-neutral-500" />
                                    <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Message</span>
                                  </div>
                                  <p className="text-[12px] text-neutral-700 leading-relaxed pl-5">
                                    &ldquo;{response.responseDetails.message}&rdquo;
                                  </p>
                                </div>
                              )}

                              {/* Notes */}
                              {response.responseDetails.notes && (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="h-3 w-3 text-neutral-500" />
                                    <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Notes</span>
                                  </div>
                                  <p className="text-[11px] text-neutral-600 leading-relaxed pl-5">
                                    {response.responseDetails.notes}
                                  </p>
                                </div>
                              )}

                              {/* Action Button for Accepted */}
                              {response.status === "accepted" && selectedShift && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignToShift(response.id);
                                  }}
                                  className="w-full h-8 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] gap-1.5"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Assign to Shift
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <MessageSquare className="h-8 w-8 text-neutral-200" />
                      <span className="text-[12px] text-neutral-500">No responses yet</span>
                      <span className="text-[11px] text-neutral-400">
                        Select a vacant shift and send outreach to collect responses
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT — Vacant Shifts / Outreach Panel (~60%) */}
            <div className="flex flex-col gap-3 flex-1">
              <Card className="rounded-2xl border-neutral-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                <CardHeader className="px-4 py-3 border-b border-neutral-100 flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    {selectedShift && (
                      <button
                        onClick={() => { setSelectedShift(null); setOutreachSent(false); }}
                        className="flex items-center justify-center h-6 w-6 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 text-neutral-600" />
                      </button>
                    )}
                    <CardTitle className="text-[13px] font-semibold text-neutral-900">
                      {selectedShift ? "Outreach" : "Vacant Shifts"}
                    </CardTitle>
                  </div>
                  {selectedShift ? (
                    <Button
                      onClick={handleSendOutreach}
                      size="sm"
                      disabled={outreachSending}
                      className="h-8 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] gap-1.5 px-3"
                    >
                      {outreachSending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      {outreachSending ? "Sending..." : "Send"}
                    </Button>
                  ) : (
                    <Badge variant="neutral" className="text-[10px] h-5 px-2">
                      {availableShifts.length}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="flex flex-col gap-4 px-4 py-4 overflow-y-auto flex-1 min-h-0">
                  {selectedShift ? (
                    outreachCaregiversLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                      </div>
                    ) : <>
                      {/* Shift Details Banner */}
                      {selectedShiftData && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                          <Calendar className="h-4 w-4 text-neutral-500 shrink-0" />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[12px] font-medium text-neutral-900">{selectedShiftData.clientName}</span>
                            <span className="text-[11px] text-neutral-600">{selectedShiftData.fullDateTime}</span>
                          </div>
                          <Badge variant="warning" className="text-[10px] h-5 px-2 shrink-0">Vacant</Badge>
                        </div>
                      )}

                      {/* Search Bar with Apply All Toggles */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Search caregivers..."
                              value={outreachSearch}
                              onChange={(e) => setOutreachSearch(e.target.value)}
                              className="pl-8 h-8 text-[12px]"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAutoSelectTopMatches}
                            className="h-8 gap-1.5 text-[11px] px-3 whitespace-nowrap"
                          >
                            <Zap className="h-3 w-3" />
                            Auto-Select
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={outreachCaregivers.length > 0 && outreachCaregivers.every(cg => caregiverToggles[cg.id]?.call)}
                                onCheckedChange={(checked) => handleApplyAll("call", checked)}
                              />
                              <span className="text-[10px] text-neutral-600">Call All</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={outreachCaregivers.length > 0 && outreachCaregivers.every(cg => caregiverToggles[cg.id]?.text)}
                                onCheckedChange={(checked) => handleApplyAll("text", checked)}
                              />
                              <span className="text-[10px] text-neutral-600">Text All</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-500">
                            {outreachCaregivers.filter(cg => {
                              const toggles = caregiverToggles[cg.id];
                              return toggles && (toggles.call || toggles.text);
                            }).length} selected
                          </span>
                        </div>
                      </div>

                      {/* Caregiver List */}
                      <div className="flex flex-col gap-1.5">
                        {filteredCaregivers.map((caregiver) => (
                          <div
                            key={caregiver.id}
                            className={cn(
                              "flex flex-col gap-2 p-3 rounded-lg border transition-colors",
                              caregiver.availability === "unavailable" 
                                ? "border-neutral-100 bg-neutral-50 opacity-60"
                                : "border-neutral-100 bg-white hover:bg-neutral-50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-neutral-900 text-white text-[11px] font-bold">
                                {caregiver.initials}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[12px] font-medium text-neutral-900">
                                  {caregiver.firstName} {caregiver.lastName}
                                </span>
                                <Badge variant="neutral" className="text-[10px] h-4 px-1.5 w-fit">
                                  {caregiver.role}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <Switch
                                    checked={caregiverToggles[caregiver.id]?.call || false}
                                    onCheckedChange={(checked) => handleToggleChange(caregiver.id, "call", checked)}
                                    disabled={caregiver.availability === "unavailable"}
                                  />
                                  <span className="text-[11px] text-neutral-600">Call</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Switch
                                    checked={caregiverToggles[caregiver.id]?.text || false}
                                    onCheckedChange={(checked) => handleToggleChange(caregiver.id, "text", checked)}
                                    disabled={caregiver.availability === "unavailable"}
                                  />
                                  <span className="text-[11px] text-neutral-600">Text</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : vacantShiftsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                    </div>
                  ) : (
                    /* Shift List View */
                    <div className="flex flex-col gap-1.5">
                      {availableShifts.length > 0 ? (
                        availableShifts.map((shift) => (
                          <div
                            key={shift.id}
                            onClick={() => handleSelectShift(shift.id)}
                            className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 bg-white hover:bg-neutral-50 transition-colors cursor-pointer"
                          >
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-[12px] font-medium text-neutral-900">
                                {shift.clientName}
                              </span>
                              <span className="text-[11px] text-neutral-600">
                                {shift.fullDateTime}
                              </span>
                            </div>
                            <Badge variant="warning" className="text-[10px] h-5 px-2">
                              Vacant
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-12 text-center">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                          <span className="text-[12px] text-neutral-500">All shifts have been assigned!</span>
                          <span className="text-[11px] text-neutral-400">No vacant shifts remaining</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
