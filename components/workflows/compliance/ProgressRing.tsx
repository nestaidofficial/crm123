"use client";

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
  strokeWidth?: number;
  showPercentage?: boolean;
  color?: "green" | "blue" | "yellow" | "red" | "gray" | "slate";
  bgColor?: string;
  className?: string;
}

const sizeConfig = {
  sm: { size: 32, fontSize: "text-[8px]" },
  md: { size: 48, fontSize: "text-xs" },
  lg: { size: 64, fontSize: "text-sm" },
};

const colorConfig = {
  green: "stroke-green-500",
  blue: "stroke-blue-500",
  yellow: "stroke-yellow-500",
  red: "stroke-red-500",
  gray: "stroke-gray-400",
  slate: "stroke-slate-700",
};

export function ProgressRing({
  percentage,
  size = "md",
  strokeWidth = 4,
  showPercentage = true,
  color = "green",
  bgColor = "stroke-gray-200",
  className,
}: ProgressRingProps) {
  const { size: svgSize, fontSize } = sizeConfig[size];
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={svgSize}
        height={svgSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={bgColor}
        />
        {/* Progress circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(colorConfig[color], "transition-all duration-500 ease-out")}
        />
      </svg>
      {showPercentage && (
        <span
          className={cn(
            "absolute font-semibold text-slate-700",
            fontSize
          )}
        >
          {Math.round(clampedPercentage)}%
        </span>
      )}
    </div>
  );
}

// Linear progress bar variant
interface ProgressBarProps {
  percentage: number;
  height?: "sm" | "md" | "lg";
  color?: "green" | "blue" | "yellow" | "red" | "gray" | "slate";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const heightConfig = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

const barColorConfig = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  gray: "bg-gray-400",
  slate: "bg-slate-700",
};

export function ProgressBar({
  percentage,
  height = "md",
  color = "slate",
  showLabel = false,
  label,
  className,
}: ProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label || "Progress"}</span>
          <span className="text-xs font-medium text-slate-700">
            {Math.round(clampedPercentage)}%
          </span>
        </div>
      )}
      <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", heightConfig[height])}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            barColorConfig[color]
          )}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}

// Step progress indicator (X/Y format)
interface StepProgressProps {
  completed: number;
  total: number;
  showBar?: boolean;
  className?: string;
}

export function StepProgress({
  completed,
  total,
  showBar = true,
  className,
}: StepProgressProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Progress</span>
        <span className="text-xs font-semibold text-slate-800">
          {completed}/{total} steps
        </span>
      </div>
      {showBar && (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              percentage === 100
                ? "bg-green-500"
                : percentage > 0
                ? "bg-slate-700"
                : "bg-gray-300"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
