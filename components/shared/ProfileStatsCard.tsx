"use client";

import { cn } from "@/lib/utils";

interface ProfileStatsCardProps {
  stats: Array<{
    icon: React.ReactNode;
    value: number | string;
    label: string;
  }>;
  className?: string;
}

export function ProfileStatsCard({ stats, className }: ProfileStatsCardProps) {
  return (
    <div className={cn("border border-neutral-200 bg-white rounded-2xl overflow-hidden", className)}>
      <div className="grid grid-cols-3 divide-x divide-neutral-200">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center py-6 px-4 text-center"
          >
            {/* Icon */}
            <div className="mb-3 text-neutral-400">
              {stat.icon}
            </div>
            
            {/* Value */}
            <div className="text-3xl font-bold text-neutral-900 mb-1">
              {stat.value}
            </div>
            
            {/* Label */}
            <div className="text-sm text-neutral-500 font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
