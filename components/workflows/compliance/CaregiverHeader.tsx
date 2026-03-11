"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  MoreVertical,
  Rocket,
  Check,
  FolderOpen,
  Eye,
} from "lucide-react";
import type { CaregiverInfo, CompliancePhase } from "./types";
import { usePhaseProgress } from "./usePhaseProgress";
import { useComplianceGates } from "./useComplianceGates";

function daysUntilStart(startDateStr: string): number | null {
  try {
    const start = new Date(startDateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    const diffMs = start.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

interface CaregiverHeaderProps {
  caregiver: CaregiverInfo;
  phases: CompliancePhase[];
  activePhaseId: string | null;
  onPhaseSelect: (phaseId: string) => void;
  onAuditModeOpen: () => void;
  onVaultOpen?: () => void;
  className?: string;
}

export function CaregiverHeader({
  caregiver,
  phases,
  activePhaseId,
  onPhaseSelect,
  onAuditModeOpen,
  onVaultOpen,
  className,
}: CaregiverHeaderProps) {
  const { totalProgress } = usePhaseProgress(phases);
  const { overallStatus } = useComplianceGates(phases);
  const daysUntil = daysUntilStart(caregiver.startDate);

  const statusTag =
    overallStatus === "ready_to_assign"
      ? "Ready"
      : overallStatus === "blocked"
        ? "Blocked"
        : "Draft";

  return (
    <Card
      className={cn(
        "border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/70 overflow-hidden",
        className
      )}
    >
      <CardContent className="p-5 space-y-4">
        {/* Row 1: Profile + Actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 min-w-0">
            <Avatar className="h-14 w-14 rounded-full shrink-0 bg-gradient-to-br from-slate-600 to-slate-800">
              <AvatarFallback className="rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white text-lg font-semibold">
                {caregiver.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {caregiver.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {caregiver.title}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    "border-slate-200 bg-white text-slate-600"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {statusTag}
                </span>
                {daysUntil !== null && daysUntil > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    <Rocket className="h-3 w-3 text-red-500" />
                    Start in {daysUntil} {daysUntil === 1 ? "Day" : "Days"}
                  </span>
                )}
                {daysUntil !== null && daysUntil <= 0 && daysUntil >= -7 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    <Rocket className="h-3 w-3" />
                    Started
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full border-slate-200"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onVaultOpen && (
                  <DropdownMenuItem onClick={onVaultOpen}>
                    <FolderOpen className="h-3.5 w-3.5 mr-2" />
                    Compliance Vault
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onAuditModeOpen}>
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  Enter Audit Mode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Horizontal phase progress tracker */}
        <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-hide">
          {phases.map((phase, index) => {
            const completed = phase.status === "complete";
            const isActive = activePhaseId === phase.id;
            const isLocked = phase.status === "locked";
            const canSelect = !isLocked;

            return (
              <div key={phase.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => canSelect && onPhaseSelect(phase.id)}
                  disabled={!canSelect}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all",
                    "border-2 whitespace-nowrap",
                    completed &&
                      "border-blue-500 bg-blue-500 text-white hover:bg-blue-600",
                    isActive &&
                      !completed &&
                      "border-blue-400 bg-transparent text-blue-700 hover:bg-blue-50/50",
                    !completed &&
                      !isActive &&
                      !isLocked &&
                      "border-slate-200 bg-transparent text-slate-600 hover:border-slate-300",
                    isLocked &&
                      "cursor-not-allowed border-slate-200 bg-transparent text-slate-400"
                  )}
                >
                  {completed ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 rounded-full border-2",
                        isActive &&
                          !isLocked &&
                          "border-blue-400 bg-transparent",
                        !isActive &&
                          !isLocked &&
                          "border-slate-300 bg-transparent",
                        isLocked && "border-slate-200 bg-slate-50"
                      )}
                    />
                  )}
                  <span className="max-w-[140px] truncate">{phase.phaseName}</span>
                </button>
                {index < phases.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-3 shrink-0 mx-0.5 rounded-full",
                      completed ? "bg-blue-500" : "bg-slate-200"
                    )}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span>
            {totalProgress.completed}/{totalProgress.total} steps completed
          </span>
          <span className="font-semibold text-slate-700">
            {Math.round(totalProgress.percentage)}% complete
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
