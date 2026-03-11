"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";
import {
  DEFAULT_CAREGIVER_PHASES,
  type CaregiverInfo,
  type CompliancePhase,
  type ComplianceStep,
  type StepStatus,
  type ComplianceDocument,
  type AuditLogEntry,
  StepCardsPanel,
  AuditModeOverlay,
  StepUploadDialog,
  useComplianceGates,
  usePhaseProgress,
} from "./compliance";
import type { EmployeeApiShape } from "@/lib/db/employee.mapper";

interface WorkflowEmployee {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  location: string;
  startDate: string;
  status: "pending" | "in-progress" | "completed";
  progress: number;
  totalSteps: number;
  avatarUrl: string | null;
}

function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    caregiver: "Caregiver",
    cna: "CNA",
    hha: "HHA",
    lpn: "LPN",
    rn: "RN",
    admin: "Admin",
    coordinator: "Coordinator",
    other: "Other",
  };
  return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

function mapEmployeeToWorkflow(employee: EmployeeApiShape): WorkflowEmployee {
  const status =
    employee.status === "onboarding"
      ? "in-progress"
      : employee.status === "active"
        ? "completed"
        : "pending";

  const progress = employee.status === "active" ? 14 : 0;

  return {
    id: employee.id,
    name: `${employee.firstName} ${employee.lastName}`,
    email: employee.email,
    title: formatRole(employee.role),
    department: employee.department,
    location: `${employee.address.city}, ${employee.address.state}`,
    startDate: new Date(employee.startDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status,
    progress,
    totalSteps: 14,
    avatarUrl: employee.avatarUrl,
  };
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

export function WorkflowsDashboard({ section = "onboarding" }: { section?: string }) {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<WorkflowEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Phase workflow state (lifted from ComplianceWorkflowLayout)
  const [phases, setPhases] = useState<CompliancePhase[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [auditModeOpen, setAuditModeOpen] = useState(false);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadStepId, setUploadStepId] = useState<string | null>(null);
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Computed derived values
  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEmployeeData = selectedEmployee
    ? employees.find((e) => e.id === selectedEmployee)
    : null;

  // Reset selected index when filtered employees change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showEmployeeSearch || filteredEmployees.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredEmployees.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredEmployees.length) % filteredEmployees.length);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredEmployees[selectedIndex]) {
            setSelectedEmployee(filteredEmployees[selectedIndex].id);
            setShowEmployeeSearch(false);
            setSearchQuery("");
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowEmployeeSearch(false);
          setSearchQuery("");
          break;
      }
    },
    [showEmployeeSearch, filteredEmployees, selectedIndex]
  );

  useEffect(() => {
    async function fetchEmployees() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiFetch("/api/employees?limit=100");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Failed to fetch employees (${response.status})`;
          console.error("API Error:", errorData);
          throw new Error(errorMessage);
        }
        const result = await response.json();
        const mappedEmployees = result.data.map(mapEmployeeToWorkflow);
        setEmployees(mappedEmployees);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching employees:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  // Initialize phases when employee is selected
  useEffect(() => {
    if (!selectedEmployeeData) {
      setPhases([]);
      setActivePhaseId(null);
      setActiveStepId(null);
      return;
    }

    // Use DEFAULT_CAREGIVER_PHASES as-is without auto-verifying steps
    const initialPhases = DEFAULT_CAREGIVER_PHASES.map((phase) => ({
      ...phase,
      steps: phase.steps.map((step) => ({ ...step })),
    }));

    setPhases(initialPhases);
    setActivePhaseId(
      initialPhases.find((p) => p.status === "in_progress")?.id || initialPhases[0]?.id || null
    );
  }, [selectedEmployeeData]);

  // Fetch existing documents when employee is selected
  useEffect(() => {
    if (!selectedEmployeeData?.id) return;

    const fetchExistingDocuments = async () => {
      try {
        const res = await apiFetch(`/api/employees/${selectedEmployeeData.id}/documents`);
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
  }, [selectedEmployeeData?.id]);

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

  // Handle send form
  const handleStepSendForm = useCallback((stepId: string) => {
    console.log("Send form for step:", stepId);

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

  // Clear employee selection when navigating away from onboarding
  useEffect(() => {
    if (section !== "onboarding") {
      setSelectedEmployee(null);
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

  if (section === "none") {
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

  // ── Employee Onboarding (default) ──
  return (
        <div className="grid gap-5 md:grid-cols-[240px_1fr]">
          {/* Left Sidebar */}
          <div className="rounded-2xl bg-white border border-neutral-200/70 shadow-sm overflow-hidden h-fit self-start">
            {/* Employee Search / selected header */}
            {!selectedEmployeeData || showEmployeeSearch ? (
              <div className="border-b border-neutral-100">
                <div className="p-4 pb-2">
                  <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200/60 rounded-xl px-3 h-9">
                    <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowEmployeeSearch(true)}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-transparent outline-none text-xs placeholder:text-neutral-400 text-neutral-800"
                      placeholder="Search employees..."
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setShowEmployeeSearch(false);
                        }}
                        className="shrink-0 p-0.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {showEmployeeSearch && searchQuery && (
                  <div className="px-4 pb-4 max-h-[280px] overflow-y-auto">
                    {filteredEmployees.length > 0 ? (
                      <div className="space-y-0.5">
                        {filteredEmployees.map((employee, index) => {
                          const initials = employee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

                          return (
                            <button
                              key={employee.id}
                              onClick={() => {
                                setSelectedEmployee(employee.id);
                                setShowEmployeeSearch(false);
                                setSearchQuery("");
                              }}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors rounded-lg",
                                selectedIndex === index ? "bg-neutral-100" : "hover:bg-neutral-50"
                              )}
                            >
                              <div className="h-7 w-7 rounded-full bg-neutral-900 text-white text-[10px] font-semibold grid place-items-center shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-medium text-neutral-900">
                                  {employee.name}
                                </div>
                                <div className="text-[11px] text-neutral-500">
                                  {employee.title} • {employee.department}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-center text-[12px] text-neutral-500 italic">
                        No employee found
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border-b border-neutral-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-neutral-500 mb-0.5">Employee</div>
                    <div className="text-[13px] font-semibold text-neutral-900 truncate">
                      {selectedEmployeeData.name}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowEmployeeSearch(true);
                      setSearchQuery("");
                    }}
                    className="h-7 px-2 text-xs text-neutral-500 hover:text-neutral-900"
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}

            {/* Completion Progress Bar */}
            {selectedEmployeeData && phases.length > 0 && (
              <div className="px-4 py-4 border-b border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-neutral-500">Completion</span>
                    <button
                      type="button"
                      className="text-neutral-400 hover:text-neutral-500 transition-colors"
                      title="Overall onboarding completion across all phases"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-base font-bold text-neutral-900">
                    {Math.round(totalProgress.percentage)}%
                  </span>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalProgress.percentage}%` }}
                  />
                </div>
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

          {/* Right Panel */}
          <div className="w-full min-w-0">
            {selectedEmployeeData && activePhase ? (
              <>
                <div className="rounded-2xl bg-white border border-neutral-200/70 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-neutral-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-neutral-900">
                          {activePhase.phaseName}
                        </h2>
                        <p className="text-sm text-neutral-500 mt-0.5">{activePhase.goal}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {activePhase.status === "complete" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </span>
                        )}
                        {activePhase.status === "in_progress" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                            Phase {activePhase.phaseNumber}
                          </span>
                        )}
                        {activePhase.status === "locked" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
                            Locked
                          </span>
                        )}
                        {(activePhase.status as string) === "not_started" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
                            Phase {activePhase.phaseNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <StepCardsPanel
                      phase={activePhase}
                      activeStepId={activeStepId}
                      onStepSelect={setActiveStepId}
                      onStepStatusChange={handleStepStatusChange}
                      onStepUpload={handleStepUpload}
                      onStepSendForm={handleStepSendForm}
                      onStepDeleteDocument={handleStepDeleteDocument}
                      hideHeader
                    />
                  </div>

                  <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50/40">
                    <Button
                      variant="outline"
                      onClick={
                        isFirstPhase
                          ? () => {
                              setSelectedEmployee(null);
                              setSearchQuery("");
                            }
                          : goToPrevPhase
                      }
                      className="h-9 px-4 text-sm font-medium border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 rounded-xl"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={isLastPhase ? handleAssign : goToNextPhase}
                      disabled={!isLastPhase && !nextPhaseUnlocked}
                      className="h-9 px-5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLastPhase ? "Complete Onboarding" : "Save and Continue"}
                      {!isLastPhase && <ChevronRight className="h-4 w-4 ml-1.5" />}
                    </Button>
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
              </>
            ) : (
              <div className="rounded-2xl bg-white border border-neutral-200/70 shadow-sm py-20 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-neutral-100 mb-5">
                  <Users className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="text-base font-semibold text-neutral-900 mb-1.5">
                  Select an employee to begin
                </h3>
                <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                  Search for an employee in the sidebar to view and manage their onboarding workflow.
                </p>
              </div>
            )}
          </div>
        </div>
  );
}
