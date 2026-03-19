"use client";

import { CheckCircle2, Clock, XCircle, Lock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  name: string;
  status: "complete" | "pending" | "missing" | "locked";
  completedDate?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ChecklistSectionProps {
  items: ChecklistItem[];
  title?: string;
  showProgress?: boolean;
  className?: string;
}

export function ChecklistSection({
  items,
  title,
  showProgress = true,
  className,
}: ChecklistSectionProps) {
  const completedCount = items.filter((item) => item.status === "complete").length;
  const totalCount = items.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const getStatusIcon = (status: ChecklistItem["status"]) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-success-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-warning-500" />;
      case "missing":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "locked":
        return <Lock className="h-5 w-5 text-neutral-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getStatusBadge = (status: ChecklistItem["status"]) => {
    const variants: Record<ChecklistItem["status"], { label: string; className: string }> = {
      complete: { label: "Complete", className: "bg-success-500/10 text-success-500" },
      pending: { label: "Pending", className: "bg-warning-500/10 text-warning-500" },
      missing: { label: "Missing", className: "bg-destructive/10 text-destructive" },
      locked: { label: "Locked", className: "bg-neutral-200 text-neutral-600" },
    };
    const variant = variants[status];
    return (
      <Badge className={cn("text-[10px] font-medium", variant.className)}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Summary */}
      {showProgress && (
        <div className="p-4 rounded-md border border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-body-s font-medium text-neutral-900">
              Progress
            </span>
            <span className="text-body-s text-neutral-500">
              {completedCount} of {totalCount} completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}

      {/* Title */}
      {title && (
        <h3 className="text-body-m font-semibold text-neutral-900">{title}</h3>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between p-4 border border-neutral-200 rounded-md bg-white",
              item.status === "locked" && "opacity-60"
            )}
          >
            <div className="flex items-center gap-3 flex-1">
              {getStatusIcon(item.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-body-m font-medium text-neutral-900">
                    {item.name}
                  </p>
                  {getStatusBadge(item.status)}
                </div>
                {item.completedDate && (
                  <p className="text-body-s text-neutral-500 mt-0.5">
                    Completed on{" "}
                    {new Date(item.completedDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
            {item.action && item.status !== "locked" && (
              <Button
                variant="outline"
                size="sm"
                onClick={item.action.onClick}
                className="shrink-0"
              >
                {item.action.label}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
