"use client";

import { LucideIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  onViewReport?: () => void;
  status?: "active" | "coming-soon";
}

export function ReportCard({
  title,
  description,
  icon: Icon,
  iconBgColor = "bg-blue-100",
  iconColor = "text-blue-600",
  onViewReport,
  status = "active",
}: ReportCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 p-5">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
            iconBgColor
          )}
        >
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-neutral-900 mb-1">
            {title}
          </h3>
          <p className="text-[12px] text-neutral-500 leading-relaxed mb-3">
            {description}
          </p>

          {/* View Report Link */}
          {status === "active" ? (
            <button
              onClick={onViewReport}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors group"
            >
              View Report
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-[11px] font-medium text-neutral-500">
              Coming Soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
