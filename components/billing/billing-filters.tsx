"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRangePicker, DateRange } from "@/components/billing/date-range-picker";
import { Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BillingFiltersProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  customDateRange: DateRange;
  onCustomDateRangeChange: (range: DateRange) => void;
  status: string;
  onStatusChange: (status: string) => void;
  serviceType: string;
  onServiceTypeChange: (type: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

const dateRanges = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

const statuses = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "voided", label: "Voided" },
];

export function BillingFilters({
  dateRange,
  onDateRangeChange,
  customDateRange,
  onCustomDateRangeChange,
  status,
  onStatusChange,
  serviceType,
  onServiceTypeChange,
  searchQuery,
  onSearchChange,
  onClearFilters,
}: BillingFiltersProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const hasActiveFilters =
    dateRange !== "month" ||
    status !== "all" ||
    serviceType !== "all" ||
    searchQuery !== "";

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
    onCustomDateRangeChange(range);
    if (range.start && range.end) {
      onDateRangeChange("custom");
      setCalendarOpen(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Date range pills */}
        <div className="flex items-center gap-1.5 rounded-full border border-black/5 bg-neutral-50/50 p-0.5">
          {dateRanges.map((range) =>
            range.value === "custom" ? (
              <Popover key="custom" open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      onDateRangeChange("custom");
                      setCalendarOpen(true);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      dateRange === "custom"
                        ? "bg-neutral-100 text-neutral-900"
                        : "bg-transparent text-muted-foreground hover:bg-white hover:text-neutral-900"
                    )}
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
                key={range.value}
                type="button"
                onClick={() => onDateRangeChange(range.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  range.value === dateRange
                    ? "bg-neutral-100 text-neutral-900"
                    : "bg-transparent text-muted-foreground hover:bg-white hover:text-neutral-900"
                )}
              >
                {range.label}
              </button>
            )
          )}
        </div>

        {/* Status / Service — compact dropdowns */}
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 w-[130px] rounded-full border border-black/5 bg-white text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={serviceType || "all"} onValueChange={onServiceTypeChange}>
          <SelectTrigger className="h-8 w-[130px] rounded-full border border-black/5 bg-white text-xs">
            <SelectValue placeholder="Service Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="personal-care">Personal Care</SelectItem>
            <SelectItem value="companionship">Companionship</SelectItem>
            <SelectItem value="nursing">Nursing</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice # or client..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 rounded-full border-black/5 bg-white pl-8 text-xs"
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onCustomDateRangeChange({ start: null, end: null });
              onClearFilters();
            }}
            className="h-8 text-xs text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
