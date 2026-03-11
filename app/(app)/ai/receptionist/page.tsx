"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Search,
  Settings,
  X,
} from "lucide-react";
import { ReceptionistSetup } from "@/components/ai/receptionist-setup";
import { useReceptionistStore } from "@/store/useReceptionistStore";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

type CallerType = "client" | "family" | "caregiver" | "applicant" | "billing" | "other";
type IntentType = "caregiver call-out" | "schedule change" | "billing issue" | "complaint" | "applicant" | "inquiry" | "incident" | "other";
type PriorityType = "urgent" | "high" | "normal";
type RoutedToType = "coordinator" | "admin";

interface CallRecord {
  id: string;
  caller: string;
  type: CallerType;
  phone: string;
  intent: IntentType;
  priority: PriorityType;
  routedTo: RoutedToType;
  summary: string;
  time: string;
}

// ─────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────

const CALL_RECORDS: CallRecord[] = [
  {
    id: "1",
    caller: "Margaret Wilson",
    type: "family",
    phone: "+1 (555) 234-5678",
    intent: "schedule change",
    priority: "normal",
    routedTo: "coordinator",
    summary: "Requesting to reschedule caregiver visit from Tue 2pm to Thu 2pm for Eleanor Wilson.",
    time: "Today, 2:31 PM",
  },
  {
    id: "2",
    caller: "Robert Chen",
    type: "caregiver",
    phone: "+1 (555) 987-6543",
    intent: "incident",
    priority: "urgent",
    routedTo: "admin",
    summary: "Caregiver reporting client fall in bathroom at 5:30 PM — escalated to admin.",
    time: "Today, 1:58 PM",
  },
  {
    id: "3",
    caller: "Sarah Martinez",
    type: "client",
    phone: "+1 (555) 321-0987",
    intent: "billing issue",
    priority: "high",
    routedTo: "admin",
    summary: "Disputing invoice #INV-2024 — claims incorrect billing for services last month.",
    time: "Today, 1:12 PM",
  },
  {
    id: "4",
    caller: "James Okafor",
    type: "applicant",
    phone: "+1 (555) 100-2345",
    intent: "applicant",
    priority: "normal",
    routedTo: "coordinator",
    summary: "New caregiver applicant inquiring about open positions and application process.",
    time: "Today, 11:47 AM",
  },
  {
    id: "5",
    caller: "Linda Torres",
    type: "family",
    phone: "+1 (555) 876-5432",
    intent: "complaint",
    priority: "high",
    routedTo: "admin",
    summary: "Family member filing complaint about caregiver punctuality over the past two weeks.",
    time: "Today, 10:30 AM",
  },
  {
    id: "6",
    caller: "Unknown Caller",
    type: "other",
    phone: "+1 (555) 000-0001",
    intent: "inquiry",
    priority: "normal",
    routedTo: "coordinator",
    summary: "General inquiry about home care services and availability for new client intake.",
    time: "Today, 9:15 AM",
  },
  {
    id: "7",
    caller: "Patricia Nguyen",
    type: "caregiver",
    phone: "+1 (555) 654-3210",
    intent: "caregiver call-out",
    priority: "urgent",
    routedTo: "coordinator",
    summary: "Caregiver calling out sick for tomorrow morning shift — needs immediate coverage.",
    time: "Yesterday, 6:45 PM",
  },
  {
    id: "8",
    caller: "David Kim",
    type: "billing",
    phone: "+1 (555) 222-3344",
    intent: "billing issue",
    priority: "normal",
    routedTo: "admin",
    summary: "Confirming receipt of payment and asking for updated invoice copy for records.",
    time: "Yesterday, 3:20 PM",
  },
];

// ─────────────────────────────────────────
// Badge helpers — neutral palette (matches HR table)
// ─────────────────────────────────────────

const neutralBadge = "bg-neutral-100 text-neutral-700 border border-neutral-200 text-[11px] font-medium capitalize";
const urgentBadge  = "bg-neutral-900 text-white border border-neutral-900 text-[11px] font-medium capitalize";
const highBadge    = "bg-neutral-200 text-neutral-800 border border-neutral-300 text-[11px] font-medium capitalize";

