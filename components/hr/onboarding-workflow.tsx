"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  FileText,
  Download,
  Eye,
  Send,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  Users,
  Upload,
  X,
  CheckCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: string;
  status: "complete" | "pending" | "missing" | "locked" | "incomplete" | "in-progress";
  documentCount?: number;
  lastUpdated?: string;
  method?: string;
  requiredCount?: number;
  completedCount?: number;
  restricted?: boolean; // For CORI/SORI - restricted admin access
  autoValidation?: boolean; // For system validation steps
  conditional?: {
    field: string;
    value: any;
    skipIf?: boolean;
  };
  outcome?: string; // Expected outcome text
}

interface OnboardingPhase {
  id: string;
  phaseNumber: number;
  phaseName: string;
  goal: string;
  status: "complete" | "in-progress" | "locked" | "pending";
  phaseStatus: string; // e.g., "Internal review", "Offer pending"
  steps: OnboardingStep[];
  lockedUntil?: string; // Phase ID that must complete first
}

type EmployeeRole = "caregiver" | "care-manager" | "tech";

const roleLabels: Record<EmployeeRole, string> = {
  caregiver: "Caregiver",
  "care-manager": "Care Manager",
  tech: "Tech Employee",
};

const caregiverPhases: OnboardingPhase[] = [
  {
    id: "phase-1",
    phaseNumber: 1,
    phaseName: "Pre-Offer Screening",
    goal: "Decide if the caregiver is eligible to hire",
    status: "in-progress",
    phaseStatus: "Internal review",
    steps: [
      {
        id: "step-1",
        stepNumber: 1,
        title: "Application + Caregiver Intake",
        description: "Caregiver Application Form & Caregiver Intake Form",
        status: "complete",
        documentCount: 2,
        lastUpdated: "Jan 14, 2026",
        outcome: "Application on file",
      },
      {
        id: "step-2",
        stepNumber: 2,
        title: "Initial Interview",
        description: "Phone / Video / In-person | Interview Evaluation Form required",
        status: "pending",
        method: "Video",
        outcome: "Interview approved or rejected",
      },
      {
        id: "step-3",
        stepNumber: 3,
        title: "Reference Checks",
        description: "Minimum 2 references (professional preferred) | Document: Date, Contact, Summary",
        status: "pending",
        requiredCount: 2,
        completedCount: 0,
        outcome: "Phase 1 complete → unlock offer",
      },
    ],
  },
  {
    id: "phase-2",
    phaseNumber: 2,
    phaseName: "Conditional Offer",
    goal: "Establish intent before compliance checks",
    status: "locked",
    phaseStatus: "Offer pending",
    lockedUntil: "phase-1",
    steps: [
      {
        id: "step-4",
        stepNumber: 4,
        title: "Issue Conditional Offer Letter",
        description: "Includes acknowledgment of: CORI/SORI clearance, Required training completion, I-9 completion by Day 1, Availability & policy acknowledgements, At-will employment",
        status: "locked",
        outcome: "Offer accepted → unlock compliance",
      },
    ],
  },
  {
    id: "phase-3",
    phaseNumber: 3,
    phaseName: "Post-Offer Compliance Setup",
    goal: "Massachusetts + agency compliance",
    status: "locked",
    phaseStatus: "Compliance in progress",
    lockedUntil: "phase-2",
    steps: [
      {
        id: "step-5",
        stepNumber: 5,
        title: "Background Checks",
        description: "CORI Authorization + Results (confidential) | SORI Search Record (best practice)",
        status: "locked",
        outcome: "Cannot proceed without CORI clearance",
      },
      {
        id: "step-6",
        stepNumber: 6,
        title: "Training & Certification",
        description: "Training module assigned | Assessment completed | Passing score ≥ 80% | Certification auto-generated",
        status: "locked",
        outcome: "Training passed",
      },
      {
        id: "step-7",
        stepNumber: 7,
        title: "Onboarding Packet",
        description: "Signed acknowledgements: HIPAA/Confidentiality, Code of Conduct, Abuse & Neglect Reporting, Handbook, Availability Confirmation, Emergency Contact, Fitness-for-Duty (self-attestation)",
        status: "locked",
        documentCount: 7,
        outcome: "All acknowledgements signed",
      },
      {
        id: "step-8",
        stepNumber: 8,
        title: "Transportation Readiness",
        description: "Conditional logic: If driving → Driver's License, Auto Insurance | If not driving → Transportation Acknowledgement",
        status: "locked",
        conditional: {
          field: "driving",
          value: true,
        },
        outcome: "Transportation verified",
      },
    ],
  },
  {
    id: "phase-4",
    phaseNumber: 4,
    phaseName: "Day 1 Employment Verification",
    goal: "Federal employment compliance",
    status: "locked",
    phaseStatus: "Time-bound",
    lockedUntil: "phase-3",
    steps: [
      {
        id: "step-9",
        stepNumber: 9,
        title: "I-9 Section 1 (Caregiver)",
        description: "Completed no later than Day 1",
        status: "locked",
        outcome: "Section 1 complete",
      },
      {
        id: "step-10",
        stepNumber: 10,
        title: "I-9 Document Review (Employer)",
        description: "Verify original, unexpired documents | Use I-9 checklist",
        status: "locked",
        outcome: "Documents verified",
      },
      {
        id: "step-11",
        stepNumber: 11,
        title: "I-9 Section 2 (Employer)",
        description: "Completed within 3 business days | Stored separately from personnel file",
        status: "locked",
        outcome: "I-9 (Section 1 + 2) complete",
      },
    ],
  },
  {
    id: "phase-5",
    phaseNumber: 5,
    phaseName: "Payroll Setup",
    goal: "Ensure caregiver can be paid legally",
    status: "locked",
    phaseStatus: "Admin setup",
    lockedUntil: "phase-4",
    steps: [
      {
        id: "step-12",
        stepNumber: 12,
        title: "Payroll Forms",
        description: "W-4 | Direct Deposit / Pay Card Consent | MA New Hire Reporting (internal)",
        status: "locked",
        documentCount: 3,
        outcome: "Payroll setup complete",
      },
    ],
  },
  {
    id: "phase-6",
    phaseNumber: 6,
    phaseName: "Ready to Assign",
    goal: "Final safety & compliance gate",
    status: "locked",
    phaseStatus: "System-validated",
    lockedUntil: "phase-5",
    steps: [
      {
        id: "step-13",
        stepNumber: 13,
        title: "System Validation (AUTO)",
        description: "Caregiver is marked READY TO ASSIGN only if ALL are complete: Conditional offer accepted, CORI cleared, SORI cleared, Training passed, All policy acknowledgements signed, I-9 (Section 1 + 2) complete, Payroll setup complete, Emergency contact on file",
        status: "locked",
        autoValidation: true,
        outcome: "🚫 No manual checkbox (optional admin override with audit log)",
      },
      {
        id: "step-14",
        stepNumber: 14,
        title: "First Assignment + Care Plan Review",
        description: "Match caregiver to client | Review: Care plan, Safety risks, Dementia needs, Pets/home hazards | Confirm schedule & reporting | Deliver: First-Day One-Pager, Name Badge (mandatory)",
        status: "locked",
        outcome: "First assignment completed",
      },
    ],
  },
];

