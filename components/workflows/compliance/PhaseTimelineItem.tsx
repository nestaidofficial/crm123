"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Lock, AlertCircle } from "lucide-react";
import type { CompliancePhase, PhaseStatus } from "./types";
import { ProgressRing } from "./ProgressRing";
import { BlockerIndicator } from "./StatusBadge";

interface PhaseTimelineItemProps {
  phase: CompliancePhase;
  isActive: boolean;
  isLast: boolean;
  completionPercentage: number;
  blockerCount: number;
  onClick: () => void;
}

const phaseStatusIcons: Record<PhaseStatus, React.ComponentType<{ className?: string }>> = {
  complete: CheckCircle2,
  in_progress: Clock,
  locked: Lock,
  blocked: AlertCircle,
};

const phaseStatusColors: Record<PhaseStatus, { bg: string; border: string; text: string; line: string }> = {
  complete: {
    bg: "bg-green-500",
    border: "border-green-500",
    text: "text-green-600",
    line: "bg-green-500",
  },
  in_progress: {
    bg: "bg-blue-500",
    border: "border-blue-500",
    text: "text-blue-600",
    line: "bg-blue-200",
  },
  locked: {
    bg: "bg-gray-300",
    border: "border-gray-300",
    text: "text-gray-500",
    line: "bg-gray-200",
  },
  blocked: {
    bg: "bg-red-500",
    border: "border-red-500",
    text: "text-red-600",
    line: "bg-red-200",
  },
};

export function PhaseTimelineItem({
  phase,
  isActive,
  isLast,
  completionPercentage,
  blockerCount,
  onClick,
}: PhaseTimelineItemProps) {
  const Icon = phaseStatusIcons[phase.status];
  const colors = phaseStatusColors[phase.status];
  const isLocked = phase.status === "locked";

  return (
    <div className="relative">
      {/* Connecting line to next phase */}
      {!isLast && (
        <div
          className={cn(
            "absolute left-5 top-12 w-0.5 h-16",
            phase.status === "complete" ? colors.line : "bg-gray-200"
          )}
        />
      )}

      {/* Phase item */}
      <button
        type="button"
        onClick={onClick}
        disabled={isLocked}
        className={cn(
          "w-full text-left px-3 py-3 rounded-xl transition-all duration-200",
          isActive && "bg-slate-100 shadow-sm",
          !isActive && !isLocked && "hover:bg-slate-50",
          isLocked && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Phase icon/indicator */}
          <div className="relative flex-shrink-0">
            {phase.status === "in_progress" || phase.status === "blocked" ? (
              <div className="relative">
                <ProgressRing
                  percentage={completionPercentage}
                  size="sm"
                  color={phase.status === "blocked" ? "red" : "blue"}
                  showPercentage={false}
                />
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  phase.status === "complete" ? colors.bg : "bg-gray-200"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    phase.status === "complete" ? "text-white" : colors.text
                  )}
                />
              </div>
            )}

            {/* Blocker indicator */}
            {blockerCount > 0 && (
              <div className="absolute -top-1 -right-1">
                <BlockerIndicator count={blockerCount} />
              </div>
            )}
          </div>

          {/* Phase info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "bg-slate-200 text-slate-600"
                )}
              >
                Phase {phase.phaseNumber}
              </span>
              {phase.status === "complete" && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </div>
            <h4
              className={cn(
                "text-sm font-semibold mt-1 truncate",
                isActive ? "text-slate-900" : "text-slate-700",
                isLocked && "text-slate-500"
              )}
            >
              {phase.phaseName}
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {phase.goal}
            </p>

            {/* Progress bar (only for non-locked phases) */}
            {!isLocked && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">
                    {phase.steps.filter((s) => s.status === "verified").length}/
                    {phase.steps.length} steps
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      completionPercentage === 100 ? "text-green-600" : colors.text
                    )}
                  >
                    {Math.round(completionPercentage)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      phase.status === "complete"
                        ? "bg-green-500"
                        : phase.status === "blocked"
                        ? "bg-red-500"
                        : "bg-blue-500"
                    )}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Locked message */}
            {isLocked && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Complete previous phase</span>
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
