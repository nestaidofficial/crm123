"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useSupabaseRealtimeMulti } from "@/lib/hooks/useSupabaseRealtime";
import { cn } from "@/lib/utils";

export function ChartsSection() {
  const { visitStats, isLoadingVisitStats, fetchVisitStats } = useDashboardStore();

  useEffect(() => {
    fetchVisitStats();
  }, [fetchVisitStats]);

  // Real-time updates when schedule events change
  useSupabaseRealtimeMulti(
    "schedule_events",
    {
      onInsert: () => fetchVisitStats(),
      onUpdate: () => fetchVisitStats(),
      onDelete: () => fetchVisitStats(),
    }
  );

  if (isLoadingVisitStats || !visitStats) {
    return (
      <Card className="border-0 rounded-lg bg-neutral-0 shadow-card">
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-[15px] font-semibold text-neutral-900">Visit Completion Rate</CardTitle>
          <CardDescription className="text-[12px] text-neutral-500">
            Weekly overview of completed visits vs scheduled
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3">
          <div className="space-y-3 animate-pulse">
            <div className="h-[160px] bg-neutral-100 rounded-md" />
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-200">
              <div className="space-y-2">
                <div className="h-3 bg-neutral-200 rounded w-16" />
                <div className="h-5 bg-neutral-200 rounded w-12" />
                <div className="h-3 bg-neutral-200 rounded w-24" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-neutral-200 rounded w-16" />
                <div className="h-5 bg-neutral-200 rounded w-12" />
                <div className="h-3 bg-neutral-200 rounded w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weekChange = parseFloat(visitStats.thisWeek.change);
  const monthChange = parseFloat(visitStats.thisMonth.change);

  return (
    <Card className="border-0 rounded-lg bg-neutral-0 shadow-card">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-[15px] font-semibold text-neutral-900">Visit Completion Rate</CardTitle>
        <CardDescription className="text-[12px] text-neutral-500">
          Weekly overview of completed visits vs scheduled
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-3">
        <div className="space-y-3">
          <div className="h-[160px] bg-neutral-50 rounded-md border border-neutral-200 p-4">
            <div className="space-y-2">
              {visitStats.weeklyBreakdown.map((day, index) => {
                const rate = parseFloat(day.rate);
                const barWidth = rate > 0 ? `${rate}%` : "2%";
                return (
                  <div key={day.date} className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500 w-8 shrink-0">{day.day}</span>
                    <div className="flex-1 h-4 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success-500 transition-all duration-300"
                        style={{ width: barWidth }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-700 w-12 text-right shrink-0">
                      {day.completed}/{day.scheduled}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-200">
            <div>
              <p className="text-[11px] text-neutral-500">This Week</p>
              <p className="text-[14px] font-semibold text-neutral-900">{visitStats.thisWeek.rate}%</p>
              <p className={cn(
                "text-[11px] flex items-center gap-1 mt-0.5",
                weekChange >= 0 ? "text-success-500" : "text-error-500"
              )}>
                {weekChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {weekChange >= 0 ? "+" : ""}{weekChange}% from last week
              </p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500">This Month</p>
              <p className="text-[14px] font-semibold text-neutral-900">{visitStats.thisMonth.rate}%</p>
              <p className={cn(
                "text-[11px] flex items-center gap-1 mt-0.5",
                monthChange >= 0 ? "text-success-500" : "text-error-500"
              )}>
                {monthChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {monthChange >= 0 ? "+" : ""}{monthChange}% from last month
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