const careManagerPhases: OnboardingPhase[] = [
  {
    id: "cm-phase-1",
    phaseNumber: 1,
    phaseName: "Pre-Offer Screening",
    goal: "Validate clinical qualifications and fit",
    status: "in-progress",
    phaseStatus: "Internal review",
    steps: [
      {
        id: "cm-step-1",
        stepNumber: 1,
        title: "Application + Care Manager Intake",
        description: "Clinical background, caseload experience, and leadership profile",
        status: "complete",
        documentCount: 1,
        lastUpdated: "Jan 14, 2026",
        outcome: "Application on file",
      },
      {
        id: "cm-step-2",
        stepNumber: 2,
        title: "Panel Interview",
        description: "Clinical + operations interview with scoring rubric",
        status: "pending",
        method: "Video",
        outcome: "Interview approved or rejected",
      },
      {
        id: "cm-step-3",
        stepNumber: 3,
        title: "License & Credential Verification",
        description: "Validate RN/LPN license, CPR, and supervisory credentials",
        status: "pending",
        requiredCount: 3,
        completedCount: 1,
        outcome: "Credentials verified",
      },
    ],
  },
  {
    id: "cm-phase-2",
    phaseNumber: 2,
    phaseName: "Conditional Offer",
    goal: "Establish intent before compliance checks",
    status: "locked",
    phaseStatus: "Offer pending",
    lockedUntil: "cm-phase-1",
    steps: [
      {
        id: "cm-step-4",
        stepNumber: 4,
        title: "Issue Conditional Offer Letter",
        description: "Includes compliance checks and role expectations",
        status: "locked",
        outcome: "Offer accepted → unlock compliance",
      },
    ],
  },
  {
    id: "cm-phase-3",
    phaseNumber: 3,
    phaseName: "Compliance & Access",
    goal: "Clear compliance and grant clinical access",
    status: "locked",
    phaseStatus: "Compliance in progress",
    lockedUntil: "cm-phase-2",
    steps: [
      {
        id: "cm-step-5",
        stepNumber: 5,
        title: "Background Checks",
        description: "CORI/SORI clearance and professional references",
        status: "locked",
        outcome: "Clearance confirmed",
      },
      {
        id: "cm-step-6",
        stepNumber: 6,
        title: "Policy + Clinical Systems Training",
        description: "Clinical documentation standards and EMR walkthrough",
        status: "locked",
        outcome: "Training completed",
      },
      {
        id: "cm-step-7",
        stepNumber: 7,
        title: "Onboarding Packet",
        description: "Signed acknowledgements and role-specific policies",
        status: "locked",
        documentCount: 5,
        outcome: "All acknowledgements signed",
      },
    ],
  },
  {
    id: "cm-phase-4",
    phaseNumber: 4,
    phaseName: "Ready for Caseload",
    goal: "Finalize access and caseload readiness",
    status: "locked",
    phaseStatus: "System-validated",
    lockedUntil: "cm-phase-3",
    steps: [
      {
        id: "cm-step-8",
        stepNumber: 8,
        title: "System Validation",
        description: "All compliance and training complete before assignment",
        status: "locked",
        autoValidation: true,
        outcome: "Role validated",
      },
      {
        id: "cm-step-9",
        stepNumber: 9,
        title: "First Caseload Review",
        description: "Review care plans, risk flags, and coverage plan",
        status: "locked",
        outcome: "First caseload approved",
      },
    ],
  },
];

