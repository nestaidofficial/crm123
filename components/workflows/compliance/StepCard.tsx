"use client";

import { cn } from "@/lib/utils";
import { Shield, Clock, FileText } from "lucide-react";
import type { ComplianceStep, StepStatus } from "./types";
import { StatusBadge } from "./StatusBadge";
import { StepCardActions } from "./StepCardActions";
import { StepCardDocuments } from "./StepCardDocuments";

interface StepCardProps {
  step: ComplianceStep;
  isActive: boolean;
  onSelect: () => void;
  onStatusChange: (status: StepStatus) => void;
  onUpload: () => void;
  onSendForm: () => void;
  onDeleteDocument?: () => void;
  className?: string;
}

export function StepCard({
  step,
  isActive,
  onSelect,
  onStatusChange,
  onUpload,
  onSendForm,
  onDeleteDocument,
  className,
}: StepCardProps) {
  const isLocked = step.status === "not_started" && step.autoValidation;

  return (
    <div
      className={cn(
        "relative rounded-xl bg-white transition-colors cursor-pointer overflow-hidden",
        isActive && "bg-neutral-50/60",
        "hover:bg-neutral-50/80",
        isActive && "hover:bg-neutral-50/70",
        className
      )}
      onClick={onSelect}
    >
      {/* 3px left accent — active only, no outer glow */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 rounded-l" />
      )}

      <div className="p-4 pl-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                Step {step.stepNumber}
              </span>
              {step.isComplianceGate && (
                <div className="flex items-center gap-0.5 text-[10px] text-amber-600">
                  <Shield className="h-3 w-3" />
                  <span>Gate</span>
                </div>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
          </div>
          <StatusBadge status={step.status} size="sm" />
        </div>

        {/* Description */}
        {step.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {step.description}
          </p>
        )}

        {/* Step metadata */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
          {step.method && (
            <span className="flex items-center gap-1">
              <span className="font-medium">Method:</span> {step.method}
            </span>
          )}
          {step.requiredCount && (
            <span className="flex items-center gap-1">
              <span className="font-medium">Required:</span>{" "}
              {step.completedCount || 0}/{step.requiredCount}
            </span>
          )}
          {step.lastUpdated && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {step.lastUpdated}
            </span>
          )}
          {step.documents.length > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {step.documents.length} doc{step.documents.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Documents preview */}
        {(step.documents.length > 0 || step.requiredDocumentTypes.length > 0) && (
          <div className="mb-2 pt-3 mt-2 border-t border-black/5">
            <StepCardDocuments
              documents={step.documents}
              requiredTypes={step.requiredDocumentTypes}
              maxDisplay={2}
            />
          </div>
        )}

        {/* Expected outcome */}
        {step.outcome && (
          <div className="mb-2 px-2 py-1.5 bg-neutral-50 rounded-lg">
            <span className="text-[10px] text-muted-foreground">
              <span className="font-medium">Outcome:</span> {step.outcome}
            </span>
          </div>
        )}

        {/* Actions */}
        <div
          className="pt-3 mt-2 border-t border-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          <StepCardActions
            step={step}
            onStatusChange={onStatusChange}
            onUpload={onUpload}
            onSendForm={onSendForm}
            onDeleteDocument={onDeleteDocument}
          />
        </div>
      </div>
    </div>
  );
}

// Compact step card for overview/timeline views
interface CompactStepCardProps {
  step: ComplianceStep;
  onClick: () => void;
  className?: string;
}

export function CompactStepCard({
  step,
  onClick,
  className,
}: CompactStepCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl bg-white transition-colors hover:bg-neutral-50",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground">
            Step {step.stepNumber}
          </span>
          <h4 className="text-xs font-medium text-slate-800 truncate">
            {step.title}
          </h4>
        </div>
        <StatusBadge status={step.status} size="sm" showIcon={false} />
      </div>
    </button>
  );
}
