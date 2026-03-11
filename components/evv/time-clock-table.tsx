"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, MapPin, FileSignature, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeClockEntry } from "@/lib/db/evv.mapper";

export type { TimeClockEntry };

interface TimeClockTableProps {
  entries: TimeClockEntry[];
  selectedEntries: string[];
  onSelectEntry: (id: string) => void;
  onSelectAll: () => void;
  onRowClick: (entry: TimeClockEntry) => void;
  activeFilters?: { verificationTab?: string; fundingSource?: string };
}

export function TimeClockTable({
  entries,
  selectedEntries,
  onSelectEntry,
  onSelectAll,
  onRowClick,
  activeFilters,
}: TimeClockTableProps) {
  const getVerificationBadge = (status: "pending" | "verified" | "exception") => {
    const variants: Record<"pending" | "verified" | "exception", { variant: "warning" | "positive" | "negative"; label: string }> = {
      pending:   { variant: "warning",  label: "Pending" },
      verified:  { variant: "positive", label: "Verified" },
      exception: { variant: "negative", label: "Exception" },
    };
    const config = variants[status];
    return (
      <Badge variant={config.variant} className="text-[10px] px-2 py-0.5 font-medium h-auto">
        {config.label}
      </Badge>
    );
  };

  const getGPSBadge = (status: "verified" | "outside" | "missing", distance?: number) => {
    if (status === "verified") {
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          <span className="text-[11px] text-neutral-600">Verified</span>
        </div>
      );
    }
    if (status === "outside") {
      return (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-[11px] text-amber-700">{distance ? `${distance}m out` : "Outside"}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <XCircle className="h-3.5 w-3.5 text-red-600" />
        <span className="text-[11px] text-neutral-500">Missing</span>
      </div>
    );
  };

  const getServiceBadge = (serviceType: string) => {
    return (
      <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-neutral-50 text-neutral-700 border-neutral-200">
        {serviceType}
      </Badge>
    );
  };

  const formatTime = (time?: string) => {
    if (!time) return "-";
    return new Date(time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes || minutes === 0) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRowBorderClass = (entry: TimeClockEntry) => {
    if (entry.verificationStatus === "exception") {
      const hasUnresolved = entry.exceptions.some(e => !e.is_resolved);
      return hasUnresolved ? "border-l-2 border-l-red-400" : "border-l-2 border-l-amber-400";
    }
    if (entry.verificationStatus === "pending") return "border-l-2 border-l-amber-400";
    return "";
  };

  const allSelected = entries.length > 0 && selectedEntries.length === entries.length;
  const someSelected = selectedEntries.length > 0 && !allSelected;

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="border-b border-black/5 bg-neutral-100">
            <tr>
              <th className="px-3 py-2 w-[40px] border-r">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all"
                  className={cn(someSelected && "data-[state=checked]:bg-neutral-400")}
                />
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">Status</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">Caregiver</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">Client</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">Service</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">Scheduled</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">Clock-In</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">Clock-Out</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">Duration</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">GPS</th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">Exceptions</th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-foreground uppercase tracking-wider">Notes/Sig</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 bg-white">
            {entries.map((entry) => {
              const isSelected = selectedEntries.includes(entry.id);
              return (
                <tr
                  key={entry.id}
                  className={cn(
                    "cursor-pointer bg-white transition-colors hover:bg-neutral-50",
                    getRowBorderClass(entry)
                  )}
                  onClick={() => onRowClick(entry)}
                >
                  <td className="px-3 py-2.5 border-r" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelectEntry(entry.id)}
                      aria-label={`Select ${entry.caregiver.name}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 border-r">
                    {getVerificationBadge(entry.verificationStatus)}
                  </td>
                  <td className="px-3 py-2.5 border-r">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={entry.caregiver.image} alt={entry.caregiver.name} />
                        <AvatarFallback className="text-[10px] bg-neutral-100 text-neutral-700">
                          {getInitials(entry.caregiver.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{entry.caregiver.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 border-r">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={entry.client.image} alt={entry.client.name} />
                        <AvatarFallback className="text-[10px] bg-neutral-100 text-neutral-700">
                          {getInitials(entry.client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{entry.client.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 border-r">
                    {getServiceBadge(entry.serviceType)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground border-r whitespace-nowrap">
                    {formatTime(entry.shiftTime.start)} - {formatTime(entry.shiftTime.end)}
                  </td>
                  <td className="px-3 py-2.5 text-xs border-r whitespace-nowrap">
                    {formatTime(entry.clockIn)}
                  </td>
                  <td className="px-3 py-2.5 text-xs border-r whitespace-nowrap">
                    {formatTime(entry.clockOut)}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-medium border-r whitespace-nowrap">
                    {formatDuration(entry.duration)}
                  </td>
                  <td className="px-3 py-2.5 border-r">
                    {getGPSBadge(entry.gpsStatus, entry.gpsDistance)}
                  </td>
                  <td className="px-3 py-2.5 border-r text-center">
                    {(() => {
                      const unresolvedCount = entry.exceptions.filter(e => !e.is_resolved).length;
                      if (unresolvedCount > 0) {
                        return (
                          <Badge variant="outline" className="h-auto bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0.5">
                            {unresolvedCount}
                          </Badge>
                        );
                      }
                      return <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />;
                    })()}
                  </td>
                  <td className="px-3 py-2.5 border-r">
                    <div className="flex items-center justify-center gap-2">
                      {entry.careNotesCompleted ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-neutral-300" />
                      )}
                      {entry.signatureCaptured ? (
                        <FileSignature className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <FileSignature className="h-3.5 w-3.5 text-neutral-300" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {entries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground px-4">
          <p className="text-sm font-medium">No visits match your filters</p>
          <p className="text-xs mt-1">
            {activeFilters?.verificationTab && activeFilters.verificationTab !== "all" && activeFilters?.fundingSource && activeFilters.fundingSource !== "all" ? (
              <>No {activeFilters.fundingSource} visits with status &quot;{activeFilters.verificationTab}&quot;. Try &quot;All&quot; for verification status to see {activeFilters.fundingSource} visits.</>
            ) : (
              <>Try adjusting your filters or selecting &quot;All&quot; for verification status</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
