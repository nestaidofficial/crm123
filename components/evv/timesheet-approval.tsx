"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Lock, AlertTriangle } from "lucide-react";
import { TimeClockEntry } from "./time-clock-table";
import { cn } from "@/lib/utils";

interface TimesheetApprovalProps {
  entries: TimeClockEntry[];
  onApproveAll: (entries: TimeClockEntry[]) => void;
  onApproveSelected: (entries: TimeClockEntry[]) => void;
  onLockEntries: (entries: TimeClockEntry[]) => void;
}

export function TimesheetApproval({
  entries,
  onApproveAll,
  onApproveSelected,
  onLockEntries,
}: TimesheetApprovalProps) {
  const [selectedEntries, setSelectedEntries] = React.useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = React.useState<"caregiver" | "client">("caregiver");

  const formatTime = (time?: string) => {
    if (!time) return "-";
    return new Date(time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return "0h";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const calculateTotalHours = (entry: TimeClockEntry) => {
    if (!entry.clockIn || !entry.clockOut) return 0;
    const start = new Date(entry.clockIn);
    const end = new Date(entry.clockOut);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins - entry.breaks;
  };

  const groupedEntries = React.useMemo(() => {
    const groups = new Map<string, TimeClockEntry[]>();
    
    entries.forEach(entry => {
      const key = groupBy === "caregiver" 
        ? entry.caregiver.id 
        : entry.client.id;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });

    return Array.from(groups.entries()).map(([key, entries]) => ({
      key,
      name: groupBy === "caregiver" ? entries[0].caregiver.name : entries[0].client.name,
      entries,
      totalHours: entries.reduce((sum, e) => sum + calculateTotalHours(e), 0),
    }));
  }, [entries, groupBy]);

  const toggleEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const toggleAll = () => {
    if (selectedEntries.size === entries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(entries.map(e => e.id)));
    }
  };

  const handleApproveSelected = () => {
    const toApprove = entries.filter(e => selectedEntries.has(e.id));
    onApproveSelected(toApprove);
    setSelectedEntries(new Set());
  };

  const handleApproveAll = () => {
    onApproveAll(entries);
    setSelectedEntries(new Set());
  };

  const handleLockSelected = () => {
    const toLock = entries.filter(e => selectedEntries.has(e.id));
    onLockEntries(toLock);
  };

  const verifiedEntries = entries.filter(e => 
    e.gpsStatus === "verified" && 
    e.arrivalStatus !== "no-show" &&
    e.clockIn && 
    e.clockOut
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Timesheet Approval</CardTitle>
            <CardDescription className="text-xs mt-1">
              Review and approve verified hours
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as "caregiver" | "client")}>
              <TabsList className="h-8">
                <TabsTrigger value="caregiver" className="text-xs">By Caregiver</TabsTrigger>
                <TabsTrigger value="client" className="text-xs">By Client</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedEntries.size === entries.length && entries.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedEntries.size} selected
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {verifiedEntries.length} verified entries ready for approval
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleApproveSelected}
                disabled={selectedEntries.size === 0}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleApproveAll}
                disabled={verifiedEntries.length === 0}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve All Verified
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLockSelected}
                disabled={selectedEntries.size === 0}
              >
                <Lock className="mr-2 h-4 w-4" />
                Lock Selected
              </Button>
            </div>
          </div>

          {/* Grouped Entries */}
          <div className="space-y-4">
            {groupedEntries.map((group) => (
              <div key={group.key} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{group.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <div className="text-sm font-semibold">
                    Total: {formatDuration(group.totalHours)}
                  </div>
                </div>
                <div className="divide-y">
                  {group.entries.map((entry) => {
                    const totalMins = calculateTotalHours(entry);
                    const isSelected = selectedEntries.has(entry.id);
                    const hasFlags = entry.timesheetStatus === "flagged" || 
                                   entry.gpsStatus !== "verified" ||
                                   entry.arrivalStatus === "late";

                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "px-4 py-3 flex items-center gap-4 hover:bg-muted/50 transition-colors",
                          isSelected && "bg-muted/30"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEntry(entry.id)}
                        />
                        <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="font-medium">
                              {groupBy === "caregiver" ? entry.client.name : entry.caregiver.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(entry.shiftTime.start)} - {formatTime(entry.shiftTime.end)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Service</div>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-neutral-50 text-neutral-700 border-neutral-200 mt-0.5">
                              {entry.serviceType}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Funding</div>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-neutral-50 text-neutral-700 border-neutral-200 mt-0.5">
                              {entry.fundingSource}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Hours</div>
                            <div className="font-medium">{formatDuration(totalMins)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Status</div>
                            <div className="flex gap-1 mt-0.5">
                              {entry.verificationStatus === "verified" ? (
                                <Badge variant="outline" className="bg-green-50 text-green-900 border-green-200 text-[10px]">
                                  Verified
                                </Badge>
                              ) : entry.verificationStatus === "exception" ? (
                                <Badge variant="outline" className="bg-red-50 text-red-900 border-red-200 text-[10px]">
                                  Exception
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 text-[10px]">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {groupedEntries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No timesheet entries to approve</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
