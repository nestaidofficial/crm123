"use client";

import { cn } from "@/lib/utils";

export interface StepConfig {
  title: string;
}

interface StepperHeaderProps {
  currentStep: number;
  steps: StepConfig[];
  className?: string;
}

export function StepperHeader({ currentStep, steps, className }: StepperHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;
        return (
          <div key={`${step.title}-${stepNum}`} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-medium transition-colors",
                isComplete || isActive ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
              )}
            >
              {stepNum}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn("h-0.5 w-8 shrink-0 md:w-16", stepNum < currentStep ? "bg-neutral-900" : "bg-neutral-200")}
                aria-hidden
              />
            )}
          </div>
        );
      })}
      <div className="ml-4 hidden text-[13px] text-neutral-500 md:block">
        {steps[currentStep - 1]?.title}
      </div>
    </div>
  );
}
