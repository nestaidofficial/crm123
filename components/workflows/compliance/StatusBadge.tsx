"use client";

import { Badge } from "@/components/ui/badge";
import {
  Circle,
  Clock,
  Upload,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepStatus } from "./types";
import { STATUS_CONFIG } from "./constants";

interface StatusBadgeProps {
  status: StepStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const statusIcons = {
  not_started: Circle,
  waiting: Clock,
  uploaded: Upload,
  verified: CheckCircle2,
  blocked: AlertCircle,
};

const sizeClasses = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-3 py-1.5",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

const statusVariants: Record<StepStatus, "neutral" | "warning" | "info" | "positive" | "negative"> = {
  not_started: "neutral",
  waiting:     "warning",
  uploaded:    "info",
  verified:    "positive",
  blocked:     "negative",
};

export function StatusBadge({
  status,
  size = "md",
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = statusIcons[status];

  return (
    <Badge
      variant={statusVariants[status]}
      className={cn("font-medium", sizeClasses[size], className)}
    >
      {showIcon && <Icon className={cn(iconSizes[size], "mr-1")} />}
      {config.label}
    </Badge>
  );
}

// Compact dot indicator for phase timeline
interface StatusDotProps {
  status: StepStatus;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

const dotSizes = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

const dotColors: Record<StepStatus, string> = {
  not_started: "bg-[#596171]",
  waiting:     "bg-[#b13600]",
  uploaded:    "bg-[#045ad0]",
  verified:    "bg-[#217007]",
  blocked:     "bg-[#c0123d]",
};

export function StatusDot({
  status,
  size = "md",
  pulse = false,
  className,
}: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        dotSizes[size],
        dotColors[status],
        pulse && "animate-pulse",
        className
      )}
    />
  );
}

// Blocker indicator (red dot with count)
interface BlockerIndicatorProps {
  count: number;
  className?: string;
}

export function BlockerIndicator({ count, className }: BlockerIndicatorProps) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold",
        className
      )}
    >
      {count}
    </span>
  );
}

// Overall status badge for caregiver header
interface OverallStatusBadgeProps {
  status: "in_progress" | "blocked" | "ready_to_assign";
  className?: string;
}

const overallStatusConfig = {
  in_progress:     { variant: "warning"  as const, label: "In Progress",    icon: Clock },
  blocked:         { variant: "negative" as const, label: "Blocked",         icon: XCircle },
  ready_to_assign: { variant: "positive" as const, label: "Ready to Assign", icon: CheckCircle2 },
};

export function OverallStatusBadge({
  status,
  className,
}: OverallStatusBadgeProps) {
  const config = overallStatusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn("font-semibold px-3 py-1 h-auto", className)}
    >
      <Icon className="h-4 w-4 mr-1.5" />
      {config.label}
    </Badge>
  );
}