function priorityClass(p: PriorityType) {
  if (p === "urgent") return urgentBadge;
  if (p === "high")   return highBadge;
  return neutralBadge;
}

// ─────────────────────────────────────────
// Call Log Table — styled to match HR table
// ─────────────────────────────────────────

interface CallLogTableProps {
  records: CallRecord[];
}

function CallLogTable({ records }: CallLogTableProps) {
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
            {["Caller", "Type", "Phone", "Intent", "Priority", "Routed To", "Summary", "Time"].map((h) => (
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
                {/* Caller */}
                <td className="py-2.5 px-3">
                  <div className="text-[13px] font-medium text-neutral-900 whitespace-nowrap">{record.caller}</div>
                </td>

                {/* Type */}
                <td className="py-2.5 px-3">
                  <Badge className={neutralBadge}>{record.type}</Badge>
                </td>

                {/* Phone */}
                <td className="py-2.5 px-3">
                  <div className="text-[12px] text-neutral-900 tabular-nums whitespace-nowrap">{record.phone}</div>
                </td>

                {/* Intent */}
                <td className="py-2.5 px-3">
                  <div className="text-[12px] text-neutral-900 capitalize">{record.intent}</div>
                </td>

                {/* Priority */}
                <td className="py-2.5 px-3">
                  <Badge className={priorityClass(record.priority)}>{record.priority}</Badge>
                </td>

                {/* Routed To */}
                <td className="py-2.5 px-3">
                  <Badge className={neutralBadge}>{record.routedTo}</Badge>
                </td>

                {/* Summary */}
                <td className="py-2.5 px-3 max-w-[280px]">
                  <div className="text-[12px] text-neutral-500 line-clamp-2 leading-relaxed">{record.summary}</div>
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
                No call records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────

export default function AIReceptionistPage() {
  const searchParams = useSearchParams();
  const setupComplete = useReceptionistStore((state) => state.setupComplete);
  const [showSetup, setShowSetup] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [routedToFilter, setRoutedToFilter] = useState("all");

  useEffect(() => {
    if (searchParams.get("setup") === "true") setShowSetup(true);
  }, [searchParams]);

  if (!setupComplete || showSetup) {
    return <ReceptionistSetup onComplete={() => setShowSetup(false)} />;
  }

  // Filtered records
  const filtered = CALL_RECORDS.filter((r) => {
    const matchSearch =
      !search ||
      r.caller.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search) ||
      r.summary.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.type === typeFilter;
    const matchPriority = priorityFilter === "all" || r.priority === priorityFilter;
    const matchRoutedTo = routedToFilter === "all" || r.routedTo === routedToFilter;
    return matchSearch && matchType && matchPriority && matchRoutedTo;
  });

  return (
    <div className="space-y-4">
      {/* ── Page heading ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-neutral-900">AI Receptionist</h1>
          <p className="text-[12px] text-neutral-500 font-normal mt-0.5">
            Incoming calls, intake summaries, and routing log
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

      {/* ── Call Log Card ── */}
      <Card className="shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
          <CardTitle className="text-[14px] font-semibold">Call Log</CardTitle>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search calls..."
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

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[120px] text-[12px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="caregiver">Caregiver</SelectItem>
                <SelectItem value="applicant">Applicant</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 w-[120px] text-[12px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>

            {/* Routed To filter */}
            <Select value={routedToFilter} onValueChange={setRoutedToFilter}>
              <SelectTrigger className="h-8 w-[130px] text-[12px]">
                <SelectValue placeholder="Routed To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                <SelectItem value="coordinator">Coordinator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            {(typeFilter !== "all" || priorityFilter !== "all" || routedToFilter !== "all" || search) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-[12px]"
                onClick={() => { setSearch(""); setTypeFilter("all"); setPriorityFilter("all"); setRoutedToFilter("all"); }}
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
          <CallLogTable records={filtered} />
        </CardContent>
      </Card>
    </div>
  );
}
