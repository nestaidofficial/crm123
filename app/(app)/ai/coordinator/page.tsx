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
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Download,
  Loader2,
  MessageSquare,
  Phone,
  PhoneIncoming,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Star,
  User,
  X,
  Zap,
  Database,
  Activity,
  ClipboardList,
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

const COVERAGE_REQUESTS: CoverageRequest[] = [
  {
    id: "1",
    caregiver: "Patricia Nguyen",
    client: "Eleanor Wilson",
    shift: "Tomorrow, 9am - 11am",
    reason: "Sick",
    urgency: "urgent",
    status: "filled",
    assignedTo: "Sarah Martinez",
    time: "Today, 8:45 AM",
  },
  {
    id: "2",
    caregiver: "Rahul Chettri",
    client: "Margaret Chen",
    shift: "Today, 2pm - 10pm",
    reason: "Family Emergency",
    urgency: "urgent",
    status: "in_progress",
    assignedTo: null,
    time: "Today, 1:30 PM",
  },
  {
    id: "3",
    caregiver: "James Okafor",
    client: "Robert Kim",
    shift: "Mar 8, 8am - 4pm",
    reason: "Doctor Appointment",
    urgency: "high",
    status: "open",
    assignedTo: null,
    time: "Today, 11:20 AM",
  },
  {
    id: "4",
    caregiver: "Linda Torres",
    client: "Sarah Johnson",
    shift: "Mar 9, 10am - 6pm",
    reason: "Personal Day",
    urgency: "normal",
    status: "open",
    assignedTo: null,
    time: "Today, 9:15 AM",
  },
  {
    id: "5",
    caregiver: "David Martinez",
    client: "William Brown",
    shift: "Mar 7, 6pm - 10pm",
    reason: "Transportation Issue",
    urgency: "high",
    status: "filled",
    assignedTo: "Robert Chen",
    time: "Yesterday, 5:30 PM",
  },
  {
    id: "6",
    caregiver: "Maria Garcia",
    client: "Elizabeth Davis",
    shift: "Mar 6, 9am - 5pm",
    reason: "Sick",
    urgency: "urgent",
    status: "cancelled",
    assignedTo: null,
    time: "Yesterday, 8:00 AM",
  },
];

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
// Types & Data for Coverage Coordinator (Tab 2)
// ─────────────────────────────────────────

type Stage = "idle" | "detected" | "matched" | "scheduled";
type Urgency = "low" | "medium" | "high";

const CALLOUT_EVENT = {
  caregiverName: "Rahul Chettri",
  caregiverInitials: "RC",
  shift: "9am - 11am",
  reason: "Sick",
  source: "in-app" as const,
  timestamp: "8:45 AM",
  date: "Today, March 6",
};

const SHIFT_DETAILS_BASE = {
  issueType: "Call-Out Coverage",
  date: "Tomorrow, March 7, 2026",
  time: "9am - 11am",
  skills: ["Medication Admin", "Mobility Assist"],
  urgency: "high" as Urgency,
  notes: "Client needs morning medication. Prefers experienced caregiver.",
};

const PIPELINE_STEPS = [
  { label: "Eligible caregivers identified", key: "identified" },
  { label: "Outreach sent (call + text)", key: "outreach" },
  { label: "Responses collected", key: "responses" },
  { label: "Best match selected + assigned", key: "matched" },
];

// ─────────────────────────────────────────
// Helper Components for Tab 2
// ─────────────────────────────────────────

function StageIndicator({ stage }: { stage: Stage }) {
  const stages: Stage[] = ["idle", "detected", "matched", "scheduled"];
  const currentIndex = stages.indexOf(stage);

  return (
    <div className="flex items-center gap-1.5">
      {stages.map((s, i) => (
        <div
          key={s}
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-all duration-300",
            i <= currentIndex
              ? "bg-neutral-900 scale-110"
              : "bg-neutral-200"
          )}
        />
      ))}
    </div>
  );
}

