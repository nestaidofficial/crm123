"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Search,
  ArrowLeft,
  UserCircle,
  Building2,
  Loader2,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  CalendarCheck,
  Wallet,
  CheckCircle2,
  X,
  Info,
  ChevronRight,
  MessageSquare,
  LogOut,
  RefreshCw,
  AlertTriangle,
  GitBranch,
  Edit,
  StickyNote,
  MoveRight,
  Clock,
  FileCheck,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCandidatesStore } from "@/store/useCandidatesStore";
import { AddCandidateDialog } from "./add-candidate-dialog";
import type { Candidate } from "@/types/candidate";
import {
  DEFAULT_CAREGIVER_PHASES,
  type CaregiverInfo,
  type CompliancePhase,
  type ComplianceStep,
  type StepStatus,
  type ComplianceDocument,
  type AuditLogEntry,
  StepCardsPanel,
  StepCard,
  AuditModeOverlay,
  StepUploadDialog,
  useComplianceGates,
  usePhaseProgress,
} from "./compliance";

const WorkflowSetupWizard = dynamic(
  () => import("./WorkflowSetupWizard").then((m) => ({ default: m.WorkflowSetupWizard })),
  { ssr: false }
);
const CandidateOnboardingPanel = dynamic(
  () => import("./candidate-onboarding-panel").then((m) => ({ default: m.CandidateOnboardingPanel })),
  { ssr: false }
);
const CandidateInfoPanel = dynamic(
  () => import("./candidate-info-panel").then((m) => ({ default: m.CandidateInfoPanel })),
  { ssr: false }
);
const SendFormDialog = dynamic(
  () => import("./send-form-dialog").then((m) => ({ default: m.SendFormDialog })),
  { ssr: false }
);

interface WorkflowConfig {
  configured: boolean;
  selectedStepIds: string[];
}

// Phase icons mapping
const PHASE_ICONS = {
  "phase-1": ClipboardCheck,
  "phase-2": FileText,
  "phase-3": ShieldCheck,
  "phase-4": CalendarCheck,
  "phase-5": Wallet,
  "phase-6": CheckCircle2,
};

