"use client";

import dynamic from "next/dynamic";

const ScheduleDashboard = dynamic(
  () => import("@/components/schedule/schedule-dashboard").then(m => ({ default: m.ScheduleDashboard })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    )
  }
);

export default function SchedulePage() {
  return (
    <div className="h-full w-full flex flex-col">
      <ScheduleDashboard />
    </div>
  );
}
