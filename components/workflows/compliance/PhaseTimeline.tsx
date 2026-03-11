"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Workflow } from "lucide-react";
import type { CompliancePhase } from "./types";
import { PhaseTimelineItem } from "./PhaseTimelineItem";
import { usePhaseProgress } from "./usePhaseProgress";

interface PhaseTimelineProps {
  phases: CompliancePhase[];
  activePhaseId: string | null;
  onPhaseSelect: (phaseId: string) => void;
  className?: string;
}

export function PhaseTimeline({
  phases,
  activePhaseId,
  onPhaseSelect,
  className,
}: PhaseTimelineProps) {
  const { phaseProgress, totalProgress } = usePhaseProgress(phases);

  // Count phases by status
  const completedPhases = phases.filter((p) => p.status === "complete").length;
  const blockedPhases = phases.filter((p) => p.status === "blocked").length;

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] h-full",
        className
      )}
    >
      <div className="px-4 pt-4 pb-3 border-b border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-neutral-100">
              <Workflow className="h-4 w-4 text-neutral-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Phases</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {completedPhases}/{phases.length} complete
              </p>
            </div>
          </div>
          {blockedPhases > 0 && (
            <Badge className="bg-neutral-200 text-neutral-900 border-0 text-[10px]">
              {blockedPhases} blocked
            </Badge>
          )}
        </div>

        {/* Overall progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold text-neutral-800">
              {totalProgress.completed}/{totalProgress.total} steps
            </span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                totalProgress.percentage === 100
                  ? "bg-green-500"
                  : "bg-neutral-600"
              )}
              style={{ width: `${totalProgress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="space-y-2">
          {phases.map((phase, index) => {
            const progress = phaseProgress.get(phase.id);
            return (
              <PhaseTimelineItem
                key={phase.id}
                phase={phase}
                isActive={activePhaseId === phase.id}
                isLast={index === phases.length - 1}
                completionPercentage={progress?.percentage ?? 0}
                blockerCount={progress?.blockerCount ?? 0}
                onClick={() => {
                  if (phase.status !== "locked") {
                    onPhaseSelect(phase.id);
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compact horizontal phase timeline for mobile/header
interface CompactPhaseTimelineProps {
  phases: CompliancePhase[];
  activePhaseId: string | null;
  onPhaseSelect: (phaseId: string) => void;
  className?: string;
}

export function CompactPhaseTimeline({
  phases,
  activePhaseId,
  onPhaseSelect,
  className,
}: CompactPhaseTimelineProps) {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto pb-2", className)}>
      {phases.map((phase, index) => {
        const isActive = activePhaseId === phase.id;
        const isComplete = phase.status === "complete";
        const isLocked = phase.status === "locked";
        const isBlocked = phase.status === "blocked";

        return (
          <button
            key={phase.id}
            onClick={() => !isLocked && onPhaseSelect(phase.id)}
            disabled={isLocked}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              isActive && "bg-slate-900 text-white",
              !isActive && isComplete && "bg-neutral-100 text-neutral-900",
              !isActive && isBlocked && "bg-neutral-200 text-neutral-900",
              !isActive && !isComplete && !isLocked && !isBlocked && "bg-slate-100 text-slate-700 hover:bg-slate-200",
              isLocked && "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            <span className="mr-1">{phase.phaseNumber}.</span>
            {phase.phaseName}
          </button>
        );
      })}
    </div>
  );
}
