"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="border-t border-neutral-200/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-neutral-50/80 [&>th]:border-t-0 hover:bg-neutral-50/80">
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Select all"
                className={cn(someSelected && "data-[state=checked]:bg-neutral-400")}
              />
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Caregiver</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Client</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Service</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Scheduled</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Clock-In</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Clock-Out</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Duration</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider">GPS</TableHead>
            <TableHead className="text-center text-[10px] font-semibold uppercase tracking-wider">Exceptions</TableHead>
            <TableHead className="text-center text-[10px] font-semibold uppercase tracking-wider">Notes/Sig</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center">
                <p className="text-sm font-medium text-muted-foreground">No visits match your filters</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {activeFilters?.verificationTab && activeFilters.verificationTab !== "all" && activeFilters?.fundingSource && activeFilters.fundingSource !== "all" ? (
                    <>No {activeFilters.fundingSource} visits with status &quot;{activeFilters.verificationTab}&quot;. Try &quot;All&quot; for verification status to see {activeFilters.fundingSource} visits.</>
                  ) : (
                    <>Try adjusting your filters or selecting &quot;All&quot; for verification status</>
                  )}
                </p>
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => {
              const isSelected = selectedEntries.includes(entry.id);
              return (
                <TableRow
                  key={entry.id}
                  className={cn(
                    "cursor-pointer hover:bg-neutral-50/60",
                    getRowBorderClass(entry)
                  )}
                  onClick={() => onRowClick(entry)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelectEntry(entry.id)}
                      aria-label={`Select ${entry.caregiver.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {getVerificationBadge(entry.verificationStatus)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={entry.caregiver.image} alt={entry.caregiver.name} />
                        <AvatarFallback className="text-[10px] bg-neutral-100 text-neutral-700">
                          {getInitials(entry.caregiver.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{entry.caregiver.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={entry.client.image} alt={entry.client.name} />
                        <AvatarFallback className="text-[10px] bg-neutral-100 text-neutral-700">
                          {getInitials(entry.client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{entry.client.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getServiceBadge(entry.serviceType)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(entry.shiftTime.start)} - {formatTime(entry.shiftTime.end)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatTime(entry.clockIn)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatTime(entry.clockOut)}
                  </TableCell>
                  <TableCell className="text-xs font-medium whitespace-nowrap">
                    {formatDuration(entry.duration)}
                  </TableCell>
                  <TableCell>
                    {getGPSBadge(entry.gpsStatus, entry.gpsDistance)}
                  </TableCell>
                  <TableCell className="text-center">
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
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
