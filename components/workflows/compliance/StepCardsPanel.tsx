"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ListChecks, AlertCircle, CheckCircle2 } from "lucide-react";
import type { CompliancePhase, ComplianceStep, StepStatus } from "./types";
import { StepCard } from "./StepCard";
import { usePhaseProgress } from "./usePhaseProgress";

interface StepCardsPanelProps {
  phase: CompliancePhase | null;
  activeStepId: string | null;
  onStepSelect: (stepId: string) => void;
  onStepStatusChange: (phaseId: string, stepId: string, status: StepStatus) => void;
  onStepUpload: (stepId: string) => void;
  onStepSendForm: (stepId: string) => void;
  onStepDeleteDocument?: (stepId: string) => void;
  onOpenVault?: (stepId: string) => void;
  className?: string;
  hideHeader?: boolean;
}

export function StepCardsPanel({
  phase,
  activeStepId,
  onStepSelect,
  onStepStatusChange,
  onStepUpload,
  onStepSendForm,
  onStepDeleteDocument,
  className,
  hideHeader = false,
}: StepCardsPanelProps) {
  if (!phase) {
    return (
      <div className={cn("rounded-2xl border border-black/5 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]", className)}>
        <div className="py-16 text-center px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <ListChecks className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            Select a Phase
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Choose a phase from the timeline to view and manage its steps
          </p>
        </div>
      </div>
    );
  }

  // Calculate phase stats
  const verifiedCount = phase.steps.filter((s) => s.status === "verified").length;
  const blockedCount = phase.steps.filter((s) => s.status === "blocked").length;
  const waitingCount = phase.steps.filter((s) => s.status === "waiting").length;
  const uploadedCount = phase.steps.filter((s) => s.status === "uploaded").length;

  return (
    <div className={cn(!hideHeader && "rounded-2xl border border-black/5 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]", className)}>
      {/* Phase header — suppressed when used inside a unified outer card */}
      {!hideHeader && (
        <div className="px-5 pt-5 pb-3 border-b border-black/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-slate-900 text-white border-0 text-[10px]">
                  Phase {phase.phaseNumber}
                </Badge>
                {phase.status === "complete" && (
                  <Badge className="bg-neutral-100 text-neutral-900 border-0 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                )}
                {phase.status === "blocked" && (
                  <Badge className="bg-neutral-200 text-neutral-900 border-0 text-[10px]">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Blocked
                  </Badge>
                )}
              </div>
              <h3 className="text-base font-semibold text-neutral-900">{phase.phaseName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{phase.goal}</p>
            </div>

            {/* Phase stats */}
            <div className="flex items-center gap-3 text-xs">
              {verifiedCount > 0 && (
                <div className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{verifiedCount} verified</span>
                </div>
              )}
              {blockedCount > 0 && (
                <div className="flex items-center gap-1 text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{blockedCount} blocked</span>
                </div>
              )}
              {uploadedCount > 0 && (
                <div className="flex items-center gap-1 text-blue-700">
                  <span>{uploadedCount} uploaded</span>
                </div>
              )}
              {waitingCount > 0 && (
                <div className="flex items-center gap-1 text-amber-700">
                  <span>{waitingCount} waiting</span>
                </div>
              )}
            </div>
          </div>

          {/* Phase complete banner */}
          {phase.status === "complete" && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-green-50/80">
              <div className="p-1.5 bg-neutral-100 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-green-900">Phase Complete</p>
                <p className="text-[10px] text-green-700 mt-0.5">
                  All {phase.steps.length} steps have been verified
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase complete banner (shown when header is hidden) */}
      {hideHeader && phase.status === "complete" && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-green-50/80 border border-green-100">
          <div className="p-1.5 bg-neutral-100 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-700" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-green-900">Phase Complete</p>
            <p className="text-[10px] text-green-700 mt-0.5">
              All {phase.steps.length} steps have been verified
            </p>
          </div>
        </div>
      )}

      {/* Steps list */}
      <div className={cn("space-y-2", hideHeader ? "" : "p-4")}>
        {phase.steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            isActive={activeStepId === step.id}
            onSelect={() => onStepSelect(step.id)}
            onStatusChange={(status) => onStepStatusChange(phase.id, step.id, status)}
            onUpload={() => onStepUpload(step.id)}
            onSendForm={() => onStepSendForm(step.id)}
            onDeleteDocument={onStepDeleteDocument ? () => onStepDeleteDocument(step.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