const techEmployeePhases: OnboardingPhase[] = [
  {
    id: "tech-phase-1",
    phaseNumber: 1,
    phaseName: "Pre-Offer Screening",
    goal: "Assess technical skills and team fit",
    status: "in-progress",
    phaseStatus: "Internal review",
    steps: [
      {
        id: "tech-step-1",
        stepNumber: 1,
        title: "Application + Technical Intake",
        description: "Portfolio, skills matrix, and experience summary",
        status: "complete",
        documentCount: 1,
        lastUpdated: "Jan 14, 2026",
        outcome: "Application on file",
      },
      {
        id: "tech-step-2",
        stepNumber: 2,
        title: "Technical Interview",
        description: "Assessment + live problem solving",
        status: "pending",
        method: "Video",
        outcome: "Interview approved or rejected",
      },
      {
        id: "tech-step-3",
        stepNumber: 3,
        title: "Reference Checks",
        description: "Minimum 2 references (project or team-based)",
        status: "pending",
        requiredCount: 2,
        completedCount: 0,
        outcome: "Phase 1 complete → unlock offer",
      },
    ],
  },
  {
    id: "tech-phase-2",
    phaseNumber: 2,
    phaseName: "Conditional Offer",
    goal: "Confirm intent and start compliance",
    status: "locked",
    phaseStatus: "Offer pending",
    lockedUntil: "tech-phase-1",
    steps: [
      {
        id: "tech-step-4",
        stepNumber: 4,
        title: "Issue Conditional Offer Letter",
        description: "Includes compliance checks and equipment policy",
        status: "locked",
        outcome: "Offer accepted → unlock access",
      },
    ],
  },
  {
    id: "tech-phase-3",
    phaseNumber: 3,
    phaseName: "Security + Access",
    goal: "Complete security, IT, and access requirements",
    status: "locked",
    phaseStatus: "Compliance in progress",
    lockedUntil: "tech-phase-2",
    steps: [
      {
        id: "tech-step-5",
        stepNumber: 5,
        title: "Background Check",
        description: "Standard background verification",
        status: "locked",
        outcome: "Clearance confirmed",
      },
      {
        id: "tech-step-6",
        stepNumber: 6,
        title: "Security Training + NDA",
        description: "HIPAA basics, data handling, and NDA signature",
        status: "locked",
        documentCount: 2,
        outcome: "Security compliance complete",
      },
      {
        id: "tech-step-7",
        stepNumber: 7,
        title: "Account Provisioning",
        description: "Email, SSO, tools, and access permissions",
        status: "locked",
        outcome: "Access granted",
      },
    ],
  },
  {
    id: "tech-phase-4",
    phaseNumber: 4,
    phaseName: "Ready for Assignment",
    goal: "Finalize onboarding and assign first project",
    status: "locked",
    phaseStatus: "System-validated",
    lockedUntil: "tech-phase-3",
    steps: [
      {
        id: "tech-step-8",
        stepNumber: 8,
        title: "System Validation",
        description: "All compliance and access complete",
        status: "locked",
        autoValidation: true,
        outcome: "Role validated",
      },
      {
        id: "tech-step-9",
        stepNumber: 9,
        title: "First Project Kickoff",
        description: "Review backlog, team rituals, and delivery plan",
        status: "locked",
        outcome: "Project kickoff completed",
      },
    ],
  },
];

const roleTemplates: Record<EmployeeRole, OnboardingPhase[]> = {
  caregiver: caregiverPhases,
  "care-manager": careManagerPhases,
  tech: techEmployeePhases,
};

const clonePhases = (phases: OnboardingPhase[]) =>
  phases.map((phase) => ({
    ...phase,
    steps: phase.steps.map((step) => ({ ...step })),
  }));

interface OnboardingWorkflowProps {
  employeeId?: string;
  employeeEmail?: string;
  employeeName?: string;
  employeeTitle?: string;
  employeeDepartment?: string;
  employeeLocation?: string;
  employeeStartDate?: string;
  employeeStatus?: "completed" | "in-progress" | "pending";
}

