"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimesheetEntry } from "@/lib/db/evv.mapper";
import { exportTimesheetsToCSV, exportTimesheetsToJSON, exportWeeklySummaryToCSV } from "@/lib/export-timesheet";
import { toast } from "sonner";

// Helper functions for week calculations
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

function formatWeekRange(monday: Date): string {
  const sunday = getSunday(monday);
  return `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function getThisWeekMonday(): Date {
  return getMonday(new Date());
}

export default function TimesheetsPage() {
  const [entries, setEntries] = React.useState<TimesheetEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedEntries, setSelectedEntries] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState<"all" | "unpaid" | "paid">("all");
  const [currentWeekStart, setCurrentWeekStart] = React.useState(getThisWeekMonday());

  // Summary stats
  const [summary, setSummary] = React.useState({
    totalHours: 0,
    totalPay: 0,
    shiftCount: 0,
    unpaidCount: 0,
    paidCount: 0,
  });

  // Fetch timesheets
  const fetchTimesheets = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      const weekEnd = getSunday(currentWeekStart);
      const params = new URLSearchParams({
        startDate: currentWeekStart.toISOString().split("T")[0],
        endDate: weekEnd.toISOString().split("T")[0],
        timesheetStatus: "approved",
      });

      if (searchQuery) {
        params.append("q", searchQuery);
      }

      if (paymentStatusFilter !== "all") {
        params.append("paymentStatus", paymentStatusFilter);
      }

      const response = await fetch(`/api/evv/timesheets?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch timesheets");
      }

      const result = await response.json();
      setEntries(result.data ?? []);
      setSummary(result.summary ?? { totalHours: 0, totalPay: 0, shiftCount: 0, unpaidCount: 0, paidCount: 0 });
    } catch (err) {
      console.error("Failed to fetch timesheets:", err);
      toast.error("Failed to load timesheets");
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekStart, searchQuery, paymentStatusFilter]);

  React.useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  // Group entries by week
  const weeklyGroups = React.useMemo(() => {
    const groups = new Map<string, TimesheetEntry[]>();
    
    entries.forEach((entry) => {
      const key = entry.weekStart;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });

    return Array.from(groups.entries())
      .map(([weekStart, entries]) => {
        const totalHours = entries.reduce((sum, e) => sum + e.billableHours, 0);
        const totalPay = entries.reduce((sum, e) => sum + e.payAmount, 0);
        return {
          weekStart,
          weekEnd: entries[0].weekEnd,
          entries: entries.sort((a, b) => a.shiftDate.localeCompare(b.shiftDate)),
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalPay: parseFloat(totalPay.toFixed(2)),
        };
      })
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }, [entries]);

  // Toggle selection
  const toggleEntry = (id: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEntries(newSelected);
  };

  const toggleAll = () => {
    if (selectedEntries.size === entries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(entries.map((e) => e.id)));
    }
  };

  // Mark as paid
  const handleMarkAsPaid = async () => {
    if (selectedEntries.size === 0) return;

    try {
      const response = await fetch("/api/evv/timesheets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedEntries),
          paymentStatus: "paid",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update payment status");
      }

      toast.success(`Marked ${selectedEntries.size} shift(s) as paid`);
      setSelectedEntries(new Set());
      fetchTimesheets();
    } catch (err) {
      console.error("Failed to mark as paid:", err);
      toast.error("Failed to update payment status");
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    const selectedData = entries.filter((e) => selectedEntries.has(e.id));
    const dataToExport = selectedData.length > 0 ? selectedData : entries;
    
    exportTimesheetsToCSV(dataToExport, {
      filename: `timesheets_${currentWeekStart.toISOString().split("T")[0]}.csv`,
    });
    
    toast.success(`Exported ${dataToExport.length} timesheet(s) to CSV`);
  };

  const handleExportJSON = () => {
    const selectedData = entries.filter((e) => selectedEntries.has(e.id));
    const dataToExport = selectedData.length > 0 ? selectedData : entries;
    
    const weekEnd = getSunday(currentWeekStart);
    exportTimesheetsToJSON(dataToExport, {
      filename: `timesheets_${currentWeekStart.toISOString().split("T")[0]}.json`,
      metadata: {
        dateRange: {
          start: currentWeekStart.toISOString().split("T")[0],
          end: weekEnd.toISOString().split("T")[0],
        },
        summary,
      },
    });
    
    toast.success(`Exported ${dataToExport.length} timesheet(s) to JSON`);
  };

  const handleExportWeeklySummary = () => {
    exportWeeklySummaryToCSV(weeklyGroups, {
      filename: `weekly_summary_${currentWeekStart.toISOString().split("T")[0]}.csv`,
    });
    
    toast.success("Exported weekly summary to CSV");
  };

  // Week navigation
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToThisWeek = () => {
    setCurrentWeekStart(getThisWeekMonday());
  };

  const isThisWeek = currentWeekStart.toDateString() === getThisWeekMonday().toDateString();

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatTime = (isoTimestamp: string) => {
    return new Date(isoTimestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatPayRate = (rate: number, type: "hourly" | "salary" | "per-visit") => {
    if (type === "salary") return `${formatCurrency(rate)}/yr`;
    if (type === "per-visit") return `${formatCurrency(rate)}/visit`;
    return `${formatCurrency(rate)}/hr`;
  };

  const formatAddress = (address: { street: string; city: string; state: string; zip: string }) => {
    return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Caregiver Timesheets</h1>
        <p className="text-xs text-neutral-500 font-normal mt-0.5">
          Track approved shifts, hours, and payment status
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Total Shifts</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{summary.shiftCount}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Total Hours</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{summary.totalHours.toFixed(1)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Total Pay</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{formatCurrency(summary.totalPay)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Unpaid</p>
          <p className="text-2xl font-semibold text-amber-600 mt-1">{summary.unpaidCount}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Paid</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{summary.paidCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* Top row: Week picker + Search */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-200 bg-neutral-50 min-w-[200px]">
                <CalendarIcon className="h-4 w-4 text-neutral-400" />
                <span className="text-sm font-medium text-neutral-900">
                  {formatWeekRange(currentWeekStart)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isThisWeek && (
                <Button variant="outline" size="sm" onClick={goToThisWeek} className="h-8 text-xs">
                  This Week
                </Button>
              )}
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <Input
                type="search"
                placeholder="Search caregiver..."
                className="h-8 rounded-full border-neutral-200 bg-white pl-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Bottom row: Filters + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 rounded-full border border-neutral-200 bg-neutral-50/50 p-0.5">
              {(["all", "unpaid", "paid"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPaymentStatusFilter(status)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    paymentStatusFilter === status
                      ? "bg-neutral-100 text-neutral-900"
                      : "bg-transparent text-neutral-600 hover:bg-white hover:text-neutral-900"
                  )}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {selectedEntries.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAsPaid}
                  className="h-8 text-xs"
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Mark as Paid ({selectedEntries.size})
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    Export CSV {selectedEntries.size > 0 && `(${selectedEntries.size} selected)`}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJSON}>
                    Export JSON {selectedEntries.size > 0 && `(${selectedEntries.size} selected)`}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportWeeklySummary}>
                    Export Weekly Summary
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            <p className="text-sm text-neutral-500">Loading timesheets...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-sm font-medium text-neutral-900">No timesheets found</p>
            <p className="text-xs text-neutral-500">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-black/5 bg-neutral-100">
                <tr>
                  <th className="px-3 py-2 w-[40px] border-r">
                    <Checkbox
                      checked={entries.length > 0 && selectedEntries.size === entries.length}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Caregiver
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Client
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Address
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Clock In
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Clock Out
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Break
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Hours
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Pay Rate
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                    Pay Amount
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 bg-white">
                {weeklyGroups.map((week, weekIndex) => (
                  <React.Fragment key={week.weekStart}>
                    {week.entries.map((entry, entryIndex) => {
                      const isSelected = selectedEntries.has(entry.id);
                      return (
                        <tr
                          key={entry.id}
                          className={cn(
                            "cursor-pointer bg-white transition-colors hover:bg-neutral-50",
                            isSelected && "bg-neutral-50"
                          )}
                        >
                          <td className="px-3 py-2.5 border-r" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleEntry(entry.id)}
                              aria-label={`Select ${entry.caregiver.name}`}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium border-r whitespace-nowrap">
                            {formatDate(entry.shiftDate)}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium border-r">
                            {entry.caregiver.name}
                          </td>
                          <td className="px-3 py-2.5 text-xs border-r">{entry.client.name}</td>
                          <td className="px-3 py-2.5 text-xs text-neutral-600 border-r max-w-[200px] truncate">
                            {formatAddress(entry.client.address)}
                          </td>
                          <td className="px-3 py-2.5 text-xs border-r whitespace-nowrap">
                            {formatTime(entry.clockIn)}
                          </td>
                          <td className="px-3 py-2.5 text-xs border-r whitespace-nowrap">
                            {formatTime(entry.clockOut)}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right border-r">
                            {entry.breakMinutes} min
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-medium border-r">
                            {entry.billableHours.toFixed(2)}
                            {entry.overtimeHours > 0 && (
                              <span className="text-[10px] text-amber-600 ml-1">
                                (+{entry.overtimeHours.toFixed(1)} OT)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right border-r">
                            {formatPayRate(entry.caregiver.payRate, entry.caregiver.payType)}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-medium border-r">
                            {formatCurrency(entry.payAmount)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-2 py-0.5",
                                entry.paymentStatus === "paid"
                                  ? "bg-green-50 text-green-900 border-green-200"
                                  : entry.paymentStatus === "processing"
                                  ? "bg-blue-50 text-blue-900 border-blue-200"
                                  : "bg-amber-50 text-amber-900 border-amber-200"
                              )}
                            >
                              {entry.paymentStatus
                                ? entry.paymentStatus.charAt(0).toUpperCase() + entry.paymentStatus.slice(1)
                                : "Unpaid"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Week Summary Row */}
                    <tr className="bg-neutral-50 font-semibold border-t-2 border-neutral-200">
                      <td className="px-3 py-2 border-r"></td>
                      <td className="px-3 py-2 text-xs border-r" colSpan={7}>
                        Week Total ({formatDate(week.weekStart)} - {formatDate(week.weekEnd)})
                      </td>
                      <td className="px-3 py-2 text-xs text-right border-r">
                        {week.totalHours.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right border-r"></td>
                      <td className="px-3 py-2 text-xs text-right border-r">
                        {formatCurrency(week.totalPay)}
                      </td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
