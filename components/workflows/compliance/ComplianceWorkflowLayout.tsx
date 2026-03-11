"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  CaregiverInfo,
  CompliancePhase,
  ComplianceStep,
  StepStatus,
  ComplianceDocument,
  AuditLogEntry,
} from "./types";
import { CaregiverHeader } from "./CaregiverHeader";
import { StepCardsPanel } from "./StepCardsPanel";
import { ComplianceVaultDrawer } from "./ComplianceVaultDrawer";
import { ComplianceVaultDialog } from "./ComplianceVaultDialog";
import { AssignmentGate } from "./AssignmentGate";
import { AuditModeOverlay } from "./AuditModeOverlay";
import { StepUploadDialog } from "./StepUploadDialog";
import { useComplianceGates } from "./useComplianceGates";
import { usePhaseProgress } from "./usePhaseProgress";

interface ComplianceWorkflowLayoutProps {
  caregiver: CaregiverInfo;
  initialPhases: CompliancePhase[];
  onAssign?: () => void;
  onDocumentsChanged?: () => void;
  className?: string;
}

export function ComplianceWorkflowLayout({
  caregiver,
  initialPhases,
  onAssign,
  onDocumentsChanged,
  className,
}: ComplianceWorkflowLayoutProps) {
  // State management
  const [phases, setPhases] = useState<CompliancePhase[]>(initialPhases);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(
    initialPhases.find((p) => p.status === "in_progress")?.id || initialPhases[0]?.id || null
  );
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultStepId, setVaultStepId] = useState<string | null>(null);
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

        // Filter documents that have a compliance_step_id
        const complianceDocs = docs.filter(
          (d: { complianceStepId?: string }) => d.complianceStepId
        );

        if (complianceDocs.length === 0) return;

        // Inject documents into corresponding steps
        setPhases((prevPhases) =>
          prevPhases.map((phase) => ({
            ...phase,
            steps: phase.steps.map((step) => {
              const stepDocs = complianceDocs.filter(
                (d: { complianceStepId?: string }) => d.complianceStepId === step.id
              );

              if (stepDocs.length === 0) return step;

              // Convert to ComplianceDocument format
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

              // Update step with existing documents
              return {
                ...step,
                documents: [...step.documents, ...convertedDocs],
                status: step.status === "not_started" && convertedDocs.length > 0
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

  // Computed values
  const { gateStatus, canAssign, failingGates } = useComplianceGates(phases);
  const { isFullyComplete } = usePhaseProgress(phases);

  // Get active phase and step
  const activePhase = phases.find((p) => p.id === activePhaseId) || null;
  const uploadStep = uploadStepId
    ? phases.flatMap((p) => p.steps).find((s) => s.id === uploadStepId)
    : null;
  const vaultStep = vaultStepId
    ? phases.flatMap((p) => p.steps).find((s) => s.id === vaultStepId)
    : null;

  // Handle step status change
  const handleStepStatusChange = useCallback(
    (phaseId: string, stepId: string, newStatus: StepStatus) => {
      setPhases((prevPhases) => {
        // Update the step status
        const updatedPhases = prevPhases.map((phase) => {
          if (phase.id !== phaseId) return phase;

          const updatedSteps = phase.steps.map((step) => {
            if (step.id !== stepId) return step;

            // Create audit log entry
            const auditEntry: AuditLogEntry = {
              id: `audit-${Date.now()}`,
              timestamp: new Date().toLocaleString(),
              action: newStatus === "verified" ? "verified" : "updated",
              performedBy: "Current User", // In real app, get from auth
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

          // Determine new phase status
          const allVerified = updatedSteps.every((s) => s.status === "verified");
          const hasBlocked = updatedSteps.some((s) => s.status === "blocked");
          const hasProgress = updatedSteps.some(
            (s) => s.status === "verified" || s.status === "uploaded" || s.status === "waiting"
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

        // Unlock next phase if current phase is complete
        const completedPhase = updatedPhases.find((p) => p.id === phaseId);
        if (completedPhase?.status === "complete") {
          return updatedPhases.map((phase) => {
            if (phase.lockedUntil === phaseId && phase.status === "locked") {
              return {
                ...phase,
                status: "in_progress" as const,
                steps: phase.steps.map((step) => ({
                  ...step,
                  status: step.status === "not_started" ? "not_started" : step.status,
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

  // Handle document upload - open dialog
  const handleStepUpload = useCallback((stepId: string) => {
    setUploadStepId(stepId);
    setUploadDialogOpen(true);
  }, []);

  // Handle successful upload from dialog
  const handleUploadSuccess = useCallback(
    (uploadedDocuments: Array<{
      id: string;
      name: string;
      type: string;
      size: string;
      uploadedDate: string;
      expiryDate?: string;
      complianceStepId?: string;
    }>) => {
      // Update phases state with the new documents
      setPhases((prevPhases) =>
        prevPhases.map((phase) => ({
          ...phase,
          steps: phase.steps.map((step) => {
            if (step.id !== uploadStepId) return step;

            // Convert API documents to ComplianceDocument format
            const newDocs: ComplianceDocument[] = uploadedDocuments.map((doc) => ({
              id: doc.id,
              name: doc.name,
              type: doc.type as ComplianceDocument["type"],
              uploadedAt: new Date(doc.uploadedDate).toLocaleDateString(),
              uploadedBy: "Current User",
              status: "pending_review",
              stepId: step.id,
              phaseId: phase.id,
              expiresAt: doc.expiryDate,
            }));

            return {
              ...step,
              status: "uploaded" as StepStatus,
              documents: [...step.documents, ...newDocs],
              lastUpdated: new Date().toLocaleDateString(),
            };
          }),
        }))
      );

      // Trigger Documents tab refresh if callback provided
      if (onDocumentsChanged) {
        onDocumentsChanged();
      }
    },
    [uploadStepId, onDocumentsChanged]
  );

  // Handle send form to caregiver (placeholder)
  const handleStepSendForm = useCallback((stepId: string) => {
    console.log("Send form for step:", stepId);

    // Update status to waiting
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

  // Handle open vault drawer
  const handleOpenVault = useCallback((stepId: string) => {
    setVaultStepId(stepId);
    setVaultOpen(true);
  }, []);

  // Handle document verify
  const handleDocumentVerify = useCallback((documentId: string) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        steps: phase.steps.map((step) => ({
          ...step,
          documents: step.documents.map((doc) =>
            doc.id === documentId
              ? {
                  ...doc,
                  status: "verified" as const,
                  verifiedAt: new Date().toLocaleDateString(),
                  verifiedBy: "Current User",
                }
              : doc
          ),
        })),
      }))
    );
  }, []);

  // Handle document reject
  const handleDocumentReject = useCallback((documentId: string, reason?: string) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        steps: phase.steps.map((step) => ({
          ...step,
          documents: step.documents.map((doc) =>
            doc.id === documentId
              ? {
                  ...doc,
                  status: "rejected" as const,
                  auditNotes: reason || doc.auditNotes,
                }
              : doc
          ),
        })),
      }))
    );
  }, []);

  // Handle add audit note
  const handleAuditNoteAdd = useCallback((stepId: string, note: string) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        steps: phase.steps.map((step) => {
          if (step.id !== stepId) return step;

          const auditEntry: AuditLogEntry = {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            action: "updated",
            performedBy: "Current User",
            details: note,
            stepId,
          };

          return {
            ...step,
            auditHistory: [...step.auditHistory, auditEntry],
          };
        }),
      }))
    );
  }, []);

  // Handle assign
  const handleAssign = useCallback(() => {
    if (onAssign) {
      onAssign();
    } else {
      console.log("Assign caregiver:", caregiver.id);
    }
  }, [caregiver.id, onAssign]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header: profile, breadcrumb, horizontal phase tracker */}
      <CaregiverHeader
        caregiver={caregiver}
        phases={phases}
        activePhaseId={activePhaseId}
        onPhaseSelect={setActivePhaseId}
        onAuditModeOpen={() => setAuditModeOpen(true)}
        onVaultOpen={() => setVaultOpen(true)}
      />

      {/* Step cards for active phase */}
      <div className="space-y-6">
        <StepCardsPanel
          phase={activePhase}
          activeStepId={activeStepId}
          onStepSelect={(stepId) => {
            setActiveStepId(stepId);
            setVaultStepId(stepId);
          }}
          onStepStatusChange={handleStepStatusChange}
          onStepUpload={handleStepUpload}
          onStepSendForm={handleStepSendForm}
          onOpenVault={(stepId) => {
            setVaultStepId(stepId);
            setVaultOpen(true);
          }}
        />

        <AssignmentGate
          gateStatus={gateStatus}
          canAssign={canAssign}
          isFullyComplete={isFullyComplete}
          onAssign={handleAssign}
        />
      </div>

      {/* Compliance Vault Dialog (Desktop) */}
      <ComplianceVaultDialog
        isOpen={vaultOpen}
        onClose={() => {
          setVaultOpen(false);
          setVaultStepId(null);
        }}
        step={vaultStep || null}
        caregiver={caregiver}
        phases={phases}
        onDocumentVerify={handleDocumentVerify}
        onDocumentReject={handleDocumentReject}
        onAuditNoteAdd={handleAuditNoteAdd}
        onUpload={() => vaultStepId && handleStepUpload(vaultStepId)}
      />

      {/* Compliance Vault Drawer (Mobile) */}
      <ComplianceVaultDrawer
        isOpen={false}
        onClose={() => {}}
        step={null}
        onDocumentVerify={handleDocumentVerify}
        onDocumentReject={handleDocumentReject}
        onAuditNoteAdd={handleAuditNoteAdd}
        onUpload={() => {}}
      />

      {/* Step Upload Dialog */}
      <StepUploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => {
          setUploadDialogOpen(false);
          setUploadStepId(null);
        }}
        step={uploadStep ?? null}
        employeeId={caregiver.id}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Audit Mode Overlay */}
      <AuditModeOverlay
        isOpen={auditModeOpen}
        onClose={() => setAuditModeOpen(false)}
        caregiver={caregiver}
        phases={phases}
        gateStatus={gateStatus}
      />
    </div>
  );
}
