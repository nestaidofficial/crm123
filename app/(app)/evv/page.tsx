"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeClockTable, TimeClockEntry } from "@/components/evv/time-clock-table";
import { TimeClockDetailDrawer } from "@/components/evv/time-clock-detail-drawer";
import { TimeClockKPIStrip } from "@/components/evv/time-clock-kpi-strip";
import { Search, Download, CheckSquare, Settings, CheckCircle2, Flag, Loader2, XCircle, RefreshCw } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { mapVisitRowToTimeClockEntry } from "@/lib/db/evv.mapper";
import type { EVVVisitJoinedRow } from "@/lib/db/evv.mapper";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangePicker, DateRange } from "@/components/billing/date-range-picker";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, isToday } from "date-fns";

export default function EVVPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const agencyId = useAuthStore((s) => s.currentAgencyId);
  const [selectedEntry, setSelectedEntry] = React.useState<TimeClockEntry | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [selectedEntries, setSelectedEntries] = React.useState<string[]>([]);
  const [verificationTab, setVerificationTab] = React.useState("all");
  const [dateRange, setDateRange] = React.useState("this-week");
  const [customDateRange, setCustomDateRange] = React.useState<DateRange>({ start: null, end: null });
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [arrivalStatusFilter, setArrivalStatusFilter] = React.useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = React.useState("all");
  const [fundingSourceFilter, setFundingSourceFilter] = React.useState("all");
  const [gpsStatusFilter, setGpsStatusFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Data fetching state
  const [entries, setEntries] = React.useState<TimeClockEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // Fetch EVV visits from Supabase
  const fetchVisits = React.useCallback(async () => {
    if (!agencyId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setFetchError(null);

      const { data: visitsData, error: visitsError } = await supabase
        .from("evv_visits")
        .select(`
          *,
          employee:employees!fk_evv_visits_employee_agency(id, first_name, last_name, avatar_url),
          client:clients!fk_evv_visits_client_agency(id, first_name, last_name, avatar_url),
          service_type:evv_service_types(name),
          funding_source:evv_funding_sources(name)
        `)
        .eq("agency_id", agencyId)
        .order("scheduled_start", { ascending: false });

      if (visitsError) throw visitsError;

      const visitIds = visitsData?.map((v: { id: string }) => v.id) ?? [];
      const { data: exceptionsData, error: exceptionsError } = visitIds.length > 0
        ? await supabase.from("evv_exceptions").select("*").in("visit_id", visitIds)
        : { data: [], error: null };

      if (exceptionsError) throw exceptionsError;

      type ExceptionRow = { visit_id: string; [key: string]: unknown };
      const exceptionsByVisit = (exceptionsData ?? [] as ExceptionRow[]).reduce(
        (acc: Record<string, ExceptionRow[]>, ex: ExceptionRow) => {
          if (!acc[ex.visit_id]) acc[ex.visit_id] = [];
          acc[ex.visit_id].push(ex);
          return acc;
        },
        {} as Record<string, ExceptionRow[]>
      );

      const mappedEntries = (visitsData ?? []).map((row: any) => {
        const joinedRow: EVVVisitJoinedRow = {
          ...row,
          employee_first_name: row.employee?.first_name ?? "",
          employee_last_name: row.employee?.last_name ?? "",
          employee_avatar_url: row.employee?.avatar_url ?? null,
          client_first_name: row.client?.first_name ?? "",
          client_last_name: row.client?.last_name ?? "",
          client_avatar_url: row.client?.avatar_url ?? null,
          service_type_name: row.service_type?.name ?? "",
          funding_source_name: row.funding_source?.name ?? "",
          exceptions: exceptionsByVisit[row.id] ?? [],
        };
        return mapVisitRowToTimeClockEntry(joinedRow);
      });

      setEntries(mappedEntries);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? "Failed to load visits";
      console.error("Failed to fetch EVV visits:", err);
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [agencyId, supabase]);

  React.useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Refetch whenever the tab regains focus, but only if data is stale (>30s)
  const lastFetchedAtRef = React.useRef<number>(0);
  const originalFetchVisits = fetchVisits;
  const throttledFetchVisits = React.useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchedAtRef.current < 30_000) return;
    lastFetchedAtRef.current = now;
    await originalFetchVisits();
  }, [originalFetchVisits]);

  React.useEffect(() => {
    lastFetchedAtRef.current = Date.now();
  }, [entries]);

  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") throttledFetchVisits();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [throttledFetchVisits]);

  // Calculate KPIs
  const kpis = React.useMemo(() => {
    const totalVisits = entries.length;
    const pendingCount = entries.filter(e => e.verificationStatus === "pending").length;
    const verifiedCount = entries.filter(e => e.verificationStatus === "verified").length;
    const exceptionCount = entries.filter(e => e.verificationStatus === "exception").length;
    const onTimeCount = entries.filter(e => e.arrivalStatus === "on-time").length;
    const onTimePercentage = totalVisits > 0 ? Math.round((onTimeCount / totalVisits) * 100) : 0;
    const pendingApprovalHours = entries
      .filter(e => e.timesheetStatus === "pending" && e.duration)
      .reduce((total, e) => total + (e.duration || 0) / 60, 0);

    return { totalVisits, pendingCount, verifiedCount, exceptionCount, onTimePercentage, pendingApprovalHours };
  }, [entries]);

  // Get unique values for filters (memoized to avoid recalculating on every render)
  const serviceTypes = React.useMemo(() => Array.from(new Set(entries.map(e => e.serviceType))), [entries]);
  const fundingSources = React.useMemo(() => Array.from(new Set(entries.map(e => e.fundingSource))), [entries]);

  // Filter entries
  const filteredEntries = React.useMemo(() => {
    return entries.filter(entry => {
      // Date range filter — check if shift start overlaps with selected range
      if (dateRange !== "all") {
        const shiftStart = parseISO(entry.shiftTime.start);
        const now = new Date();

        if (dateRange === "today") {
          if (!isToday(shiftStart)) return false;
        } else if (dateRange === "this-week") {
          const weekStart = startOfDay(startOfWeek(now, { weekStartsOn: 0 }));
          const weekEnd = endOfDay(endOfWeek(now, { weekStartsOn: 0 }));
          if (!isWithinInterval(shiftStart, { start: weekStart, end: weekEnd })) return false;
        } else if (dateRange === "custom" && customDateRange.start && customDateRange.end) {
          const filterStart = startOfDay(customDateRange.start);
          const filterEnd = endOfDay(customDateRange.end);
          if (!isWithinInterval(shiftStart, { start: filterStart, end: filterEnd })) return false;
        }
      }

      // Verification status filter
      if (verificationTab !== "all" && entry.verificationStatus !== verificationTab) return false;

      // Arrival status filter
      if (arrivalStatusFilter !== "all") {
        if (arrivalStatusFilter === "on-shift" && (!entry.clockIn || entry.clockOut)) return false;
        if (arrivalStatusFilter === "late" && entry.arrivalStatus !== "late") return false;
        if (arrivalStatusFilter === "no-show" && entry.arrivalStatus !== "no-show") return false;
        if (arrivalStatusFilter === "completed" && (!entry.clockIn || !entry.clockOut)) return false;
      }

      // Service type filter
      if (serviceTypeFilter !== "all" && entry.serviceType !== serviceTypeFilter) return false;

      // Funding source filter
      if (fundingSourceFilter !== "all" && entry.fundingSource !== fundingSourceFilter) return false;

      // GPS status filter
      if (gpsStatusFilter !== "all" && entry.gpsStatus !== gpsStatusFilter) return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCaregiver = entry.caregiver.name.toLowerCase().includes(query);
        const matchesClient = entry.client.name.toLowerCase().includes(query);
        const matchesId = entry.id.toLowerCase().includes(query);
        if (!matchesCaregiver && !matchesClient && !matchesId) return false;
      }

      return true;
    });
  }, [entries, dateRange, customDateRange, verificationTab, arrivalStatusFilter, serviceTypeFilter, fundingSourceFilter, gpsStatusFilter, searchQuery]);

  const handleRowClick = (entry: TimeClockEntry) => {
    setSelectedEntry(entry);
    setIsDrawerOpen(true);
  };

  const handleViewDetails = (entry: TimeClockEntry) => {
    setSelectedEntry(entry);
    setIsDrawerOpen(true);
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntries(prev =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedEntries(prev =>
      prev.length === filteredEntries.length ? [] : filteredEntries.map(e => e.id)
    );
  };

  const handleApprove = async (entry: TimeClockEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updateQuery = supabase
        .from("evv_visits")
        .update({
          verification_status: "verified",
          timesheet_status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      const { error: updateError } = agencyId
        ? await updateQuery.eq("agency_id", agencyId)
        : await updateQuery;

      if (updateError) throw updateError;

      await supabase.from("evv_audit_log").insert({
        visit_id: entry.id,
        ...(agencyId ? { agency_id: agencyId } : {}),
        event_type: "approve",
        label: "Visit approved & verified",
        detail: `Manually approved by coordinator.`,
        actor_id: user?.id ?? null,
      });

      // Update local state so the table and drawer reflect the change immediately
      const updated: TimeClockEntry = { ...entry, verificationStatus: "verified" };
      setEntries(prev => prev.map(e => e.id === entry.id ? updated : e));
      setSelectedEntry(updated);

      toast.success("Visit approved & verified");
    } catch (err) {
      console.error("Failed to approve visit:", err);
      toast.error("Failed to approve visit. Please try again.");
    }
  };

  const handleResolveException = (entry: TimeClockEntry) => {
    console.log("Resolve exception:", entry);
  };

  const handleRequestCorrection = (entry: TimeClockEntry) => {
    console.log("Request correction:", entry);
  };

  const handleOverride = (entry: TimeClockEntry) => {
    console.log("Override:", entry);
  };

  const handleMarkNoShow = (entry: TimeClockEntry) => {
    console.log("Mark no-show:", entry);
  };

  const handleEntryUpdated = (updated: TimeClockEntry) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedEntry(updated);
  };

  const handleAddManualEntry = (entry: TimeClockEntry) => {
    console.log("Add manual entry:", entry);
  };

  const handleFlagForReview = (entry: TimeClockEntry) => {
    console.log("Flag for review:", entry);
  };

  const handleMessageCaregiver = (entry: TimeClockEntry) => {
    console.log("Message caregiver:", entry);
  };

  const handleCreateIncident = (entry: TimeClockEntry) => {
    console.log("Create incident:", entry);
  };

  const handleBulkApprove = async () => {
    if (selectedEntries.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let bulkApproveQuery = supabase
        .from("evv_visits")
        .update({
          verification_status: "verified",
          timesheet_status: "approved",
          updated_at: new Date().toISOString(),
        })
        .in("id", selectedEntries);

      if (agencyId) bulkApproveQuery = bulkApproveQuery.eq("agency_id", agencyId);
      const { error: updateError } = await bulkApproveQuery;
      if (updateError) throw updateError;

      const auditEntries = selectedEntries.map((id) => ({
        visit_id: id,
        ...(agencyId ? { agency_id: agencyId } : {}),
        event_type: "approve" as const,
        label: "Visit approved & verified",
        detail: `Bulk approved by coordinator.`,
        actor_id: user?.id ?? null,
      }));

      await supabase.from("evv_audit_log").insert(auditEntries);

      // Update local state
      setEntries(prev => prev.map(e => 
        selectedEntries.includes(e.id) 
          ? { ...e, verificationStatus: "verified" as const }
          : e
      ));
      setSelectedEntries([]);

      toast.success(`${selectedEntries.length} visit(s) approved & verified`);
    } catch (err) {
      console.error("Failed to bulk approve:", err);
      toast.error("Failed to approve visits. Please try again.");
    }
  };

  const handleBulkFlag = async () => {
    if (selectedEntries.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let bulkFlagQuery = supabase
        .from("evv_visits")
        .update({ timesheet_status: "flagged", updated_at: new Date().toISOString() })
        .in("id", selectedEntries);

      if (agencyId) bulkFlagQuery = bulkFlagQuery.eq("agency_id", agencyId);
      const { error: updateError } = await bulkFlagQuery;
      if (updateError) throw updateError;

      const auditEntries = selectedEntries.map((id) => ({
        visit_id: id,
        ...(agencyId ? { agency_id: agencyId } : {}),
        event_type: "flag" as const,
        label: "Visit flagged for review",
        detail: `Bulk flagged by coordinator.`,
        actor_id: user?.id ?? null,
      }));

      await supabase.from("evv_audit_log").insert(auditEntries);

      // Refresh data to reflect changes
      setSelectedEntries([]);
      toast.success(`${selectedEntries.length} visit(s) flagged for review`);
      
      // Refetch to update the list
      await fetchVisits();
    } catch (err) {
      console.error("Failed to bulk flag:", err);
      toast.error("Failed to flag visits. Please try again.");
    }
  };

  const handleBulkExport = () => {
    const entriesToExport = selectedEntries.length > 0
      ? filteredEntries.filter(e => selectedEntries.includes(e.id))
      : filteredEntries;

    if (entriesToExport.length === 0) {
      toast.error("No visits to export");
      return;
    }

    // Create CSV content
    const headers = [
      "Date",
      "Caregiver",
      "Client",
      "Service Type",
      "Funding Source",
      "Scheduled Start",
      "Scheduled End",
      "Clock In",
      "Clock Out",
      "Break (min)",
      "Overtime (min)",
      "Duration (hrs)",
      "Arrival Status",
      "GPS Status",
      "Verification Status",
      "Timesheet Status",
      "Exceptions",
      "Care Notes",
      "Signature"
    ];

    const rows = entriesToExport.map(entry => [
      entry.shiftTime.start.split("T")[0],
      entry.caregiver.name,
      entry.client.name,
      entry.serviceType,
      entry.fundingSource,
      entry.shiftTime.start,
      entry.shiftTime.end,
      entry.clockIn || "N/A",
      entry.clockOut || "N/A",
      entry.breaks.toString(),
      entry.overtime.toString(),
      entry.duration?.toFixed(2) || "0",
      entry.arrivalStatus,
      entry.gpsStatus,
      entry.verificationStatus,
      entry.timesheetStatus,
      entry.exceptions.filter(e => !e.is_resolved).length.toString(),
      entry.careNotesCompleted ? "Yes" : "No",
      entry.signatureCaptured ? "Yes" : "No"
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => {
        const cellStr = String(cell ?? "");
        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(","))
      .join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `evv_visits_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${entriesToExport.length} visit(s) to CSV`);
  };

  const datePills = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "this-week", label: "This Week" },
    { value: "custom", label: "Custom" },
  ];

  const customLabel = React.useMemo(() => {
    if (customDateRange.start && customDateRange.end) {
      return `${format(customDateRange.start, "MMM d")} – ${format(customDateRange.end, "MMM d")}`;
    }
    if (customDateRange.start) {
      return format(customDateRange.start, "MMM d") + " – …";
    }
    return "Custom";
  }, [customDateRange]);

  const handleCustomRangeChange = (range: DateRange) => {
    setCustomDateRange(range);
    if (range.start && range.end) {
      setDateRange("custom");
      setCalendarOpen(false);
    }
  };
  const arrivalStatusPills = [
    { value: "all", label: "All" },
    { value: "on-shift", label: "On Shift" },
    { value: "late", label: "Late" },
    { value: "no-show", label: "No-show" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <>
      <div className="space-y-4">
        {/* Header — all controls in one border-bottom row */}
        <div className="flex items-end justify-between border-b border-neutral-200 pb-0 pt-4">
          <div className="pb-2">
            <h1 className="text-[20px] font-semibold text-neutral-900 leading-none">EVV</h1>
          </div>

          <div className="flex items-center gap-1.5 pb-2 flex-wrap justify-end">
            {/* Date pills */}
            <div className="flex gap-0.5">
              {datePills.map((p) =>
                p.value === "custom" ? (
                  <Popover key="custom" open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          setDateRange("custom");
                          setCalendarOpen(true);
                        }}
                        className={`flex items-center px-2.5 py-1 text-[12px] font-medium transition-colors rounded-md ${
                          dateRange === "custom"
                            ? "text-neutral-900"
                            : "text-neutral-400 hover:text-neutral-600"
                        }`}
                      >
                        {dateRange === "custom" ? customLabel : "Custom"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="p-0">
                      <DateRangePicker
                        value={customDateRange}
                        onChange={handleCustomRangeChange}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDateRange(p.value)}
                    className={`flex items-center px-2.5 py-1 text-[12px] font-medium transition-colors rounded-md ${
                      dateRange === p.value
                        ? "text-neutral-900"
                        : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {p.label}
                  </button>
                )
              )}
            </div>

            <div className="w-px h-4 bg-neutral-200" />

            {/* Filter dropdowns */}
            <Select value={arrivalStatusFilter} onValueChange={setArrivalStatusFilter}>
              <SelectTrigger className="h-7 w-[110px] rounded-md border-neutral-200 bg-white text-[12px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {arrivalStatusPills.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger className="h-7 w-[110px] rounded-md border-neutral-200 bg-white text-[12px]">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fundingSourceFilter} onValueChange={setFundingSourceFilter}>
              <SelectTrigger className="h-7 w-[110px] rounded-md border-neutral-200 bg-white text-[12px]">
                <SelectValue placeholder="Funding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funding</SelectItem>
                {fundingSources.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={gpsStatusFilter} onValueChange={setGpsStatusFilter}>
              <SelectTrigger className="h-7 w-[90px] rounded-md border-neutral-200 bg-white text-[12px]">
                <SelectValue placeholder="GPS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All GPS</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="outside">Outside</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-4 bg-neutral-200" />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
              <Input
                type="search"
                placeholder="Search…"
                className="pl-7 pr-3 h-7 w-[150px] bg-white border-neutral-200 text-[12px] placeholder:text-neutral-400 focus-visible:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-px h-4 bg-neutral-200" />

            {/* Action buttons */}
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[12px] font-medium border-neutral-200 bg-white hover:bg-neutral-50 gap-1.5" onClick={() => fetchVisits()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 text-neutral-400 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[12px] font-medium border-neutral-200 bg-white hover:bg-neutral-50 gap-1.5" onClick={handleBulkExport}>
              <Download className="h-3.5 w-3.5 text-neutral-400" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[12px] font-medium border-neutral-200 bg-white hover:bg-neutral-50 gap-1.5" onClick={() => router.push("/evv/timesheets")}>
              <CheckSquare className="h-3.5 w-3.5 text-neutral-400" />
              Timesheets
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[12px] font-medium border-neutral-200 bg-white hover:bg-neutral-50 gap-1.5" onClick={() => router.push("/evv/settings")}>
              <Settings className="h-3.5 w-3.5 text-neutral-400" />
              Settings
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <TimeClockKPIStrip
          totalVisits={kpis.totalVisits}
          pendingCount={kpis.pendingCount}
          verifiedCount={kpis.verifiedCount}
          exceptionCount={kpis.exceptionCount}
          onTimePercentage={kpis.onTimePercentage}
          pendingApprovalHours={kpis.pendingApprovalHours}
          activeFilter={verificationTab as "all" | "pending" | "verified" | "exception"}
          onFilterChange={setVerificationTab}
        />

        {/* Table card */}
        <Card className="p-0 overflow-hidden rounded-md">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              <p className="text-sm text-neutral-500">Loading visits...</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <XCircle className="h-10 w-10 text-red-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-900">Failed to load visits</p>
                <p className="text-xs text-neutral-500 mt-1">{fetchError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchVisits()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <TimeClockTable
              entries={filteredEntries}
              selectedEntries={selectedEntries}
              onSelectEntry={handleSelectEntry}
              onSelectAll={handleSelectAll}
              onRowClick={handleRowClick}
              activeFilters={{
                verificationTab,
                fundingSource: fundingSourceFilter !== "all" ? fundingSourceFilter : undefined,
              }}
            />
          )}
        </Card>

        {/* Detail Drawer */}
        <TimeClockDetailDrawer
          entry={selectedEntry}
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onApprove={handleApprove}
          onRequestCorrection={handleRequestCorrection}
          onOverride={handleOverride}
          onMarkNoShow={handleMarkNoShow}
          onResolveException={handleResolveException}
          onEntryUpdated={handleEntryUpdated}
        />
      </div>
    </>
  );
}