function OutreachStatusBadge({ status }: { status: string }) {
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
  if (status === "no-answer")
    return (
      <Badge variant="warning" className="text-[10px] h-5 px-2">
        No Answer
      </Badge>
    );
  return (
    <Badge variant="neutral" className="text-[10px] h-5 px-2">
      <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
      Pending
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

  // Tab 2 state (Coverage Coordinator)
  const [stage, setStage] = useState<Stage>("idle");
  const [autoMode, setAutoMode] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);

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

  // Hydrate stores on mount + fetch coordinator requests
  useEffect(() => {
    hydrateEmployees();
    hydrateClients();
    hydrateSchedule({ startDate: "2026-03-07", endDate: "2026-03-07" });
  }, [hydrateEmployees, hydrateClients, hydrateSchedule]);

  // Fetch requests once agency ID is available
  useEffect(() => {
    fetchCoordRequests();
  }, [fetchCoordRequests]);

  // ── Real-time: refresh Requests tab when coverage_requests changes ──
  const handleRequestsChange = useCallback(() => {
    fetchCoordRequests();
  }, [fetchCoordRequests]);

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

  async function handleRequestAction(id: string, action: "approve" | "reject") {
    const res = await apiFetch(`/api/coordinator-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast.success(`Request ${action === "approve" ? "approved" : "rejected"}`);
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

  // Computed values for Tab 2
  const firstClient = useMemo(
    () => clients[0] ?? null,
    [clients]
  );
  const clientDisplay = firstClient
    ? `${firstClient.firstName} ${firstClient.lastName}`
    : "Eleanor Wilson";
  const clientDisplayWithId = firstClient
    ? `${firstClient.firstName} ${firstClient.lastName}`
    : "Eleanor Wilson (CL-2847)";

  const SHIFT_DETAILS = {
    ...SHIFT_DETAILS_BASE,
    client: clientDisplayWithId,
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const avatarColors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-cyan-100 text-cyan-700",
    "bg-rose-100 text-rose-700",
  ];
  const getAvatarColor = (index: number) => avatarColors[index % avatarColors.length];

  const eligibleCaregivers = useMemo(() => {
    const caregiverRoles = ["caregiver", "cna", "hha", "rn", "lpn"];
    return employees
      .filter(
        (emp) =>
          emp.status === "active" &&
          caregiverRoles.includes(emp.role) &&
          !(emp.firstName === "Rahul" && emp.lastName === "Chettri")
      )
      .slice(0, 5);
  }, [employees]);

  const topEligible = useMemo(() => {
    return eligibleCaregivers.slice(0, 3).map((emp, idx) => {
      const match = 95 - idx * 3;
      return {
        id: emp.id,
        initials: getInitials(emp.firstName, emp.lastName),
        name: `${emp.firstName} ${emp.lastName}`,
        avatar: emp.avatar ?? null,
        distance: `${(2.3 + idx * 0.8).toFixed(1)} mi away`,
        match,
        rating: parseFloat((4.9 - idx * 0.1).toFixed(1)),
        avatarColor: getAvatarColor(idx),
        badgeVariant: (match >= 90 ? "positive" : "warning") as "positive" | "warning",
      };
    });
  }, [eligibleCaregivers]);

  const outreachLog = useMemo(() => {
    const statuses: Array<"accepted" | "declined" | "no-answer"> = [
      "accepted",
      "accepted",
      "accepted",
      "no-answer",
      "declined",
    ];
    const channels: Array<"sms" | "call"> = ["sms", "call", "sms", "call", "sms"];
    
    return eligibleCaregivers.map((emp, idx) => ({
      id: emp.id,
      initials: getInitials(emp.firstName, emp.lastName),
      name: `${emp.firstName} ${emp.lastName}`,
      avatar: emp.avatar ?? null,
      avatarColor: getAvatarColor(idx),
      channel: channels[idx % channels.length],
      message:
        channels[idx % channels.length] === "sms"
          ? `Hi ${emp.firstName}, urgent coverage needed for ${clientDisplay} tomorrow 9-11am...`
          : `Calling ${emp.firstName} ${emp.lastName}...`,
      status: statuses[idx % statuses.length],
      timestamp: `8:${46 + idx} AM`,
    }));
  }, [eligibleCaregivers, clientDisplay]);

  const aiRecommendation = useMemo(() => {
    const firstAccepted = outreachLog.find((log) => log.status === "accepted");
    if (!firstAccepted) return null;

    const topMatch = topEligible.find((t) => t.id === firstAccepted.id) || topEligible[0];
    
    return {
      caregiver: {
        id: topMatch.id,
        initials: topMatch.initials,
        name: topMatch.name,
        avatar: topMatch.avatar,
        avatarColor: topMatch.avatarColor,
        match: topMatch.match,
        rating: topMatch.rating,
        distance: topMatch.distance,
      },
      reasoning: [
        `Nearest available caregiver (${topMatch.distance})`,
        `${topMatch.match}% skill match (Medication Admin certified)`,
        "No overtime - within 40hr/week limit",
        `${topMatch.rating} rating with completed shifts`,
        "Previous experience with this client",
      ],
      skillOverlap: topMatch.match,
      availability: "Available 9am - 11am",
    };
  }, [outreachLog, topEligible]);

  const advanceStage = async () => {
    const stages: Stage[] = ["idle", "detected", "matched", "scheduled"];
    const currentIndex = stages.indexOf(stage);

    if (stage === "detected") {
      setStage("matched");
      return;
    }

    if (stage === "matched") {
      if (!aiRecommendation) {
        toast.error("No eligible caregiver found. Please try again.");
        return;
      }
      try {
        const caregiverName = aiRecommendation.caregiver.name;
        const rahul = employees.find(
          (e) => e.firstName === "Rahul" && e.lastName === "Chettri"
        );

        const shiftDate = "2026-03-07";
        const existingShift = scheduleEvents.find((ev) => {
          const start = new Date(ev.startAt);
          const dateMatches = start.toISOString().startsWith(shiftDate);
          const hourMatches = start.getUTCHours() >= 8 && start.getUTCHours() <= 10;
          const caregiverMatches = rahul ? ev.caregiverId === rahul.id : true;
          return dateMatches && hourMatches && (caregiverMatches || ev.caregiverId === null);
        });

        if (existingShift) {
          await updateEvent(existingShift.id, {
            caregiverId: aiRecommendation.caregiver.id,
            title: `Personal Care – ${caregiverName}`,
            color: "bg-emerald-200",
            status: "scheduled",
          });
        } else {
          await hydrateSchedule({ startDate: "2026-03-07", endDate: "2026-03-07" });
          const freshEvents = useScheduleStore.getState().events;
          const freshShift = freshEvents.find((ev) => {
            const start = new Date(ev.startAt);
            return (
              start.toISOString().startsWith(shiftDate) &&
              start.getUTCHours() >= 8 &&
              start.getUTCHours() <= 10
            );
          });

          if (freshShift) {
            await updateEvent(freshShift.id, {
              caregiverId: aiRecommendation.caregiver.id,
              title: `Personal Care – ${caregiverName}`,
              color: "bg-emerald-200",
              status: "scheduled",
            });
          } else {
            const shiftStart = new Date("2026-03-07T09:00:00");
            const shiftEnd   = new Date("2026-03-07T11:00:00");
            await createEvent({
              title: `Personal Care – ${caregiverName}`,
              caregiverId: aiRecommendation.caregiver.id,
              clientId: firstClient?.id ?? null,
              careCoordinatorId: null,
              careType: "personal_care",
              status: "scheduled",
              startAt: shiftStart.toISOString(),
              endAt:   shiftEnd.toISOString(),
              isAllDay: false,
              isOpenShift: false,
              color: "bg-emerald-200",
              description: null,
              instructions: "Client needs morning medication. Prefers experienced caregiver.",
              payRate: null,
              payType: null,
              recurrenceRuleId: null,
              isRecurringInstance: false,
              parentEventId: null,
            });
          }
        }

        clearCache();
        await hydrateSchedule({ startDate: "2026-03-01", endDate: "2026-03-07" });

        toast.success(`Shift reassigned to ${caregiverName} — visible on Schedule page`);
      } catch (error) {
        toast.error("Failed to reassign shift");
        console.error("Schedule error:", error);
        return;
      }
      setStage("scheduled");
      return;
    }

    if (currentIndex < stages.length - 1) {
      setStage(stages[currentIndex + 1]);
    }
  };

  const resetFlow = () => {
    setAutoMode(false);
    setAutoRunning(false);
    setStage("idle");
  };

  useEffect(() => {
    if (!autoMode || autoRunning || stage === "scheduled") return;

    setAutoRunning(true);

    const delays: Partial<Record<Stage, number>> = {
      idle: 1200,
      detected: 1800,
      matched: 2000,
    };

    const delay = delays[stage] ?? 0;
    if (!delay) { setAutoRunning(false); return; }

    const timer = setTimeout(async () => {
      await advanceStage();
      setAutoRunning(false);
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, stage]);

  const getStepStatus = (stepKey: string) => {
    if (stage === "idle") return "waiting";
    if (stage === "detected") return stepKey === "identified" ? "done" : "waiting";
    if (stage === "matched") {
      if (stepKey === "matched") return "in-progress";
      if (stepKey === "identified" || stepKey === "outreach" || stepKey === "responses") return "done";
      return "waiting";
    }
    if (stage === "scheduled") return "done";
    return "waiting";
  };

  const stats = {
    eligible: eligibleCaregivers.length,
    contacted: stage === "idle" || stage === "detected" ? 0 : outreachLog.length,
    interested:
      stage === "idle" || stage === "detected"
        ? 0
        : outreachLog.filter((log) => log.status === "accepted").length,
  };

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
  const filteredRequests = COVERAGE_REQUESTS.filter((r) => {
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
        <ScrollArea>
          <TabsList className="mb-3 h-auto -space-x-px bg-background p-0 shadow-sm shadow-black/5 rtl:space-x-reverse">
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
              <CoverageLogTable records={filteredRequests} />
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
            TAB 2 — Coverage Coordinator (Demo Dashboard)
        ══════════════════════════════════════ */}
        <TabsContent value="coordinator">
          <div className="flex flex-col gap-4">
            {/* Demo controls header */}
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <StageIndicator stage={stage} />
                <div className="h-4 w-px bg-neutral-200" />
                <Badge variant="neutral" className="text-[11px] h-6 px-2.5">
                  Demo Mode
                </Badge>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <Zap className="h-3 w-3" />
                  Coverage Automation: On
                </span>
                {stage !== "scheduled" && (
                  <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5">
                    <Switch
                      checked={autoMode}
                      onCheckedChange={(val) => {
                        setAutoMode(val);
                        if (!val) setAutoRunning(false);
                      }}
                      aria-label="Auto mode"
                    />
                    <span className="text-[11px] font-medium text-neutral-600 select-none">
                      Auto
                    </span>
                    {autoRunning && (
                      <Loader2 className="h-3 w-3 text-neutral-400 animate-spin" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {stage === "scheduled" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetFlow}
                    className="h-8 text-[12px] gap-1.5 border-neutral-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Demo
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={advanceStage}
                    disabled={(stage === "matched" && !aiRecommendation) || autoRunning}
                    className="h-8 bg-neutral-900 hover:bg-neutral-800 text-white text-[12px] gap-1.5 disabled:opacity-50"
                  >
                    {stage === "idle" && (
                      <>
                        <AlertCircle className="h-3.5 w-3.5" />
                        Simulate Call-Out
                      </>
                    )}
                    {stage === "detected" && (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Find Coverage
                      </>
                    )}
                    {stage === "matched" && (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Auto-Schedule
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* 3-Column Dashboard */}
            <div className="flex gap-4">
              {/* LEFT — Call-Out Detection */}
              <div className="flex flex-col gap-3 min-w-[260px] w-[26%] shrink-0">
                <Card className="rounded-2xl border-neutral-200 shadow-sm overflow-hidden">
                  <CardHeader className="px-4 py-2.5 border-b border-neutral-100 flex-row items-center justify-between space-y-0">
                    <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Call-Out Detection
                    </span>
                    {stage === "idle" ? (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-neutral-300" />
                        <span className="text-[11px] text-neutral-400">Idle</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[11px] text-red-600 font-medium">Active</span>
                      </div>
                    )}
                  </CardHeader>

                  {stage === "idle" ? (
                    <>
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-neutral-100">
                          <User className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[13px] font-semibold text-neutral-900">No Call-Outs</span>
                          <span className="text-[11px] text-neutral-500">System monitoring</span>
                        </div>
                      </div>
                      <div className="flex h-44 flex-col items-center justify-center gap-2 px-4 py-4">
                        <AlertCircle className="h-7 w-7 text-neutral-200" />
                        <span className="text-[12px] text-neutral-400">No active call-outs</span>
                        <span className="text-[11px] text-neutral-400">Click &quot;Simulate Call-Out&quot; to begin</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3 px-4 py-3 bg-red-50 border-b border-red-100">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                          <span className="text-[13px] font-semibold text-red-900">Call-Out Detected</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-100 text-red-700 text-[12px] font-bold">
                            {CALLOUT_EVENT.caregiverInitials}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-neutral-900">
                              {CALLOUT_EVENT.caregiverName}
                            </span>
                            <span className="text-[11px] text-neutral-600">{CALLOUT_EVENT.shift}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="negative" className="text-[10px] h-5 px-2">
                            {CALLOUT_EVENT.reason}
                          </Badge>
                          <Badge
                            variant="neutral"
                            className="text-[10px] h-5 px-2 gap-1"
                          >
                            {CALLOUT_EVENT.source === "in-app" ? (
                              <>
                                <Smartphone className="h-2.5 w-2.5" />
                                In-App
                              </>
                            ) : (
                              <>
                                <Phone className="h-2.5 w-2.5" />
                                Phone Call
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-neutral-500">Client</span>
                          <span className="text-[11px] font-medium text-neutral-900">
                            {clientDisplay}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-neutral-500">Shift</span>
                          <span className="text-[11px] font-medium text-neutral-900">
                            {CALLOUT_EVENT.shift}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-neutral-500">Reported</span>
                          <span className="text-[11px] font-medium text-neutral-900">
                            {CALLOUT_EVENT.timestamp}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50 px-4 py-3">
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Auto Summary
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">Reason:</span>
                        <span className="text-[11px] font-semibold text-neutral-700">
                          {stage === "idle" ? "—" : "Call-Out (Sick)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">Urgency:</span>
                        <span className="text-[11px] font-semibold text-red-600">
                          {stage === "idle" ? "—" : "High"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">Next:</span>
                        <span className="text-[11px] font-semibold text-neutral-700">
                          {stage === "idle" && "—"}
                          {stage === "detected" && "Find Coverage"}
                          {stage === "matched" && "Auto-Schedule"}
                          {stage === "scheduled" && "Confirmed"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* CENTER — Shift Details + Outreach Console */}
              <div className="flex flex-col gap-3 min-w-[280px] w-[34%] shrink-0">
                <Card className="rounded-2xl border-neutral-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                  <CardHeader className="px-4 py-3 border-b border-neutral-100 flex-row items-center justify-between space-y-0">
                    <span className="text-[13px] font-semibold text-neutral-900">
                      {stage === "idle" ? "Request Details" : "Shift Details"}
                    </span>
                    {stage !== "idle" && (
                      <Badge variant="warning" className="text-[10px] h-5 px-2">
                        Urgent
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4 px-4 py-4 overflow-y-auto flex-1 min-h-0">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-neutral-500">Issue Type</span>
                        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2">
                          <span className="text-[13px] text-neutral-900">
                            {stage === "idle" ? "Scheduling" : SHIFT_DETAILS.issueType}
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-neutral-500">Client</span>
                        {stage === "idle" ? (
                          <>
                            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
                              <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                              <span className="flex-1 text-[13px] text-neutral-400">Search client...</span>
                            </div>
                            <button className="flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-700 transition-colors self-start">
                              <Plus className="h-3.5 w-3.5" />
                              Create new client
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
                            <span className="text-[13px] text-neutral-900">{SHIFT_DETAILS.client}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <div className="flex flex-col gap-1 flex-1">
                          <span className="text-[11px] text-neutral-500">Shift Date</span>
                          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2">
                            <span className={cn("text-[13px]", stage === "idle" ? "text-neutral-400" : "text-neutral-900")}>
                              {stage === "idle" ? "Select date" : SHIFT_DETAILS.date}
                            </span>
                            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <span className="text-[11px] text-neutral-500">Shift Time</span>
                          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2">
                            <span className={cn("text-[13px]", stage === "idle" ? "text-neutral-400" : "text-neutral-900")}>
                              {stage === "idle" ? "2pm – 10pm" : SHIFT_DETAILS.time}
                            </span>
                            <Clock className="h-3.5 w-3.5 text-neutral-400" />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] text-neutral-500">Required Skills</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(stage === "idle" ? ["Medication Admin", "Mobility Assist"] : SHIFT_DETAILS.skills).map((s) => (
                            <Badge key={s} variant="neutral" className="text-[11px] h-6 px-2.5">
                              {s}
                            </Badge>
                          ))}
                          {stage === "idle" && (
                            <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2.5 py-0.5 text-[11px] text-neutral-400 hover:text-neutral-600 hover:border-neutral-400 transition-colors">
                              <Plus className="h-3 w-3" />
                              Add
                            </button>
                          )}
                        </div>
                      </div>

                      {stage !== "idle" && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-neutral-500">Notes</span>
                          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                            <span className="text-[12px] text-neutral-700">{SHIFT_DETAILS.notes}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {(stage === "matched" || stage === "scheduled") && (
                      <>
                        <div className="h-px w-full bg-neutral-200" />
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-semibold text-neutral-800">Outreach Console</span>
                            <Badge variant="info" className="text-[10px] h-5 px-2">
                              Live
                            </Badge>
                          </div>
                          <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
                            {outreachLog.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-start gap-2.5 rounded-lg border border-neutral-100 bg-white px-3 py-2.5 hover:bg-neutral-50 transition-colors"
                              >
                                <div className={cn("flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-bold", entry.avatarColor)}>
                                  {entry.initials}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0 gap-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[12px] font-medium text-neutral-900">{entry.name}</span>
                                    <span className="text-[10px] text-neutral-400 shrink-0">{entry.timestamp}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {entry.channel === "sms" ? (
                                      <MessageSquare className="h-3 w-3 text-neutral-400 shrink-0" />
                                    ) : (
                                      <Phone className="h-3 w-3 text-neutral-400 shrink-0" />
                                    )}
                                    <span className="text-[11px] text-neutral-500 truncate">{entry.message}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <OutreachStatusBadge status={entry.status} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT — Coverage Pipeline + AI Recommendation */}
              <div className="flex flex-col gap-3 min-w-[300px] flex-1">
                <Card className="rounded-2xl border-neutral-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                  <CardHeader className="px-4 py-3 border-b border-neutral-100 flex-col items-start gap-2 space-y-0">
                    <span className="text-[13px] font-semibold text-neutral-900">Coverage Pipeline</span>
                    <div className="flex w-full flex-col gap-1 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="text-[12px] font-semibold text-blue-700">
                          Auto Outreach + Best Match
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-600 leading-relaxed">
                        Automatically contacts eligible caregivers, collects Yes/No responses, ranks
                        interested and recommends highest match. One click to assign.
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4 px-4 py-4 overflow-y-auto flex-1 min-h-0">
                    {stage === "scheduled" && aiRecommendation ? (
                      <div className="flex flex-col gap-4 items-center justify-center py-8">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[16px] font-semibold text-emerald-900">Coverage Confirmed</span>
                          <span className="text-[12px] text-neutral-500">Shift created and visible on Schedule page</span>
                        </div>
                        <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 mt-2">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="relative h-10 w-10 shrink-0">
                              {aiRecommendation.caregiver.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={aiRecommendation.caregiver.avatar}
                                  alt={aiRecommendation.caregiver.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold", aiRecommendation.caregiver.avatarColor)}>
                                  {aiRecommendation.caregiver.initials}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1">
                              <span className="text-[13px] font-semibold text-neutral-900">
                                {aiRecommendation.caregiver.name}
                              </span>
                              <span className="text-[11px] text-neutral-600">
                                {SHIFT_DETAILS.client}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-600">Shift:</span>
                              <span className="font-medium text-neutral-900">{SHIFT_DETAILS.time}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-600">Date:</span>
                              <span className="font-medium text-neutral-900">{SHIFT_DETAILS.date}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-600">Confirmed:</span>
                              <span className="font-medium text-neutral-900">{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => router.push("/schedule")}
                          className="w-full h-9 bg-neutral-900 hover:bg-neutral-800 text-white text-[12px] gap-2 mt-1"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          View on Schedule
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3">
                          {PIPELINE_STEPS.map((step, i) => {
                            const status = getStepStatus(step.key);
                            return (
                              <div key={step.key} className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "flex h-5 w-5 flex-none items-center justify-center rounded-full border",
                                    status === "done"
                                      ? "bg-emerald-50 border-emerald-300"
                                      : status === "in-progress"
                                      ? "bg-blue-50 border-blue-300"
                                      : "bg-neutral-100 border-neutral-200"
                                  )}
                                >
                                  {status === "done" ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  ) : status === "in-progress" ? (
                                    <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                                  ) : (
                                    <Circle className="h-3 w-3 text-neutral-300" />
                                  )}
                                </div>
                                <span className="flex-1 text-[12px] text-neutral-700">{step.label}</span>
                                <Badge
                                  variant={
                                    status === "done"
                                      ? "positive"
                                      : status === "in-progress"
                                      ? "info"
                                      : "neutral"
                                  }
                                  className="text-[10px] h-5 px-2"
                                >
                                  {status === "done" ? "Done" : status === "in-progress" ? "Running" : "Waiting"}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>

                        <div className="h-px w-full bg-neutral-100" />

                        <div className="flex items-center gap-3">
                          {[
                            { label: "Eligible", value: stats.eligible },
                            { label: "Contacted", value: stats.contacted },
                            { label: "Interested", value: stats.interested },
                          ].map(({ label, value }) => (
                            <div
                              key={label}
                              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2"
                            >
                              <span className="text-[20px] font-bold text-neutral-900 leading-none tabular-nums">
                                {value}
                              </span>
                              <span className="text-[11px] text-neutral-400">{label}</span>
                            </div>
                          ))}
                        </div>

                        <div className="h-px w-full bg-neutral-100" />

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-semibold text-neutral-800">Top Eligible</span>
                            <button className="text-[11px] text-neutral-500 hover:text-neutral-700 transition-colors">
                              View all eligible
                            </button>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {topEligible.map((c, idx) => {
                              const isAutoSelected =
                                idx === 0 &&
                                (stage === "matched" || stage === "scheduled") &&
                                aiRecommendation?.caregiver.id === c.id;
                              return (
                                <div
                                  key={c.id}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors",
                                    isAutoSelected
                                      ? "bg-emerald-50 border border-emerald-200 ring-1 ring-emerald-300/60"
                                      : idx === 0
                                      ? "hover:bg-neutral-50 cursor-pointer"
                                      : "hover:bg-neutral-50 cursor-pointer opacity-50"
                                  )}
                                >
                                  <div className="relative h-8 w-8 shrink-0">
                                    {c.avatar ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={c.avatar}
                                        alt={c.name}
                                        className="h-8 w-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div
                                        className={cn(
                                          "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold",
                                          c.avatarColor
                                        )}
                                      >
                                        {c.initials}
                                      </div>
                                    )}
                                    {isAutoSelected && (
                                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500">
                                        <Check className="h-2 w-2 text-white stroke-[3]" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[12px] font-semibold text-neutral-900">{c.name}</span>
                                      {isAutoSelected && (
                                        <Badge variant="positive" className="text-[9px] h-4 px-1.5 gap-0.5">
                                          <CheckCircle2 className="h-2.5 w-2.5" />
                                          Auto-assigned
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-neutral-400">{c.distance}</span>
                                  </div>
                                  <Badge variant={c.badgeVariant} className="text-[10px] h-5 px-2 shrink-0">
                                    {c.match}%
                                  </Badge>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                    <span className="text-[11px] text-neutral-400 tabular-nums">{c.rating}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {stage === "matched" && aiRecommendation && (
                          <>
                            <div className="h-px w-full bg-neutral-100" />
                            <div className="flex flex-col gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                                <span className="text-[12px] font-semibold text-blue-900">AI Recommended Match</span>
                                <Badge variant="positive" className="text-[10px] h-5 px-2 ml-auto">
                                  {aiRecommendation.caregiver.match}% Match
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="relative h-12 w-12 shrink-0">
                                  {aiRecommendation.caregiver.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={aiRecommendation.caregiver.avatar}
                                      alt={aiRecommendation.caregiver.name}
                                      className="h-12 w-12 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className={cn(
                                        "flex h-12 w-12 items-center justify-center rounded-full text-[14px] font-bold",
                                        aiRecommendation.caregiver.avatarColor
                                      )}
                                    >
                                      {aiRecommendation.caregiver.initials}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-[14px] font-semibold text-neutral-900">
                                    {aiRecommendation.caregiver.name}
                                  </span>
                                  <span className="text-[11px] text-neutral-600">
                                    {aiRecommendation.caregiver.distance} · ★ {aiRecommendation.caregiver.rating}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5 rounded-md bg-white/60 px-3 py-2">
                                <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                                  Why this match
                                </span>
                                {aiRecommendation.reasoning.map((reason, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                                    <span className="text-[11px] text-neutral-700 leading-relaxed">{reason}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </CardContent>

                  {stage !== "scheduled" && (
                    <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 bg-white shrink-0">
                      <button
                        onClick={resetFlow}
                        className="text-[12px] text-neutral-500 hover:text-neutral-700 flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restart
                      </button>
                      <div className="flex items-center gap-2">
                        {stage === "matched" && (
                          <span className="text-[11px] text-neutral-500 mr-2">
                            Ready to schedule
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
