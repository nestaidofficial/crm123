"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  FileText,
  ShieldCheck,
  CalendarCheck,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import type {
  CaregiverInfo,
  CompliancePhase,
  StepStatus,
  ComplianceDocument,
  AuditLogEntry,
} from "./types";
import { StepCardsPanel } from "./StepCardsPanel";
import { AuditModeOverlay } from "./AuditModeOverlay";
import { StepUploadDialog } from "./StepUploadDialog";
import { useComplianceGates } from "./useComplianceGates";
import { usePhaseProgress } from "./usePhaseProgress";

const PHASE_ICONS = {
  "phase-1": ClipboardCheck,
  "phase-2": FileText,
  "phase-3": ShieldCheck,
  "phase-4": CalendarCheck,
  "phase-5": Wallet,
  "phase-6": CheckCircle2,
};

interface EmployeeOnboardingPanelProps {
  caregiver: CaregiverInfo;
  initialPhases: CompliancePhase[];
  onAssign?: () => void;
  onDocumentsChanged?: () => void;
  className?: string;
}

export function EmployeeOnboardingPanel({
  caregiver,
  initialPhases,
  onAssign,
  onDocumentsChanged,
  className,
}: EmployeeOnboardingPanelProps) {
  const [phases, setPhases] = useState<CompliancePhase[]>(initialPhases);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(
    initialPhases.find((p) => p.status === "in_progress")?.id ||
      initialPhases[0]?.id ||
      null
  );
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [auditModeOpen, setAuditModeOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadStepId, setUploadStepId] = useState<string | null>(null);

  // Fetch existing documents on mount and inject into steps
  useEffect(() => {
    const fetchExistingDocuments = async () => {
      try {
        const res = await fetch(`/api/employees/${caregiver.id}/documents`);
        if (!res.ok) return;

        const json = await res.json();
        const docs = Array.isArray(json?.data) ? json.data : [];

        const complianceDocs = docs.filter(
          (d: { complianceStepId?: string }) => d.complianceStepId
        );

        if (complianceDocs.length === 0) return;

        setPhases((prevPhases) =>
          prevPhases.map((phase) => ({
            ...phase,
            steps: phase.steps.map((step) => {
              const stepDocs = complianceDocs.filter(
                (d: { complianceStepId?: string }) =>
                  d.complianceStepId === step.id
              );

              if (stepDocs.length === 0) return step;

              const convertedDocs: ComplianceDocument[] = stepDocs.map(
                (doc: {
                  id: string;
                  name: string;
                  type: string;
                  uploadedDate: string;
                  expiryDate?: string;
                }) => ({
                  id: doc.id,
                  name: doc.name,
                  type: doc.type as ComplianceDocument["type"],
                  uploadedAt: new Date(doc.uploadedDate).toLocaleDateString(),
                  uploadedBy: "System",
                  status: "pending_review" as const,
                  stepId: step.id,
                  phaseId: phase.id,
                  expiresAt: doc.expiryDate,
                })
              );

              return {
                ...step,
                documents: [...step.documents, ...convertedDocs],
                status:
                  step.status === "not_started" && convertedDocs.length > 0
                    ? ("uploaded" as StepStatus)
                    : step.status,
              };
            }),
          }))
        );
      } catch (error) {
        console.error("Failed to fetch existing documents:", error);
      }
    };

    fetchExistingDocuments();
  }, [caregiver.id]);

  const { gateStatus } = useComplianceGates(phases);
  const { totalProgress } = usePhaseProgress(phases);
  const activePhase = phases.find((p) => p.id === activePhaseId) || null;
  const uploadStep = uploadStepId
    ? phases.flatMap((p) => p.steps).find((s) => s.id === uploadStepId)
    : null;

  const handleStepStatusChange = useCallback(
    (phaseId: string, stepId: string, newStatus: StepStatus) => {
      setPhases((prevPhases) => {
        const updatedPhases = prevPhases.map((phase) => {
          if (phase.id !== phaseId) return phase;

          const updatedSteps = phase.steps.map((step) => {
            if (step.id !== stepId) return step;

            const auditEntry: AuditLogEntry = {
              id: `audit-${Date.now()}`,
              timestamp: new Date().toLocaleString(),
              action: newStatus === "verified" ? "verified" : "updated",
              performedBy: "Current User",
              previousStatus: step.status,
              newStatus,
              stepId,
            };

            return {
              ...step,
              status: newStatus,
              lastUpdated: new Date().toLocaleDateString(),
              auditHistory: [...step.auditHistory, auditEntry],
            };
          });

          const allVerified = updatedSteps.every((s) => s.status === "verified");
          const hasBlocked = updatedSteps.some((s) => s.status === "blocked");
          const hasProgress = updatedSteps.some(
            (s) =>
              s.status === "verified" ||
              s.status === "uploaded" ||
              s.status === "waiting"
          );

          let newPhaseStatus = phase.status;
          if (allVerified) {
            newPhaseStatus = "complete";
          } else if (hasBlocked) {
            newPhaseStatus = "blocked";
          } else if (hasProgress) {
            newPhaseStatus = "in_progress";
          }

          return {
            ...phase,
            status: newPhaseStatus,
            steps: updatedSteps,
          };
        });

        const completedPhase = updatedPhases.find((p) => p.id === phaseId);
        if (completedPhase?.status === "complete") {
          return updatedPhases.map((phase) => {
            if (phase.lockedUntil === phaseId && phase.status === "locked") {
              return {
                ...phase,
                status: "in_progress" as const,
                steps: phase.steps.map((step) => ({
                  ...step,
                  status:
                    step.status === "not_started" ? "not_started" : step.status,
                })),
              };
            }
            return phase;
          });
        }

        return updatedPhases;
      });
    },
    []
  );

  const handleStepUpload = useCallback((stepId: string) => {
    setUploadStepId(stepId);
    setUploadDialogOpen(true);
  }, []);

  const handleUploadSuccess = useCallback(
    (
      uploadedDocuments: Array<{
        id: string;
        name: string;
        type: string;
        size: string;
        uploadedDate: string;
        expiryDate?: string;
        complianceStepId?: string;
      }>
    ) => {
      setPhases((prevPhases) =>
        prevPhases.map((phase) => ({
          ...phase,
          steps: phase.steps.map((step) => {
            if (step.id !== uploadStepId) return step;

            const newDocs: ComplianceDocument[] = uploadedDocuments.map(
              (doc) => ({
                id: doc.id,
                name: doc.name,
                type: doc.type as ComplianceDocument["type"],
                uploadedAt: new Date(doc.uploadedDate).toLocaleDateString(),
                uploadedBy: "Current User",
                status: "pending_review",
                stepId: step.id,
                phaseId: phase.id,
                expiresAt: doc.expiryDate,
              })
            );

            return {
              ...step,
              status: "uploaded" as StepStatus,
              documents: [...step.documents, ...newDocs],
              lastUpdated: new Date().toLocaleDateString(),
            };
          }),
        }))
      );

      if (onDocumentsChanged) {
        onDocumentsChanged();
      }
    },
    [uploadStepId, onDocumentsChanged]
  );

  const handleStepSendForm = useCallback((stepId: string) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        steps: phase.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                status: "waiting" as StepStatus,
                lastUpdated: new Date().toLocaleDateString(),
              }
            : step
        ),
      }))
    );
  }, []);

  const handleStepDeleteDocument = useCallback((stepId: string) => {
    console.log("Delete document for step:", stepId);
    // In a real implementation, this would open a confirmation dialog
    // and then remove the document from the step
  }, []);

  const handleAssign = useCallback(() => {
    if (onAssign) {
      onAssign();
    }
  }, [onAssign]);

  return (
    <div className={cn("grid gap-5 md:grid-cols-[240px_1fr]", className)}>
      {/* Left Sidebar — Phase Navigation */}
      <div className="rounded-2xl bg-white border border-neutral-200/70 shadow-sm overflow-hidden h-fit self-start">
        {/* Employee info */}
        <div className="p-4 border-b border-neutral-100">
          <div className="text-xs font-medium text-neutral-500 mb-0.5">
            Employee
          </div>
          <div className="text-[13px] font-semibold text-neutral-900 truncate">
            {caregiver.name}
          </div>
          {(caregiver.title || caregiver.department) && (
            <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
              {caregiver.title}
              {caregiver.department ? ` • ${caregiver.department}` : ""}
            </div>
          )}
        </div>

        {/* Completion Progress Bar */}
        {phases.length > 0 && (
          <div className="px-4 py-4 border-b border-neutral-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-500">
                Completion
              </span>
              <span className="text-base font-bold text-neutral-900">
                {Math.round(totalProgress.percentage)}%
              </span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${totalProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Vertical Phase Navigation */}
        {phases.length > 0 && (
          <div className="py-2">
            {phases.map((phase) => {
              const PhaseIcon =
                PHASE_ICONS[phase.id as keyof typeof PHASE_ICONS] ||
                ClipboardCheck;
              const isActive = activePhaseId === phase.id;
              const isLocked = phase.status === "locked";
              const canSelect = !isLocked;

              return (
                <button
                  key={phase.id}
                  onClick={() => canSelect && setActivePhaseId(phase.id)}
                  disabled={!canSelect}
                  className={cn(
                    "relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors outline-none",
                    isActive && "bg-emerald-50/70",
                    !isActive && !isLocked && "hover:bg-neutral-50",
                    isLocked && "cursor-not-allowed opacity-60"
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-0 h-full w-[3px] bg-emerald-500"
                      aria-hidden
                    />
                  )}
                  <PhaseIcon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-emerald-600"
                        : isLocked
                          ? "text-neutral-300"
                          : "text-neutral-500"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[13px] font-medium",
                      isActive
                        ? "text-emerald-700"
                        : isLocked
                          ? "text-neutral-400"
                          : "text-neutral-700"
                    )}
                  >
                    {phase.phaseName}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Panel — Workflow Content */}
      <div className="w-full min-w-0">
        {activePhase && (
          <div className="space-y-6">
            {/* Phase Header */}
            <div className="bg-white rounded-2xl border border-neutral-200/70 shadow-sm p-5">
              <h2 className="text-lg font-bold text-neutral-900">
                {activePhase.phaseName}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {activePhase.goal}
              </p>
            </div>

            {/* Step Cards Panel */}
            <StepCardsPanel
              phase={activePhase}
              activeStepId={activeStepId}
              onStepSelect={setActiveStepId}
              onStepStatusChange={handleStepStatusChange}
              onStepUpload={handleStepUpload}
              onStepSendForm={handleStepSendForm}
              onStepDeleteDocument={handleStepDeleteDocument}
            />

            {/* Audit Mode Overlay */}
            <AuditModeOverlay
              isOpen={auditModeOpen}
              onClose={() => setAuditModeOpen(false)}
              caregiver={caregiver}
              phases={phases}
              gateStatus={gateStatus}
            />

            {/* Step Upload Dialog */}
            <StepUploadDialog
              isOpen={uploadDialogOpen}
              onClose={() => {
                setUploadDialogOpen(false);
                setUploadStepId(null);
              }}
              step={uploadStep || null}
              employeeId={caregiver.id}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        )}
      </div>
    </div>
  );
}
