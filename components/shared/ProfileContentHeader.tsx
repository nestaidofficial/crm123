"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileContentHeaderProps {
  name: string;
  role: string;
  status: "active" | "inactive" | "onboarding";
  location?: string;
  startDate?: string;
  className?: string;
}

const statusConfig = {
  active: {
    label: "Active",
    variant: "positive" as const,
  },
  inactive: {
    label: "Inactive",
    variant: "neutral" as const,
  },
  onboarding: {
    label: "Onboarding",
    variant: "warning" as const,
  },
};

export function ProfileContentHeader({
  name,
  role,
  status,
  location,
  startDate,
  className,
}: ProfileContentHeaderProps) {
  const statusInfo = statusConfig[status];

  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-card p-6 border-0",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          {/* Name and badges */}
          <div className="flex items-center gap-3">
            <h1 className="text-h1 font-bold text-neutral-900">{name}</h1>
            <Badge variant="secondary">{role}</Badge>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 flex-wrap">
            {location && (
              <div className="flex items-center gap-1.5 text-body-m text-neutral-500">
                <MapPin className="h-4 w-4" />
                <span>{location}</span>
              </div>
            )}
            {startDate && (
              <div className="flex items-center gap-1.5 text-body-m text-neutral-500">
                <Calendar className="h-4 w-4" />
                <span>{startDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
