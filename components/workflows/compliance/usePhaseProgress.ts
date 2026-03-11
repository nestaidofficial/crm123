"use client";

import { useMemo } from "react";
import type { CompliancePhase, ComplianceStep, PhaseStatus } from "./types";

interface PhaseProgressData {
  totalSteps: number;
  completedSteps: number;
  verifiedSteps: number;
  blockedSteps: number;
  waitingSteps: number;
  uploadedSteps: number;
  notStartedSteps: number;
  percentage: number;
  hasBlockers: boolean;
  blockerCount: number;
}

interface UsePhaseProgressResult {
  phaseProgress: Map<string, PhaseProgressData>;
  totalProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  currentPhase: CompliancePhase | null;
  nextStep: {
    phase: CompliancePhase;
    step: ComplianceStep;
  } | null;
  isFullyComplete: boolean;
}

export function usePhaseProgress(phases: CompliancePhase[]): UsePhaseProgressResult {
  return useMemo(() => {
    const phaseProgress = new Map<string, PhaseProgressData>();

    // Calculate progress for each phase
    phases.forEach((phase) => {
      const totalSteps = phase.steps.length;
      const verifiedSteps = phase.steps.filter((s) => s.status === "verified").length;
      const blockedSteps = phase.steps.filter((s) => s.status === "blocked").length;
      const waitingSteps = phase.steps.filter((s) => s.status === "waiting").length;
      const uploadedSteps = phase.steps.filter((s) => s.status === "uploaded").length;
      const notStartedSteps = phase.steps.filter((s) => s.status === "not_started").length;

      // Completed = verified (in the new system, only verified counts as complete)
      const completedSteps = verifiedSteps;
      const percentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      const hasBlockers = blockedSteps > 0;

      phaseProgress.set(phase.id, {
        totalSteps,
        completedSteps,
        verifiedSteps,
        blockedSteps,
        waitingSteps,
        uploadedSteps,
        notStartedSteps,
        percentage,
        hasBlockers,
        blockerCount: blockedSteps,
      });
    });

    // Calculate total progress
    const allSteps = phases.flatMap((p) => p.steps);
    const totalSteps = allSteps.length;
    const completedSteps = allSteps.filter((s) => s.status === "verified").length;
    const totalPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Find current phase (first non-complete, non-locked phase)
    const currentPhase =
      phases.find((p) => p.status === "in_progress") ||
      phases.find((p) => p.status !== "complete" && p.status !== "locked") ||
      null;

    // Find next actionable step
    let nextStep: { phase: CompliancePhase; step: ComplianceStep } | null = null;
    for (const phase of phases) {
      if (phase.status === "locked") continue;
      const pendingStep = phase.steps.find(
        (s) =>
          s.status === "not_started" ||
          s.status === "waiting" ||
          s.status === "uploaded"
      );
      if (pendingStep) {
        nextStep = { phase, step: pendingStep };
        break;
      }
    }

    // Check if all phases are complete
    const isFullyComplete =
      totalSteps > 0 && completedSteps === totalSteps;

    return {
      phaseProgress,
      totalProgress: {
        completed: completedSteps,
        total: totalSteps,
        percentage: totalPercentage,
      },
      currentPhase,
      nextStep,
      isFullyComplete,
    };
  }, [phases]);
}

// Hook to compute phase status based on steps
export function useComputedPhaseStatus(phase: CompliancePhase): PhaseStatus {
  return useMemo(() => {
    if (phase.status === "locked") return "locked";

    const allVerified = phase.steps.every((s) => s.status === "verified");
    const hasBlocked = phase.steps.some((s) => s.status === "blocked");
    const hasProgress = phase.steps.some(
      (s) =>
        s.status === "verified" ||
        s.status === "uploaded" ||
        s.status === "waiting"
    );

    if (allVerified) return "complete";
    if (hasBlocked) return "blocked";
    if (hasProgress) return "in_progress";

    return phase.status;
  }, [phase]);
}

// Hook to check if a phase can be unlocked
export function useCanUnlockPhase(
  phase: CompliancePhase,
  allPhases: CompliancePhase[]
): boolean {
  return useMemo(() => {
    if (!phase.lockedUntil) return true;

    const prerequisitePhase = allPhases.find((p) => p.id === phase.lockedUntil);
    if (!prerequisitePhase) return true;

    return prerequisitePhase.status === "complete";
  }, [phase, allPhases]);
}

// Hook to get steps that need attention (not verified)
export function useStepsNeedingAttention(phases: CompliancePhase[]): ComplianceStep[] {
  return useMemo(() => {
    const allSteps = phases.flatMap((p) => p.steps);
    return allSteps.filter(
      (step) =>
        step.status === "not_started" ||
        step.status === "waiting" ||
        step.status === "uploaded" ||
        step.status === "blocked"
    );
  }, [phases]);
}
