"use client";

import { cn } from "@/lib/utils";

type VerificationFilter = "all" | "pending" | "verified" | "exception";

interface TimeClockKPIStripProps {
  totalVisits: number;
  pendingCount: number;
  verifiedCount: number;
  exceptionCount: number;
  onTimePercentage: number;
  pendingApprovalHours: number;
  activeFilter?: VerificationFilter;
  onFilterChange?: (filter: VerificationFilter) => void;
}

export function TimeClockKPIStrip({
  totalVisits,
  pendingCount,
  verifiedCount,
  exceptionCount,
  onTimePercentage,
  pendingApprovalHours,
  activeFilter = "all",
  onFilterChange,
}: TimeClockKPIStripProps) {
  const clickable = !!onFilterChange;

  const cardBase =
    "rounded-md border border-black/5 bg-white px-4 py-3 transition-all";
  const interactiveCard = "cursor-pointer select-none hover:border-neutral-300";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
      {/* Total Visits — filter: all */}
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => onFilterChange?.("all")}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onFilterChange?.("all")}
        className={cn(cardBase, clickable && interactiveCard)}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Visits</span>
          <span className="text-2xl font-bold text-neutral-900">{totalVisits}</span>
        </div>
      </div>

      {/* Pending — filter: pending */}
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => onFilterChange?.("pending")}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onFilterChange?.("pending")}
        className={cn(cardBase, clickable && interactiveCard)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</span>
          </div>
          <span className="text-2xl font-bold text-amber-600">{pendingCount}</span>
        </div>
      </div>

      {/* Verified — filter: verified */}
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => onFilterChange?.("verified")}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onFilterChange?.("verified")}
        className={cn(cardBase, clickable && interactiveCard)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Verified</span>
          </div>
          <span className="text-2xl font-bold text-green-600">{verifiedCount}</span>
        </div>
      </div>

      {/* Exceptions — filter: exception */}
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => onFilterChange?.("exception")}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onFilterChange?.("exception")}
        className={cn(cardBase, clickable && interactiveCard)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Exceptions</span>
          </div>
          <span className="text-2xl font-bold text-red-600">{exceptionCount}</span>
        </div>
      </div>

      {/* On-Time % — not filterable */}
      <div className={cardBase}>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">On-Time %</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-neutral-900">{onTimePercentage}</span>
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Pending Hours — not filterable */}
      <div className={cardBase}>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending Hours</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-neutral-900">{pendingApprovalHours.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
