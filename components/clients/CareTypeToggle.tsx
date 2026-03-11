"use client";

import { cn } from "@/lib/utils";

type CareType = "non_medical" | "medical";

interface CareTypeToggleProps {
  value: CareType;
  onChange: (value: CareType) => void;
  className?: string;
}

export function CareTypeToggle({ value, onChange, className }: CareTypeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Care type"
      className={cn(
        "inline-flex rounded-xl border border-neutral-200/80 bg-neutral-50 p-1",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange("non_medical")}
        className={cn(
          "rounded-lg px-4 py-2 text-[14px] font-medium transition-colors",
          value === "non_medical"
            ? "bg-neutral-900 text-white"
            : "text-neutral-500 hover:text-neutral-900 hover:bg-white"
        )}
      >
        Non-Medical
      </button>
      <button
        type="button"
        onClick={() => onChange("medical")}
        className={cn(
          "rounded-lg px-4 py-2 text-[14px] font-medium transition-colors",
          value === "medical"
            ? "bg-neutral-900 text-white"
            : "text-neutral-500 hover:text-neutral-900 hover:bg-white"
        )}
      >
        Medical
      </button>
    </div>
  );
}
