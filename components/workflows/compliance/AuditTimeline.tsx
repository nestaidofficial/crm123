"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  FileText,
  User,
  Shield,
  Briefcase,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  status: "complete" | "pending" | "missing";
  icon: React.ComponentType<{ className?: string }>;
  type: "milestone" | "document" | "action";
}

interface AuditTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const statusColors = {
  complete: {
    bg: "bg-green-500",
    border: "border-green-500",
    text: "text-green-600",
    line: "bg-green-500",
  },
  pending: {
    bg: "bg-yellow-500",
    border: "border-yellow-500",
    text: "text-yellow-600",
    line: "bg-yellow-500",
  },
  missing: {
    bg: "bg-red-500",
    border: "border-red-500",
    text: "text-red-600",
    line: "bg-red-500",
  },
};

export function AuditTimeline({ events, className }: AuditTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {events.map((event, index) => {
        const colors = statusColors[event.status];
        const Icon = event.icon;
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4 pb-6">
            {/* Vertical line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-4 top-8 w-0.5 h-full -translate-x-1/2",
                  event.status === "complete" ? colors.line : "bg-gray-200"
                )}
              />
            )}

            {/* Icon circle */}
            <div
              className={cn(
                "relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                event.status === "complete"
                  ? colors.bg
                  : event.status === "pending"
                  ? "bg-yellow-100 border-2 border-yellow-500"
                  : "bg-red-100 border-2 border-red-500"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  event.status === "complete"
                    ? "text-white"
                    : colors.text
                )}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-xs font-medium",
                    event.status === "complete"
                      ? "text-green-600"
                      : event.status === "pending"
                      ? "text-yellow-600"
                      : "text-red-600"
                  )}
                >
                  {event.date || "—"}
                </span>
                {event.status === "missing" && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                    MISSING
                  </span>
                )}
                {event.status === "pending" && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                    PENDING
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-slate-900">
                {event.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {event.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Generate timeline events from phases
export function generateAuditTimelineEvents(
  phases: Array<{
    id: string;
    phaseName: string;
    steps: Array<{
      id: string;
      title: string;
      status: string;
      lastUpdated?: string;
      isComplianceGate?: boolean;
    }>;
  }>
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Define key milestones with their step mappings
  const milestones = [
    { stepId: "step-1", title: "Application Received", icon: FileText },
    { stepId: "step-2", title: "Interview Completed", icon: User },
    { stepId: "step-3", title: "References Verified", icon: User },
    { stepId: "step-4", title: "Conditional Offer Accepted", icon: Briefcase },
    { stepId: "step-5", title: "CORI/SORI Cleared", icon: Shield },
    { stepId: "step-6", title: "Training Completed", icon: CheckCircle2 },
    { stepId: "step-7", title: "Onboarding Packet Signed", icon: FileText },
    { stepId: "step-9", title: "I-9 Section 1 Complete", icon: FileText },
    { stepId: "step-11", title: "I-9 Section 2 Complete", icon: FileText },
    { stepId: "step-12", title: "Payroll Setup Complete", icon: Briefcase },
    { stepId: "step-13", title: "System Validation Passed", icon: Shield },
    { stepId: "step-14", title: "Ready for Assignment", icon: Calendar },
  ];

  // Flatten steps for lookup
  const allSteps = phases.flatMap((p) => p.steps);
  const stepMap = new Map(allSteps.map((s) => [s.id, s]));

  milestones.forEach((milestone, index) => {
    const step = stepMap.get(milestone.stepId);

    let status: TimelineEvent["status"] = "missing";
    let date = "";
    let description = "";

    if (step) {
      if (step.status === "verified") {
        status = "complete";
        date = step.lastUpdated || "Completed";
        description = "Verified and approved";
      } else if (step.status === "uploaded" || step.status === "waiting") {
        status = "pending";
        date = step.lastUpdated || "In Progress";
        description =
          step.status === "uploaded"
            ? "Awaiting verification"
            : "Awaiting caregiver response";
      } else {
        status = "missing";
        description = step.isComplianceGate
          ? "Required for assignment"
          : "Not started";
      }
    }

    events.push({
      id: milestone.stepId,
      date,
      title: milestone.title,
      description,
      status,
      icon: milestone.icon,
      type: "milestone",
    });
  });

  return events;
}
