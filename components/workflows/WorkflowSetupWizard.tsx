"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DEFAULT_CAREGIVER_PHASES } from "./compliance/constants";

interface WorkflowConfig {
  configured: boolean;
  selectedStepIds: string[];
}

interface WorkflowSetupWizardProps {
  isOpen: boolean;
  onComplete: (config: WorkflowConfig) => void;
  onClose?: () => void;
}

export function WorkflowSetupWizard({ isOpen, onComplete, onClose }: WorkflowSetupWizardProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [selectedStepIds, setSelectedStepIds] = useState<string[]>(() => {
    // Default all steps to selected
    return DEFAULT_CAREGIVER_PHASES.flatMap(phase => 
      phase.steps.map(step => step.id)
    );
  });

  const phases = DEFAULT_CAREGIVER_PHASES;
  const currentPhase = phases[currentPhaseIndex];

  const handleStepToggle = (stepId: string) => {
    setSelectedStepIds(prev => 
      prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  // Get current phase step count for display
  const selectedStepsInCurrentPhase = currentPhase.steps.filter(step => 
    selectedStepIds.includes(step.id)
  ).length;

  const handleNext = () => {
    if (currentPhaseIndex < phases.length - 1) {
      setCurrentPhaseIndex(currentPhaseIndex + 1);
    }
  };

  const handleSkip = () => {
    // Skip means use all default steps
    const allStepIds = DEFAULT_CAREGIVER_PHASES.flatMap(phase => 
      phase.steps.map(step => step.id)
    );
    onComplete({
      configured: true,
      selectedStepIds: allStepIds
    });
  };

  const handleFinish = () => {
    onComplete({
      configured: true,
      selectedStepIds
    });
  };

  const isLastPhase = currentPhaseIndex === phases.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        className={cn(
          "max-w-4xl p-0 overflow-hidden rounded-xl border shadow-2xl h-[600px]",
          "bg-white text-black",
          "dark:bg-black dark:text-white dark:border-neutral-800",
          "data-[state=open]:animate-none data-[state=closed]:animate-none"
        )}
      >
        {/* Visually hidden title satisfies Radix accessibility requirement */}
        <DialogTitle className="sr-only">Employee Onboarding Workflow Setup</DialogTitle>

        <div className="flex flex-col md:flex-row w-full h-full">
          {/* Sidebar */}
          <div className="w-full md:w-1/3 p-6 border-r border-gray-200 dark:border-neutral-800 overflow-y-auto">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-lg font-bold grid place-items-center">
                W
              </div>
              <h2 className="text-lg font-medium">Workflow Setup</h2>
              <p className="text-sm opacity-80">
                Configure which onboarding steps your agency requires for new employees.
              </p>
              <div className="flex flex-col gap-3 mt-6">
                {phases.map((phase, index) => (
                  <div
                    key={phase.id}
                    className={cn(
                      "flex items-center gap-2 text-sm transition",
                      index === currentPhaseIndex
                        ? "font-semibold"
                        : index < currentPhaseIndex
                          ? "opacity-80"
                          : "opacity-60 hover:opacity-100"
                    )}
                  >
                    {index < currentPhaseIndex ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-black dark:bg-white/40" />
                    )}
                    <span className="font-normal">{phase.phaseName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full md:w-2/3 flex flex-col h-full">
            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6">
              <DialogHeader>
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={currentPhase.phaseName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="text-2xl font-medium"
                  >
                    {currentPhase.phaseName}
                  </motion.h2>
                </AnimatePresence>

                <div className="min-h-[60px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPhase.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="text-gray-600 dark:text-gray-400 text-base opacity-90 mb-2">
                        {currentPhase.goal}
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                        {selectedStepsInCurrentPhase} of {currentPhase.steps.length} steps selected
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </DialogHeader>

              {/* Steps List */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {currentPhase.steps.map((step) => {
                    const isSelected = selectedStepIds.includes(step.id);
                    return (
                      <div
                        key={step.id}
                        className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-900/50"
                      >
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => handleStepToggle(step.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {step.stepNumber}. {step.title}
                            </h4>
                            {step.isComplianceGate && (
                              <Badge variant="secondary" className="text-xs">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Required
                              </Badge>
                            )}
                          </div>
                          {step.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                              {step.description}
                            </p>
                          )}
                          {step.outcome && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                              → {step.outcome}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer — pinned to bottom */}
            <div className="shrink-0 border-t border-gray-200 dark:border-neutral-800 px-8 py-4 flex justify-between items-center">
              <Button variant="outline" onClick={handleSkip}>
                Skip Setup
              </Button>

              {isLastPhase ? (
                <Button variant="outline" onClick={handleFinish}>
                  Complete Setup
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" onClick={handleNext}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}