export function OnboardingWorkflow({
  employeeId,
  employeeEmail,
  employeeName,
  employeeTitle,
  employeeDepartment,
  employeeLocation,
  employeeStartDate,
  employeeStatus,
}: OnboardingWorkflowProps) {
  const [role, setRole] = useState<EmployeeRole | null>(null);
  const [phases, setPhases] = useState<OnboardingPhase[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("screening");
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
  const [previewDocument, setPreviewDocument] = useState<{ name: string; url: string } | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  useEffect(() => {
    if (!role) {
      setPhases([]);
      return;
    }
    setPhases(clonePhases(roleTemplates[role]));
  }, [role]);

  // Calculate overall progress
  const totalSteps = useMemo(() => {
    return phases.reduce((acc, phase) => acc + phase.steps.length, 0);
  }, [phases]);
  const completedSteps = useMemo(() => {
    return phases.reduce(
      (acc, phase) =>
        acc + phase.steps.filter((s) => s.status === "complete").length,
      0
    );
  }, [phases]);

  const overallProgress = useMemo(() => {
    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  }, [completedSteps, totalSteps]);

  // Get current phase
  const currentPhase = useMemo(() => {
    return phases.find((p) => p.status === "in-progress") || phases[0];
  }, [phases]);

  // Get next required step
  const nextStep = useMemo(() => {
    for (const phase of phases) {
      if (phase.status === "locked") continue;
      const pendingStep = phase.steps.find((s) => s.status === "pending");
      if (pendingStep) {
        return { phase, step: pendingStep };
      }
    }
    return null;
  }, [phases]);

  // System validation for Phase 6, Step 13
  const isReadyToAssign = useMemo(() => {
    if (role !== "caregiver") return false;
    // Check if all previous phases are complete
    const phasesBefore6 = phases.slice(0, 5);
    const allPhasesComplete = phasesBefore6.every(
      (p) => p.status === "complete"
    );

    if (!allPhasesComplete) return false;

    // Check specific requirements for Phase 6
    const phase3 = phases.find((p) => p.id === "phase-3");
    const phase4 = phases.find((p) => p.id === "phase-4");
    const phase5 = phases.find((p) => p.id === "phase-5");

    const coriCleared =
      phase3?.steps.find((s) => s.id === "step-5")?.status === "complete";
    const trainingPassed =
      phase3?.steps.find((s) => s.id === "step-6")?.status === "complete";
    const onboardingPacket =
      phase3?.steps.find((s) => s.id === "step-7")?.status === "complete";
    const i9Complete =
      phase4?.steps.every((s) => s.status === "complete") || false;
    const payrollComplete =
      phase5?.steps.every((s) => s.status === "complete") || false;

    return (
      coriCleared &&
      trainingPassed &&
      onboardingPacket &&
      i9Complete &&
      payrollComplete
    );
  }, [phases, role]);

  // Track completed phase IDs to unlock dependent phases
  const completedPhaseIds = useMemo(() => {
    return phases
      .filter((p) => p.status === "complete")
      .map((p) => p.id);
  }, [phases]);

  // Auto-unlock phases and their steps when prerequisites are met
  React.useEffect(() => {
    setPhases((prevPhases) => {
      let hasChanges = false;
      const updatedPhases = prevPhases.map((phase) => {
        // If phase is unlocked (pending or in-progress) but has locked steps, unlock them
        if ((phase.status === "pending" || phase.status === "in-progress") && phase.lockedUntil) {
          // Check if prerequisite phase is complete
          if (completedPhaseIds.includes(phase.lockedUntil)) {
            const hasLockedSteps = phase.steps.some((s) => s.status === "locked");
            if (hasLockedSteps) {
              hasChanges = true;
              return {
                ...phase,
                steps: phase.steps.map((step) =>
                  step.status === "locked"
                    ? { ...step, status: "pending" as const }
                    : step
                ),
              };
            }
          }
        }
        return phase;
      });
      return hasChanges ? updatedPhases : prevPhases;
    });
  }, [completedPhaseIds]);

  // Auto-update Phase 6 Step 13 based on validation
  React.useEffect(() => {
    if (isReadyToAssign) {
      setPhases((prevPhases) =>
        prevPhases.map((phase) =>
          phase.id === "phase-6"
            ? {
                ...phase,
                status: "in-progress",
                steps: phase.steps.map((step) =>
                  step.id === "step-13"
                    ? { ...step, status: "complete" as const }
                    : step
                ),
              }
            : phase
        )
      );
    }
  }, [isReadyToAssign]);

  // Get compliance gaps
  const complianceGaps = useMemo(() => {
    const gaps: Array<{ phase: string; step: string; issue: string }> = [];
    phases.forEach((phase) => {
      if (phase.status === "locked") return;
      phase.steps.forEach((step) => {
        if (step.status === "missing" || step.status === "pending") {
          gaps.push({
            phase: phase.phaseName,
            step: step.title,
            issue: step.status === "missing" ? "Required document missing" : "Pending completion",
          });
        }
      });
    });
    return gaps;
  }, [phases]);

  const updateStepStatus = (
    phaseId: string,
    stepId: string,
    status: OnboardingStep["status"]
  ) => {
    setPhases((prevPhases) => {
      // First, update the step status
      const updatedPhases = prevPhases.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              steps: phase.steps.map((step) =>
                step.id === stepId ? { ...step, status } : step
              ),
            }
          : phase
      );

      // Then, update phase status based on all steps
      const updatedPhasesWithStatus = updatedPhases.map((phase) => {
        if (phase.id === phaseId) {
          const allStepsComplete = phase.steps.every((s) => s.status === "complete");
          const hasInProgressSteps = phase.steps.some((s) => 
            s.status === "pending" || s.status === "in-progress"
          );
          
          let newPhaseStatus: OnboardingPhase["status"];
          if (allStepsComplete) {
            newPhaseStatus = "complete";
          } else if (phase.status === "locked") {
            newPhaseStatus = "locked";
          } else if (hasInProgressSteps || phase.steps.some((s) => s.status === "pending")) {
            newPhaseStatus = "in-progress";
          } else {
            newPhaseStatus = phase.status;
          }

          return {
            ...phase,
            status: newPhaseStatus,
          };
        }
        return phase;
      });

      // Check if the updated phase is now complete and unlock next phase
      const completedPhase = updatedPhasesWithStatus.find((p) => p.id === phaseId);
      if (
        completedPhase &&
        completedPhase.status === "complete" &&
        completedPhase.steps.every((s) => s.status === "complete")
      ) {
        // Unlock the next phase that was locked until this phase
        return updatedPhasesWithStatus.map((phase) =>
          phase.lockedUntil === phaseId
            ? {
                ...phase,
                status: "pending" as const,
                // Also unlock all steps in the unlocked phase
                steps: phase.steps.map((step) =>
                  step.status === "locked"
                    ? { ...step, status: "pending" as const }
                    : step
                ),
              }
            : phase
        );
      }

      return updatedPhasesWithStatus;
    });
  };

  const getStatusIcon = (status: OnboardingStep["status"]) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-slate-800" />;
      case "pending":
        return <Clock className="h-4 w-4 text-slate-700" />;
      case "missing":
        return <AlertCircle className="h-4 w-4 text-slate-700" />;
      case "locked":
        return <Lock className="h-4 w-4 text-muted-foreground" />;
      case "incomplete":
        return <AlertTriangle className="h-4 w-4 text-slate-700" />;
    }
  };

  const getStatusBadge = (status: OnboardingStep["status"]) => {
    switch (status) {
      case "complete":
        return (
          <Badge className="bg-slate-900 text-white text-[10px] border-0 shadow-sm">
            Complete
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-slate-700 text-white text-[10px] border-0 shadow-sm">
            Pending
          </Badge>
        );
      case "missing":
        return (
          <Badge className="bg-slate-600 text-white text-[10px] border-0 shadow-sm">
            Missing
          </Badge>
        );
      case "locked":
        return (
          <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
            Locked
          </Badge>
        );
      case "incomplete":
        return (
          <Badge className="bg-slate-600 text-white text-[10px] border-0 shadow-sm">
            Incomplete
          </Badge>
        );
    }
  };

  const getPhaseStatusBadge = (status: OnboardingPhase["status"]) => {
    switch (status) {
      case "complete":
        return (
          <Badge className="bg-slate-900 text-white text-xs border-0 shadow-md">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-slate-700 text-white text-xs border-0 shadow-md">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "locked":
        return (
          <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
            <Lock className="h-3 w-3 mr-1" />
            Locked
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
            Pending
          </Badge>
        );
    }
  };

  const getTreeStatus = React.useCallback((phaseNumbers: number[]) => {
    const relevantPhases = phases.filter((phase) =>
      phaseNumbers.includes(phase.phaseNumber)
    );
    if (relevantPhases.length === 0) return "pending";
    if (relevantPhases.every((phase) => phase.status === "complete")) return "complete";
    if (relevantPhases.some((phase) => phase.status === "in-progress")) return "in-progress";
    if (relevantPhases.some((phase) => phase.status === "locked")) return "locked";
    return "pending";
  }, [phases]);

  const treeSteps = useMemo(() => {
    const steps = [
      {
        id: "screening",
        title: "Screening",
        description: "Application, interview, and references.",
        phaseNumbers: [1],
        documents: [
          "Caregiver application",
          "Interview evaluation",
          "Reference checks",
        ],
      },
      {
        id: "offer",
        title: "Conditional Offer",
        description: "Offer letter and policy acknowledgements.",
        phaseNumbers: [2],
        documents: ["Offer letter", "Policy acknowledgements", "Availability form"],
      },
      {
        id: "compliance",
        title: "Compliance + Ready",
        description: "Compliance, training, and readiness validation.",
        phaseNumbers: [3, 4, 5, 6],
        documents: ["Background checks", "Training certificate", "I-9 documents"],
      },
    ];

    return steps.map((step) => ({
      ...step,
      status: getTreeStatus(step.phaseNumbers),
    }));
  }, [phases, getTreeStatus]);

  const selectedBranch = treeSteps.find((step) => step.id === selectedBranchId) || treeSteps[0];

  // Handle file upload
  const handleFileUpload = (documentId: string, files: FileList) => {
    const fileArray = Array.from(files);
    setUploadedFiles((prev) => ({
      ...prev,
      [documentId]: [...(prev[documentId] || []), ...fileArray],
    }));
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent, documentId: string) => {
    e.preventDefault();
    setIsDragging(documentId);
  };

  const handleDragLeave = () => {
    setIsDragging(null);
  };

  const handleDrop = (e: React.DragEvent, documentId: string) => {
    e.preventDefault();
    setIsDragging(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(documentId, e.dataTransfer.files);
    }
  };

  const removeFile = (documentId: string, fileIndex: number) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [documentId]: prev[documentId].filter((_, i) => i !== fileIndex),
    }));
  };

  const previewFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewDocument({ name: file.name, url });
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/70 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-slate-700 to-slate-900" />
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">
                  {employeeName || "New Employee"}
                </h3>
                {employeeStatus && (
                  <Badge
                    className={cn(
                      "text-[10px] font-medium border-0",
                      employeeStatus === "completed" && "bg-slate-900 text-white",
                      employeeStatus === "in-progress" && "bg-slate-700 text-white",
                      employeeStatus === "pending" && "bg-slate-500 text-white"
                    )}
                  >
                    {employeeStatus === "completed"
                      ? "Complete"
                      : employeeStatus === "in-progress"
                      ? "In Progress"
                      : "Pending"}
                  </Badge>
                )}
              </div>
              {employeeTitle && (
                <p className="text-sm text-slate-700">{employeeTitle}</p>
              )}
              {employeeEmail && (
                <p className="text-xs text-muted-foreground">{employeeEmail}</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Department:</span>
                <span>{employeeDepartment || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Location:</span>
                <span>{employeeLocation || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Start date:</span>
                <span>{employeeStartDate || "—"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/60 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-slate-700 to-slate-900" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-700" />
                Hiring Workflow Progress
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Track progress through each phase with visual indicators
              </p>
            </div>
            {nextStep && (
              <Badge className="bg-slate-900 text-white border-0 text-xs animate-pulse">
                Next: {nextStep.step.title}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enhanced Tree Visualization */}
          <div className="relative rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              {treeSteps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex-1 relative group">
                    <button
                      type="button"
                      onClick={() => setSelectedBranchId(step.id)}
                      className={cn(
                        "w-full relative overflow-hidden rounded-2xl border-2 transition-all duration-300 transform",
                        selectedBranchId === step.id
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg scale-105"
                          : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-md hover:scale-102"
                      )}
                    >
                      {/* Animated background gradient */}
                      {selectedBranchId === step.id && (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 opacity-100" />
                      )}

                      <div className="relative p-4">
                        {/* Status indicator with animation */}
                        <div className="flex items-center justify-center mb-3">
                          <div
                            className={cn(
                              "flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300",
                              step.status === "complete" && "bg-green-500 text-white shadow-lg shadow-green-500/50 animate-bounce-slow",
                              step.status === "in-progress" && "bg-blue-500 text-white shadow-lg shadow-blue-500/50 animate-pulse",
                              step.status === "locked" && "bg-slate-300 text-slate-600",
                              step.status === "pending" && "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
                              selectedBranchId === step.id && "bg-white/20 ring-4 ring-white/30"
                            )}
                          >
                            {step.status === "complete" ? (
                              <CheckCheck className="h-7 w-7" />
                            ) : (
                              getStatusIcon(step.status as OnboardingStep["status"])
                            )}
                          </div>
                        </div>

                        {/* Step info */}
                        <div className="text-center">
                          <div className={cn(
                            "text-sm font-bold mb-1",
                            selectedBranchId === step.id ? "text-white" : "text-slate-900"
                          )}>
                            {step.title}
                          </div>
                          <div className={cn(
                            "text-[10px] leading-tight",
                            selectedBranchId === step.id ? "text-white/80" : "text-muted-foreground"
                          )}>
                            {step.description}
                          </div>
                        </div>

                        {/* Progress badge */}
                        <div className="mt-3 flex justify-center">
                          {step.status === "complete" && (
                            <Badge className="bg-green-500 text-white text-[10px] border-0">
                              ✓ Complete
                            </Badge>
                          )}
                          {step.status === "in-progress" && (
                            <Badge className="bg-blue-500 text-white text-[10px] border-0">
                              In Progress
                            </Badge>
                          )}
                          {step.status === "pending" && (
                            <Badge className="bg-amber-500 text-white text-[10px] border-0">
                              Pending
                            </Badge>
                          )}
                          {step.status === "locked" && (
                            <Badge variant="outline" className="text-[10px] border-slate-300">
                              Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Animated connector arrow */}
                  {index < treeSteps.length - 1 && (
                    <div className="hidden md:flex items-center justify-center px-2">
                      <div className="relative">
                        <ArrowRight
                          className={cn(
                            "h-8 w-8 transition-all duration-300",
                            treeSteps[index].status === "complete"
                              ? "text-green-500 animate-pulse"
                              : "text-slate-300"
                          )}
                        />
                        {treeSteps[index].status === "complete" && (
                          <div className="absolute inset-0 bg-green-500 blur-xl opacity-30 animate-pulse" />
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {selectedBranch && (
            <Card className="border-2 border-slate-200 overflow-hidden">
              <div className={cn(
                "h-1 transition-all duration-300",
                selectedBranch.status === "complete" && "bg-green-500",
                selectedBranch.status === "in-progress" && "bg-blue-500",
                selectedBranch.status === "pending" && "bg-amber-500",
                selectedBranch.status === "locked" && "bg-slate-300"
              )} />
              <CardHeader className="pb-2 bg-gradient-to-br from-white to-slate-50">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-700" />
                      {selectedBranch.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{selectedBranch.description}</p>
                  </div>
                  {getStatusBadge(selectedBranch.status as OnboardingStep["status"])}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700">
                    Required Documents ({selectedBranch.documents.length})
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedBranch.documents.filter((doc) => uploadedFiles[doc]?.length > 0).length} / {selectedBranch.documents.length} uploaded
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedBranch.documents.map((doc) => {
                    const isComplete = selectedBranch.status === "complete";
                    const files = uploadedFiles[doc] || [];
                    const hasFiles = files.length > 0;

                    return (
                      <div
                        key={doc}
                        className={cn(
                          "rounded-xl border-2 transition-all duration-200",
                          isDragging === doc
                            ? "border-blue-500 bg-blue-50 shadow-lg"
                            : hasFiles || isComplete
                            ? "border-green-200 bg-green-50/50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                        onDragOver={(e) => handleDragOver(e, doc)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, doc)}
                      >
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-start gap-2 flex-1">
                              <div className={cn(
                                "p-2 rounded-lg",
                                hasFiles || isComplete ? "bg-green-500" : "bg-slate-100"
                              )}>
                                <FileText className={cn(
                                  "h-4 w-4",
                                  hasFiles || isComplete ? "text-white" : "text-slate-600"
                                )} />
                              </div>
                              <div className="flex-1">
                                <div className="text-xs font-semibold text-slate-900">{doc}</div>
                                {hasFiles && (
                                  <div className="text-[10px] text-green-600 mt-0.5">
                                    {files.length} file{files.length > 1 ? 's' : ''} uploaded
                                  </div>
                                )}
                              </div>
                            </div>

                            {isComplete || hasFiles ? (
                              <div className="flex items-center gap-1">
                                <Badge className={cn(
                                  "text-[10px] border-0",
                                  isComplete ? "bg-green-500 text-white" : "bg-blue-500 text-white"
                                )}>
                                  {isComplete ? "✓ Complete" : "Uploaded"}
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                                Required
                              </Badge>
                            )}
                          </div>

                          {/* File upload section */}
                          {!isComplete && (
                            <div className="space-y-2">
                              {files.length > 0 && (
                                <div className="space-y-1">
                                  {files.map((file, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-2 py-1.5"
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="h-3 w-3 text-slate-500 flex-shrink-0" />
                                        <span className="text-[10px] truncate">{file.name}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                          ({(file.size / 1024).toFixed(1)} KB)
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={() => previewFile(file)}
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                          onClick={() => removeFile(doc, index)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Upload button */}
                              <label
                                className={cn(
                                  "flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 cursor-pointer transition-all",
                                  isDragging === doc
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                                )}
                              >
                                <Upload className="h-3 w-3 text-slate-600" />
                                <span className="text-xs text-slate-700">
                                  {isDragging === doc ? "Drop files here" : "Click to upload or drag & drop"}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  multiple
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      handleFileUpload(doc, e.target.files);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}

                          {/* View/Download for completed documents */}
                          {isComplete && (
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="outline" className="flex-1 text-xs h-7 border-slate-300">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 text-xs h-7 border-slate-300">
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Preview Dialog */}
          {previewDocument && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setPreviewDocument(null)}
            >
              <div
                className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-700" />
                    <h3 className="font-semibold text-sm">{previewDocument.name}</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewDocument(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 bg-slate-50 overflow-auto max-h-[calc(90vh-80px)]">
                  <div className="bg-white rounded-lg p-8 text-center">
                    <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Preview for: {previewDocument.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      File preview functionality can be enhanced based on file type
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header with Status and Progress */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/70 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-slate-700 to-slate-900" />
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">
                  {employeeName || "New Employee"}
                </h3>
                {currentPhase && (
                  <Badge className="bg-slate-800 text-white border-0 text-xs shadow-md">
                    {currentPhase.phaseName} (Phase {currentPhase.phaseNumber} of {phases.length})
                  </Badge>
                )}
                {role && (
                  <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">
                    {roleLabels[role]}
                  </Badge>
                )}
              </div>
              {employeeEmail && (
                <p className="text-sm text-muted-foreground">{employeeEmail}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">
                {totalSteps === 0 ? "—" : `${Math.round(overallProgress)}%`}
              </div>
              <div className="text-xs text-muted-foreground">
                {totalSteps === 0
                  ? "Select a role to start onboarding"
                  : completedSteps === totalSteps
                  ? `Workflow Complete (${completedSteps}/${totalSteps})`
                  : `Overall Completion (${completedSteps}/${totalSteps} steps)`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-xs text-muted-foreground">Employee role</span>
            {(Object.keys(roleLabels) as EmployeeRole[]).map((roleKey) => (
              <Button
                key={roleKey}
                size="sm"
                variant="outline"
                className={cn(
                  "text-xs h-7 border-2",
                  role === roleKey
                    ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                )}
                onClick={() => setRole(roleKey)}
              >
                {roleLabels[roleKey]}
              </Button>
            ))}
          </div>

          {totalSteps > 0 && (
            <div className="relative mb-4">
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    completedSteps === totalSteps
                      ? "bg-slate-900"
                      : "bg-gradient-to-r from-slate-600 to-slate-800"
                  )}
                  style={{ width: `${completedSteps === totalSteps ? 100 : overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {!role && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-600">
              Select whether this employee is a caregiver, care manager, or tech employee to load
              the correct onboarding workflow.
            </div>
          )}

          {/* Action buttons and alerts */}
          <div className="space-y-3">
            {/* Next step alert */}
            {nextStep && (
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 p-3 animate-slide-in-right">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <ChevronRight className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-blue-900 mb-1">
                      Next Required Step
                    </div>
                    <div className="text-xs text-blue-800">
                      <span className="font-medium">{nextStep.phase.phaseName}:</span> {nextStep.step.title}
                    </div>
                    {nextStep.step.description && (
                      <div className="text-[10px] text-blue-700 mt-1">
                        {nextStep.step.description}
                      </div>
                    )}
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                    Start Now
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Compliance gaps alert */}
            {complianceGaps.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-200 p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-amber-900 mb-1">
                      {complianceGaps.length} Compliance Gap{complianceGaps.length > 1 ? 's' : ''} Found
                    </div>
                    <div className="space-y-1">
                      {complianceGaps.slice(0, 2).map((gap, index) => (
                        <div key={index} className="text-[10px] text-amber-800">
                          • {gap.phase}: {gap.step}
                        </div>
                      ))}
                      {complianceGaps.length > 2 && (
                        <div className="text-[10px] text-amber-700">
                          + {complianceGaps.length - 2} more gap{complianceGaps.length - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs h-8">
                    View All
                  </Button>
                </div>
              </div>
            )}

            {/* Locked phases alert */}
            {phases.filter((p) => p.status === "locked").length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-400 rounded-lg">
                    <Lock className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-900 mb-1">
                      {phases.filter((p) => p.status === "locked").length} Phase{phases.filter((p) => p.status === "locked").length > 1 ? 's' : ''} Locked
                    </div>
                    <div className="text-[10px] text-slate-700">
                      Complete current phase to unlock the next steps
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-2"
              >
                <Download className="h-3 w-3 mr-1" />
                Download Audit Report
              </Button>
              {completedSteps === totalSteps && totalSteps > 0 && (
                <Badge className="bg-green-500 text-white text-xs border-0 animate-pulse">
                  🎉 Workflow Complete!
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {totalSteps > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-3">
        {phases.map((phase) => {
          const phaseCompleted = phase.steps.filter((s) => s.status === "complete").length;
          const phaseTotal = phase.steps.length;
          const isLocked = phase.status === "locked";

          return (
            <Card
              key={phase.id}
              className={cn(
                "transition-all border-0 shadow-md hover:shadow-lg overflow-hidden",
                phase.status === "complete" && "bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300",
                phase.status === "in-progress" && "bg-gradient-to-br from-slate-50 to-slate-100/60 border-2 border-slate-200",
                isLocked && "opacity-60 bg-gradient-to-br from-slate-50 to-slate-100/50"
              )}
            >
              {phase.status === "complete" && (
                <div className="h-1 bg-gradient-to-r from-slate-700 to-slate-900" />
              )}
              {phase.status === "in-progress" && (
                <div className="h-1 bg-gradient-to-r from-slate-600 to-slate-800" />
              )}
              {isLocked && (
                <div className="h-1 bg-gradient-to-r from-slate-300 to-slate-400" />
              )}
              <AccordionItem value={phase.id} className="border-0">
                <AccordionTrigger
                  className={cn(
                    "px-6 py-4 hover:no-underline",
                    isLocked && "cursor-not-allowed"
                  )}
                  disabled={isLocked}
                >
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      {phase.status === "complete" ? (
                        <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200">
                          <CheckCircle2 className="h-5 w-5 text-slate-800 flex-shrink-0" />
                        </div>
                      ) : phase.status === "in-progress" ? (
                        <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200">
                          <Clock className="h-5 w-5 text-slate-700 flex-shrink-0" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200">
                          <Lock className="h-5 w-5 text-slate-500 flex-shrink-0" />
                        </div>
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold">
                            Phase {phase.phaseNumber}: {phase.phaseName}
                          </h4>
                          {getPhaseStatusBadge(phase.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            Goal: {phase.goal}
                          </p>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">
                            Status: {phase.phaseStatus}
                          </p>
                        </div>
                        {isLocked && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Complete all previous phases to unlock
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold">
                        {phaseCompleted} / {phaseTotal} complete
                      </div>
                      <div className="w-32 bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all duration-500",
                            phase.status === "complete"
                              ? "bg-slate-900"
                              : phase.status === "in-progress"
                              ? "bg-slate-700"
                              : "bg-slate-500"
                          )}
                          style={{
                            width: `${(phaseCompleted / phaseTotal) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Mini progress timeline */}
                    <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 p-3 border border-slate-200">
                      <div className="text-[10px] font-semibold text-slate-700 mb-2">
                        Phase Progress Timeline
                      </div>
                      <div className="flex items-center gap-2">
                        {phase.steps.map((step, stepIndex) => (
                          <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
                                  step.status === "complete" && "bg-green-500 text-white shadow-lg shadow-green-500/30",
                                  step.status === "pending" && "bg-blue-400 text-white",
                                  step.status === "missing" && "bg-amber-400 text-white",
                                  step.status === "incomplete" && "bg-red-400 text-white",
                                  step.status === "locked" && "bg-slate-300 text-slate-600"
                                )}
                              >
                                {stepIndex + 1}
                              </div>
                              <div className="text-[8px] text-muted-foreground max-w-[40px] text-center truncate">
                                {step.title.split(' ')[0]}
                              </div>
                            </div>
                            {stepIndex < phase.steps.length - 1 && (
                              <div
                                className={cn(
                                  "flex-1 h-0.5 transition-all duration-300",
                                  step.status === "complete" ? "bg-green-500" : "bg-slate-300"
                                )}
                              />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    {phase.steps.map((step) => (
                      <div
                        key={step.id}
                        className={cn(
                          "border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md",
                          step.status === "complete" &&
                            "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300",
                          step.status === "pending" &&
                            "bg-gradient-to-br from-slate-50 to-slate-100/60 border-slate-300",
                          step.status === "missing" && "bg-gradient-to-br from-slate-50 to-slate-100/60 border-slate-300",
                          step.status === "locked" && "bg-gradient-to-br from-slate-50/50 to-slate-100/50 opacity-60 border-slate-300",
                          step.status === "incomplete" && "bg-gradient-to-br from-slate-50 to-slate-100/60 border-slate-300"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-0.5">{getStatusIcon(step.status)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-xs font-semibold">{step.title}</h5>
                                {getStatusBadge(step.status)}
                                {step.autoValidation && (
                                  <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-700">
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                    Auto-Validated
                                  </Badge>
                                )}
                              </div>
                              {step.description && (
                                <p className="text-[10px] text-muted-foreground mb-2">
                                  {step.description}
                                </p>
                              )}

                              {/* Step-specific details */}
                              <div className="space-y-1">
                                {step.documentCount !== undefined && (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <FileText className="h-3 w-3" />
                                    <span>Documents: {step.documentCount} required</span>
                                  </div>
                                )}
                                {step.method && (
                                  <div className="text-[10px] text-muted-foreground">
                                    Method: {step.method}
                                  </div>
                                )}
                                {step.requiredCount && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {step.completedCount || 0} / {step.requiredCount}{" "}
                                    completed
                                  </div>
                                )}
                                {step.lastUpdated && (
                                  <div className="text-[10px] text-muted-foreground">
                                    Last updated: {step.lastUpdated}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {step.status === "pending" && (
                              <>
                                {step.title.includes("Interview") && (
                                  <Button size="sm" variant="default" className="text-xs h-7">
                                    Start Interview
                                  </Button>
                                )}
                                {step.title.includes("Form") && (
                                  <Button size="sm" variant="default" className="text-xs h-7">
                                    <Send className="h-3 w-3 mr-1" />
                                    Send Form
                                  </Button>
                                )}
                                {step.id === "step-1" && (
                                  <Button size="sm" variant="outline" className="text-xs h-7">
                                    <Download className="h-3 w-3 mr-1" />
                                    Download Form
                                  </Button>
                                )}
                                {step.id === "step-3" && (
                                  <Button size="sm" variant="outline" className="text-xs h-7">
                                    <Download className="h-3 w-3 mr-1" />
                                    Download Reference Check
                                  </Button>
                                )}
                                {!step.autoValidation && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7"
                                    onClick={() =>
                                      updateStepStatus(phase.id, step.id, "complete")
                                    }
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Mark Complete
                                  </Button>
                                )}
                              </>
                            )}
                            {step.status === "complete" && (
                              <>
                                <Button size="sm" variant="ghost" className="text-xs h-7">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                {step.id === "step-1" ? (
                                  <Button size="sm" variant="ghost" className="text-xs h-7">
                                    <Download className="h-3 w-3 mr-1" />
                                    Download Form
                                  </Button>
                                ) : step.id === "step-3" ? (
                                  <Button size="sm" variant="ghost" className="text-xs h-7">
                                    <Download className="h-3 w-3 mr-1" />
                                    Download Reference Check
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" className="text-xs h-7">
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Button>
                                )}
                                {!step.autoValidation && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 border-slate-300 text-slate-700 hover:bg-slate-50"
                                    onClick={() =>
                                      updateStepStatus(phase.id, step.id, "incomplete")
                                    }
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Incomplete
                                  </Button>
                                )}
                              </>
                            )}
                            {step.status === "incomplete" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() =>
                                    updateStepStatus(phase.id, step.id, "pending")
                                  }
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Back to Pending
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() =>
                                    updateStepStatus(phase.id, step.id, "complete")
                                  }
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Mark Complete
                                </Button>
                              </>
                            )}
                            {step.status === "locked" && (
                              <div className="text-[10px] text-muted-foreground">
                                Complete previous steps
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Card>
          );
        })}
        </Accordion>
      ) : (
        <Card className="border-2 border-dashed bg-gradient-to-br from-slate-50 to-slate-100/60">
          <CardContent className="py-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
              <Users className="h-7 w-7 text-slate-700" />
            </div>
            <h3 className="text-base font-semibold mb-2">Pick an employee role</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              The onboarding checklist is role-specific. Choose caregiver, care manager, or tech
              employee to load the right workflow.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