export function WorkflowsDashboard({ section = "dashboard" }: { section?: string }) {
  // Candidate store
  const candidates = useCandidatesStore((s) => s.candidates);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCandidateSearch, setShowCandidateSearch] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);

  // Workflow setup wizard state
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);

  // Phase workflow state
  const [phases, setPhases] = useState<CompliancePhase[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [auditModeOpen, setAuditModeOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadStepId, setUploadStepId] = useState<string | null>(null);
  const [sendFormDialogOpen, setSendFormDialogOpen] = useState(false);
  const [sendFormStepId, setSendFormStepId] = useState<string | null>(null);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Show setup wizard only when arriving from the Employee sub-item under Onboarding
  // DEV: always show wizard on employee-onboarding regardless of saved config
  useEffect(() => {
    if (section !== "employee-onboarding") {
      setShowSetupWizard(false);
      return;
    }
    setShowSetupWizard(true);
  }, [section]);

  // Filter phases based on selected steps
  const getFilteredPhases = useCallback((): CompliancePhase[] => {
    if (!workflowConfig?.selectedStepIds) {
      return DEFAULT_CAREGIVER_PHASES;
    }

    const filteredPhases = DEFAULT_CAREGIVER_PHASES.map(phase => ({
      ...phase,
      steps: phase.steps.filter(step => workflowConfig.selectedStepIds.includes(step.id))
    })).filter(phase => phase.steps.length > 0);

    // Re-number steps sequentially
    let stepCounter = 1;
    return filteredPhases.map(phase => ({
      ...phase,
      steps: phase.steps.map(step => ({
        ...step,
        stepNumber: stepCounter++
      }))
    }));
  }, [workflowConfig]);

  // Handle wizard completion
  const handleWizardComplete = useCallback((config: WorkflowConfig) => {
    try {
      localStorage.setItem("nessa-onboarding-workflow-config", JSON.stringify(config));
      setWorkflowConfig(config);
      setShowSetupWizard(false);
    } catch (error) {
      console.error("Failed to save workflow config:", error);
    }
  }, []);

  // Handle reconfigure workflow
  const handleReconfigureWorkflow = useCallback(() => {
    setShowSetupWizard(true);
  }, []);

  // Computed derived values
  const filteredCandidates = candidates.filter((c) => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedCandidateData: Candidate | null =
    selectedCandidateId
      ? candidates.find((c) => c.id === selectedCandidateId) ?? null
      : null;

  // Memoized so useEffect doesn't re-fire every render
  const selectedEmployeeData = useMemo(() => {
    if (!selectedCandidateData) return null;
    return {
      id: selectedCandidateData.id,
      name: `${selectedCandidateData.firstName} ${selectedCandidateData.lastName}`,
      email: selectedCandidateData.email,
      title: "Candidate",
      department: "",
      location: selectedCandidateData.address.city
        ? `${selectedCandidateData.address.city}, ${selectedCandidateData.address.state}`
        : "",
      startDate: "",
      status: "pending" as const,
      progress: 0,
      totalSteps: 14,
      avatarUrl: selectedCandidateData.avatarUrl,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCandidateId, candidates]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showCandidateSearch || filteredCandidates.length === 0) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCandidates.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredCandidates.length) % filteredCandidates.length);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCandidates[selectedIndex]) {
            setSelectedCandidateId(filteredCandidates[selectedIndex].id);
            setShowCandidateSearch(false);
            setSearchQuery("");
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowCandidateSearch(false);
          setSearchQuery("");
          break;
      }
    },
    [showCandidateSearch, filteredCandidates, selectedIndex]
  );

  // Stable selected step IDs string so useEffect only re-runs when the actual list changes
  const selectedStepIdsKey = workflowConfig?.selectedStepIds?.join(",") ?? "";

  // Initialize phases when employee is selected or config changes
  useEffect(() => {
    if (!selectedEmployeeData || showSetupWizard) {
      setPhases([]);
      setActivePhaseId(null);
      setActiveStepId(null);
      return;
    }

    // Inline filtering so we don't depend on an unstable callback ref
    let sourcePahses: CompliancePhase[];
    if (!selectedStepIdsKey) {
      sourcePahses = DEFAULT_CAREGIVER_PHASES;
    } else {
      const ids = selectedStepIdsKey.split(",");
      let counter = 1;
      sourcePahses = DEFAULT_CAREGIVER_PHASES
        .map(phase => ({
          ...phase,
          steps: phase.steps.filter(s => ids.includes(s.id)).map(s => ({ ...s, stepNumber: counter++ })),
        }))
        .filter(phase => phase.steps.length > 0);
    }

    const initialPhases = sourcePahses.map((phase) => ({
      ...phase,
      steps: phase.steps.map((step) => ({ ...step })),
    }));

    setPhases(initialPhases);
    setActivePhaseId(
      initialPhases.find((p) => p.status === "in_progress")?.id || initialPhases[0]?.id || null
    );
  // selectedEmployeeData.id is stable; selectedStepIdsKey is a primitive string
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeData?.id, showSetupWizard, selectedStepIdsKey]);

  // Fetch existing documents when employee is selected
  // Document fetching will be wired to backend once candidates have a real API.

  // Computed values for phase workflow
  const { gateStatus } = useComplianceGates(phases);
  const { totalProgress } = usePhaseProgress(phases);
  const activePhase = phases.find((p) => p.id === activePhaseId) || null;

  // Handle step status change
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
    },
    [uploadStepId]
  );

  // Handle send form - open dialog
  const handleStepSendForm = useCallback((stepId: string) => {
    setSendFormStepId(stepId);
    setSendFormDialogOpen(true);
  }, []);

  // Handle form send completion
  const handleFormSend = useCallback(
    (formData: { type: 'system' | 'pdf'; formId?: string; fileName?: string; file?: File }) => {
      if (!sendFormStepId || !selectedCandidateId) return;

      // Update step status to waiting
      setPhases((prevPhases) =>
        prevPhases.map((phase) => ({
          ...phase,
          steps: phase.steps.map((step) =>
            step.id === sendFormStepId
              ? {
                  ...step,
                  status: "waiting" as StepStatus,
                  lastUpdated: new Date().toLocaleDateString(),
                }
              : step
          ),
        }))
      );

      // Add activity log entry
      useCandidatesStore.getState().addActivityLog(selectedCandidateId, {
        action: "Form Sent",
        description: `${formData.type === 'system' ? 'System form' : 'PDF form'} sent for step`,
        performedBy: "Current User",
      });
    },
    [sendFormStepId, selectedCandidateId]
  );

  // Handle delete document
  const handleStepDeleteDocument = useCallback((stepId: string) => {
    console.log("Delete document for step:", stepId);
    // In a real implementation, this would open a confirmation dialog
    // and then remove the document from the step
  }, []);

  // Handle assign
  const handleAssign = useCallback(() => {
    if (selectedEmployeeData) {
      console.log("Assign caregiver:", selectedEmployeeData.id);
    }
  }, [selectedEmployeeData]);

  // Phase navigation helpers
  const activePhaseIndex = phases.findIndex((p) => p.id === activePhaseId);

  const goToPrevPhase = useCallback(() => {
    if (activePhaseIndex > 0) {
      setActivePhaseId(phases[activePhaseIndex - 1].id);
      setActiveStepId(null);
    }
  }, [activePhaseIndex, phases]);

  const goToNextPhase = useCallback(() => {
    if (activePhaseIndex < phases.length - 1) {
      const nextPhase = phases[activePhaseIndex + 1];
      if (nextPhase.status !== "locked") {
        setActivePhaseId(nextPhase.id);
        setActiveStepId(null);
      }
    }
  }, [activePhaseIndex, phases]);

  const isFirstPhase = activePhaseIndex === 0;
  const isLastPhase = activePhaseIndex === phases.length - 1;
  const nextPhaseUnlocked =
    !isLastPhase && phases[activePhaseIndex + 1]?.status !== "locked";

  // Clear candidate selection when navigating away from employee onboarding
  useEffect(() => {
    if (section !== "employee-onboarding") {
      setSelectedCandidateId(null);
      setSearchQuery("");
    }
  }, [section]);

  // ── Placeholder card for non-onboarding sections ──
  function PlaceholderSection({
    icon: Icon,
    title,
    description,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/60">
        <CardContent className="py-16 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full blur-xl opacity-30" />
            <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 p-6 rounded-2xl">
              <Icon className="h-16 w-16 mx-auto text-slate-700" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-slate-900">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
        </CardContent>
      </Card>
    );
  }

  if (section === "none" || section === "dashboard") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-neutral-100 mb-5">
          <GitBranch className="h-7 w-7 text-neutral-400" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900 mb-1.5">Select a workflow</h3>
        <p className="text-sm text-neutral-500 max-w-xs mx-auto">
          Choose a category from the sidebar to get started.
        </p>
      </div>
    );
  }

  if (section === "client") {
    return (
      <PlaceholderSection
        icon={UserCircle}
        title="Client Onboarding"
        description="Manage client intake, assessments, and care plan setup workflows"
      />
    );
  }
  if (section === "partner") {
    return (
      <PlaceholderSection
        icon={Building2}
        title="Partner Onboarding"
        description="Onboard referral partners and manage partnership agreements"
      />
    );
  }
  if (section === "client-communication") {
    return (
      <PlaceholderSection
        icon={MessageSquare}
        title="Client Communication"
        description="Track and manage client communications, messages, and correspondence"
      />
    );
  }
  if (section === "discharge") {
    return (
      <PlaceholderSection
        icon={LogOut}
        title="Discharge"
        description="Manage client discharge workflows, documentation, and follow-up"
      />
    );
  }
  if (section === "service-changes") {
    return (
      <PlaceholderSection
        icon={RefreshCw}
        title="Service Changes"
        description="Process service level changes, schedule updates, and care plan modifications"
      />
    );
  }
  if (section === "incident") {
    return (
      <PlaceholderSection
        icon={AlertTriangle}
        title="Incident"
        description="Report, track, and resolve incidents and safety events"
      />
    );
  }

  // ── Candidate Onboarding ──
  return (
    <>
      <AddCandidateDialog
        open={showAddCandidate}
        onOpenChange={setShowAddCandidate}
        onAdded={(id) => {
          setSelectedCandidateId(id);
          setShowCandidateSearch(false);
          setSearchQuery("");
        }}
      />
      <WorkflowSetupWizard
        isOpen={showSetupWizard}
        onComplete={handleWizardComplete}
        onClose={() => setShowSetupWizard(false)}
      />
      <div className="flex gap-5">
          {/* Left Sidebar */}
          <div className="w-[240px] shrink-0 rounded-2xl bg-white border border-neutral-200/70 shadow-sm overflow-hidden h-fit self-start">

            {/* Header row: title + Add button */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100 bg-neutral-50/30">
              <span className="text-[13px] font-semibold text-neutral-900">Candidates</span>
              <Button
                size="sm"
                onClick={() => setShowAddCandidate(true)}
                className="h-7 px-3 text-[11px] bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg gap-1.5 font-medium"
              >
                <span className="text-sm leading-none">+</span>
                Add
              </Button>
            </div>

            {/* Search */}
            <div className="px-3 py-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200/70 rounded-lg px-3 h-9 focus-within:border-neutral-300 focus-within:bg-white transition-colors">
                <Search className="h-4 w-4 text-neutral-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowCandidateSearch(true)}
                  onBlur={() => setTimeout(() => setShowCandidateSearch(false), 150)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent outline-none text-[13px] placeholder:text-neutral-400 text-neutral-800"
                  placeholder="Search candidates..."
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="shrink-0 p-0.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Candidate list */}
            {candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="h-10 w-10 rounded-xl bg-neutral-100 grid place-items-center mb-3">
                  <Users className="h-5 w-5 text-neutral-400" />
                </div>
                <p className="text-[12px] font-medium text-neutral-700 mb-0.5">No candidates yet</p>
                <p className="text-[11px] text-neutral-400 mb-4">
                  Add a candidate to start their onboarding workflow.
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowAddCandidate(true)}
                  className="h-7 px-3 text-[11px] bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg"
                >
                  Add Candidate
                </Button>
              </div>
            ) : (
              <div className="py-1 max-h-[360px] overflow-y-auto">
                {(searchQuery ? filteredCandidates : candidates).length === 0 ? (
                  <div className="px-4 py-5 text-center text-[12px] text-neutral-400 italic">
                    No candidates match your search
                  </div>
                ) : (
                  (searchQuery ? filteredCandidates : candidates).map((candidate, index) => {
                    const initials = `${candidate.firstName[0] ?? ""}${candidate.lastName[0] ?? ""}`.toUpperCase();
                    const isSelected = selectedCandidateId === candidate.id;

                    return (
                      <button
                        key={candidate.id}
                        onClick={() => {
                          setSelectedCandidateId(candidate.id);
                          setSearchQuery("");
                          setShowCandidateSearch(false);
                        }}
                        className={cn(
                          "relative w-full flex items-center gap-3 px-4 py-3 text-left transition-all outline-none",
                          isSelected 
                            ? "bg-neutral-50 border-l-2 border-neutral-900" 
                            : "hover:bg-neutral-50/50 border-l-2 border-transparent",
                          showCandidateSearch && selectedIndex === index && !isSelected && "bg-neutral-100"
                        )}
                      >
                        {candidate.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={candidate.avatarUrl}
                            alt={`${candidate.firstName} ${candidate.lastName}`}
                            className="h-9 w-9 rounded-full object-cover shrink-0 border border-neutral-200"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-neutral-900 text-white text-[11px] font-semibold grid place-items-center shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className={cn(
                            "text-[13px] font-semibold truncate mb-0.5",
                            isSelected ? "text-neutral-900" : "text-neutral-700"
                          )}>
                            {candidate.firstName} {candidate.lastName}
                          </div>
                          {candidate.email && (
                            <div className="text-[11px] text-neutral-500 truncate">
                              {candidate.email}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Completion Progress Bar */}
            {selectedEmployeeData && phases.length > 0 && (
              <div className="px-4 py-4 border-b border-neutral-100 bg-neutral-50/20">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wide">Completion</span>
                    <button
                      type="button"
                      className="text-neutral-400 hover:text-neutral-500 transition-colors"
                      title="Overall onboarding completion across all phases"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-lg font-bold text-neutral-900">
                    {Math.round(totalProgress.percentage)}%
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${totalProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Reconfigure Workflow Button */}
            {selectedEmployeeData && workflowConfig && (
              <div className="px-4 py-3 border-b border-neutral-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReconfigureWorkflow}
                  className="w-full h-8 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                >
                  <GitBranch className="h-3.5 w-3.5 mr-2" />
                  Reconfigure Workflow
                </Button>
              </div>
            )}

            {/* Vertical Phase Navigation */}
            {selectedEmployeeData && phases.length > 0 && (
              <div className="py-2">
                {phases.map((phase) => {
                  const PhaseIcon =
                    PHASE_ICONS[phase.id as keyof typeof PHASE_ICONS] || ClipboardCheck;
                  const isActivePhase = activePhaseId === phase.id;
                  const isLocked = phase.status === "locked";
                  const canSelect = !isLocked;

                  return (
                    <button
                      key={phase.id}
                      onClick={() => canSelect && setActivePhaseId(phase.id)}
                      disabled={!canSelect}
                      className={cn(
                        "relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors outline-none",
                        isActivePhase && "bg-emerald-50/70",
                        !isActivePhase && !isLocked && "hover:bg-neutral-50",
                        isLocked && "cursor-not-allowed opacity-60"
                      )}
                    >
                      {isActivePhase && (
                        <span
                          className="absolute left-0 top-0 h-full w-[3px] bg-emerald-500"
                          aria-hidden
                        />
                      )}
                      <PhaseIcon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActivePhase
                            ? "text-emerald-600"
                            : isLocked
                              ? "text-neutral-300"
                              : "text-neutral-500"
                        )}
                      />
                      <span
                        className={cn(
                          "text-[13px] font-medium",
                          isActivePhase
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

          {/* Center and Right Panel Container */}
          <div className="flex-1 min-w-0 space-y-5">
            {selectedEmployeeData && selectedCandidateData ? (
              <>
                {/* Profile Header - Full Width */}
                <Card className="border-neutral-200/70 shadow-sm overflow-hidden">
                  <div className="p-6 pb-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border-2 border-neutral-200">
                          {selectedCandidateData.avatarUrl ? (
                            <AvatarImage src={selectedCandidateData.avatarUrl} alt={`${selectedCandidateData.firstName} ${selectedCandidateData.lastName}`} />
                          ) : (
                            <AvatarFallback className="bg-neutral-900 text-white text-xl font-semibold">
                              {`${selectedCandidateData.firstName[0]}${selectedCandidateData.lastName[0]}`.toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                            {selectedCandidateData.firstName} {selectedCandidateData.lastName}
                          </h1>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                selectedCandidateData.onboardingStatus === 'completed'
                                  ? 'positive'
                                  : selectedCandidateData.onboardingStatus === 'withdrawn'
                                  ? 'negative'
                                  : 'secondary'
                              }
                              className="text-xs font-medium"
                            >
                              {selectedCandidateData.currentStageLabel || (selectedCandidateData.onboardingStatus || 'active').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-2 border-neutral-200"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-2 border-neutral-200"
                        >
                          <StickyNote className="h-4 w-4" />
                          Add Note
                        </Button>
                        <Button
                          size="sm"
                          className="h-9 gap-2 bg-neutral-900 hover:bg-neutral-800"
                        >
                          Move Stage
                        </Button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex items-center gap-6 text-sm text-neutral-600 mb-1">
                      {selectedCandidateData.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-neutral-400" />
                          <span>{selectedCandidateData.email}</span>
                        </div>
                      )}
                      {selectedCandidateData.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-neutral-400" />
                          <span>{selectedCandidateData.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="px-6 py-5 bg-neutral-50/30 border-t border-neutral-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                        Onboarding Progress
                      </span>
                      <span className="text-2xl font-bold text-neutral-900">
                        {Math.round((phases.reduce((sum, p) => sum + p.steps.filter(s => s.status === "verified").length, 0) / phases.reduce((sum, p) => sum + p.steps.length, 0)) * 100) || 0}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-neutral-200 rounded-full overflow-hidden mb-5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((phases.reduce((sum, p) => sum + p.steps.filter(s => s.status === "verified").length, 0) / phases.reduce((sum, p) => sum + p.steps.length, 0)) * 100) || 0}%` }}
                      />
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-neutral-200/60 shadow-sm">
                        <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-neutral-500 uppercase tracking-wide font-semibold mb-0.5">
                            Days in Stage
                          </p>
                          <p className="text-2xl font-bold text-neutral-900 leading-none">
                            {Math.floor((Date.now() - new Date(selectedCandidateData.createdAt).getTime()) / (1000 * 60 * 60 * 24)) < 10 
                              ? `0${Math.floor((Date.now() - new Date(selectedCandidateData.createdAt).getTime()) / (1000 * 60 * 60 * 24))}` 
                              : Math.floor((Date.now() - new Date(selectedCandidateData.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-neutral-200/60 shadow-sm">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <FileCheck className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-neutral-500 uppercase tracking-wide font-semibold mb-0.5">
                            Compliance Docs
                          </p>
                          <p className="text-2xl font-bold text-neutral-900 leading-none">
                            {phases.reduce((sum, p) => sum + p.steps.filter(s => s.status === "verified").length, 0)}
                            <span className="text-base text-neutral-400 font-medium">
                              /{phases.reduce((sum, p) => sum + p.steps.length, 0)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Two Column Layout: Timeline + Info Panel */}
                <div className="grid grid-cols-[1fr_300px] gap-5">
                  {/* Phase Timeline */}
                  <div className="space-y-4">
                    {phases.map((phase) => {
                      const isActivePhaseView = activePhaseId === phase.id;
                      const PhaseIcon =
                        PHASE_ICONS[phase.id as keyof typeof PHASE_ICONS] || ClipboardCheck;

                      return (
                        <Card
                          key={phase.id}
                          className={cn(
                            "border shadow-sm overflow-hidden transition-all",
                            isActivePhaseView 
                              ? "border-neutral-300 shadow-md" 
                              : "border-neutral-200/70"
                          )}
                        >
                          {/* Phase Header */}
                          <button
                            onClick={() => setActivePhaseId(phase.id)}
                            className={cn(
                              "w-full px-5 py-4 flex items-center justify-between transition-colors text-left",
                              isActivePhaseView 
                                ? "bg-neutral-50/50" 
                                : "hover:bg-neutral-50/30"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-11 w-11 rounded-xl flex items-center justify-center transition-all",
                                  phase.status === "complete"
                                    ? "bg-emerald-50 border border-emerald-100"
                                    : phase.status === "in_progress"
                                    ? "bg-blue-50 border border-blue-100"
                                    : "bg-neutral-100 border border-neutral-200"
                                )}
                              >
                                <PhaseIcon
                                  className={cn(
                                    "h-5 w-5",
                                    phase.status === "complete"
                                      ? "text-emerald-600"
                                      : phase.status === "in_progress"
                                      ? "text-blue-600"
                                      : "text-neutral-400"
                                  )}
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-semibold"
                                  >
                                    {phase.phaseNumber < 10 ? `0${phase.phaseNumber}` : phase.phaseNumber}
                                  </Badge>
                                  <h3 className="text-[15px] font-semibold text-neutral-900">
                                    {phase.phaseName}
                                  </h3>
                                </div>
                                <p className="text-xs text-neutral-500 leading-relaxed">{phase.goal}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {phase.status === "complete" && (
                                <Badge variant="positive" className="text-xs font-medium">
                                  Complete
                                </Badge>
                              )}
                              {phase.status === "in_progress" && (
                                <Badge variant="warning" className="text-xs font-medium">
                                  In Progress
                                </Badge>
                              )}
                              {phase.status === "locked" && (
                                <Badge variant="secondary" className="text-xs font-medium">
                                  Locked
                                </Badge>
                              )}
                            </div>
                          </button>

                          {/* Phase Steps - show expanded if active or completed */}
                          {(isActivePhaseView || phase.status === "complete") && (
                            <div className="px-5 pb-4 space-y-2">
                              {phase.steps.map((step) => (
                                <StepCard
                                  key={step.id}
                                  step={step}
                                  isActive={activeStepId === step.id}
                                  onSelect={() => setActiveStepId(step.id)}
                                  onStatusChange={(status) =>
                                    handleStepStatusChange(phase.id, step.id, status)
                                  }
                                  onUpload={() => handleStepUpload(step.id)}
                                  onSendForm={() => handleStepSendForm(step.id)}
                                  onDeleteDocument={
                                    handleStepDeleteDocument
                                      ? () => handleStepDeleteDocument(step.id)
                                      : undefined
                                  }
                                  collapsed={phase.status === "complete" && !isActivePhaseView}
                                />
                              ))}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>

                  {/* Right Info Panel */}
                  <div className="w-full">
                    <CandidateInfoPanel
                      missingItems={
                        phases
                          .flatMap((p) => p.steps)
                          .filter((s) => s.status === "blocked" || s.status === "not_started")
                          .map((s) => s.title)
                      }
                      activityLog={selectedCandidateData.activityLog || []}
                      documents={selectedCandidateData.documents || []}
                      onUploadDocument={() => {
                        setUploadDialogOpen(true);
                      }}
                    />
                  </div>
                </div>

                <AuditModeOverlay
                  isOpen={auditModeOpen}
                  onClose={() => setAuditModeOpen(false)}
                  caregiver={{
                    id: selectedEmployeeData.id,
                    name: selectedEmployeeData.name,
                    email: selectedEmployeeData.email,
                    title: selectedEmployeeData.title,
                    department: selectedEmployeeData.department,
                    location: selectedEmployeeData.location,
                    startDate: selectedEmployeeData.startDate,
                    overallStatus:
                      selectedEmployeeData.status === "completed"
                        ? "ready_to_assign"
                        : "in_progress",
                  }}
                  phases={phases}
                  gateStatus={gateStatus}
                />

                <StepUploadDialog
                  isOpen={uploadDialogOpen}
                  onClose={() => {
                    setUploadDialogOpen(false);
                    setUploadStepId(null);
                  }}
                  step={
                    uploadStepId
                      ? phases.flatMap((p) => p.steps).find((s) => s.id === uploadStepId) || null
                      : null
                  }
                  employeeId={selectedEmployeeData.id}
                  onUploadSuccess={handleUploadSuccess}
                />

                <SendFormDialog
                  isOpen={sendFormDialogOpen}
                  onClose={() => {
                    setSendFormDialogOpen(false);
                    setSendFormStepId(null);
                  }}
                  stepTitle={
                    sendFormStepId
                      ? phases
                          .flatMap((p) => p.steps)
                          .find((s) => s.id === sendFormStepId)?.title || ""
                      : ""
                  }
                  candidateName={selectedEmployeeData.name}
                  candidateEmail={selectedEmployeeData.email}
                  onSend={handleFormSend}
                />
              </>
            ) : (
              <div className="rounded-2xl bg-white border border-neutral-200/70 shadow-sm py-20 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-neutral-100 mb-5">
                  <Users className="h-8 w-8 text-neutral-400" />
                </div>
                {candidates.length === 0 ? (
                  <>
                    <h3 className="text-base font-semibold text-neutral-900 mb-1.5">
                      No candidates yet
                    </h3>
                    <p className="text-sm text-neutral-500 max-w-xs mx-auto mb-5">
                      Add a candidate to start their onboarding workflow.
                    </p>
                    <Button
                      onClick={() => setShowAddCandidate(true)}
                      className="h-9 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-xl"
                    >
                      Add Candidate
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-neutral-900 mb-1.5">
                      Select a candidate
                    </h3>
                    <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                      Choose a candidate from the list on the left to view their onboarding workflow.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
    </>
  );
}
