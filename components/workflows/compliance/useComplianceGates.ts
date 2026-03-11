"use client";

import { useMemo } from "react";
import type { CompliancePhase, ComplianceStep, ComplianceGateStatus, OverallStatus } from "./types";
import { COMPLIANCE_GATES } from "./constants";

interface UseComplianceGatesResult {
  gateStatus: ComplianceGateStatus[];
  allGatesPassed: boolean;
  failingGates: ComplianceGateStatus[];
  passingGates: ComplianceGateStatus[];
  canAssign: boolean;
  overallStatus: OverallStatus;
  blockerMessages: string[];
}

export function useComplianceGates(phases: CompliancePhase[]): UseComplianceGatesResult {
  return useMemo(() => {
    // Flatten all steps for easy lookup
    const allSteps = phases.flatMap((phase) => phase.steps);
    const stepMap = new Map<string, ComplianceStep>(
      allSteps.map((step) => [step.id, step])
    );

    // Evaluate each compliance gate
    const gateStatus: ComplianceGateStatus[] = COMPLIANCE_GATES.map((rule) => {
      const relatedSteps = rule.stepIds
        .map((id) => stepMap.get(id))
        .filter((step): step is ComplianceStep => step !== undefined);

      let passed = false;

      switch (rule.checkType) {
        case "all_verified":
          // All specified steps must be verified
          passed =
            relatedSteps.length > 0 &&
            relatedSteps.every((step) => step.status === "verified");
          break;
        case "any_verified":
          // At least one step must be verified
          passed = relatedSteps.some((step) => step.status === "verified");
          break;
        case "custom":
          // Custom validation logic would go here
          passed = false;
          break;
      }

      return {
        rule,
        passed,
        relatedSteps,
      };
    });

    // Filter failing and passing gates
    const failingGates = gateStatus.filter(
      (gate) => !gate.passed && gate.rule.blocksAssignment
    );
    const passingGates = gateStatus.filter((gate) => gate.passed);

    // Determine if assignment is allowed
    const allGatesPassed = failingGates.length === 0;
    const canAssign = allGatesPassed;

    // Collect blocker messages
    const blockerMessages = failingGates.map((gate) => gate.rule.errorMessage);

    // Check if any step is blocked
    const hasBlockedSteps = allSteps.some((step) => step.status === "blocked");

    // Determine overall status
    let overallStatus: OverallStatus = "in_progress";
    if (hasBlockedSteps || failingGates.length > 0) {
      // Check if we're actually blocked or just incomplete
      const hasAnyVerified = allSteps.some((step) => step.status === "verified");
      if (hasBlockedSteps) {
        overallStatus = "blocked";
      } else if (!hasAnyVerified) {
        overallStatus = "in_progress";
      } else {
        overallStatus = "in_progress";
      }
    } else if (canAssign) {
      overallStatus = "ready_to_assign";
    }

    return {
      gateStatus,
      allGatesPassed,
      failingGates,
      passingGates,
      canAssign,
      overallStatus,
      blockerMessages,
    };
  }, [phases]);
}

// Hook to check if a specific step blocks assignment
export function useStepBlocksAssignment(
  stepId: string,
  phases: CompliancePhase[]
): boolean {
  return useMemo(() => {
    const rule = COMPLIANCE_GATES.find((r) => r.stepIds.includes(stepId));
    if (!rule || !rule.blocksAssignment) return false;

    const allSteps = phases.flatMap((phase) => phase.steps);
    const step = allSteps.find((s) => s.id === stepId);

    return step ? step.status !== "verified" : false;
  }, [stepId, phases]);
}

// Hook to get all compliance requirements for a step
export function useStepComplianceRules(stepId: string) {
  return useMemo(() => {
    return COMPLIANCE_GATES.filter((rule) => rule.stepIds.includes(stepId));
  }, [stepId]);
}
