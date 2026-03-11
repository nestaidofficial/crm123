"use client";

import { useEffect } from "react";
import { Users, UserCheck, Calendar, Clock, DollarSign, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useSupabaseRealtimeMulti } from "@/lib/hooks/useSupabaseRealtime";

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: "up" | "down" | "neutral";
}

export function OverviewCards() {
  const { stats, isLoadingStats, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time updates for clients
  useSupabaseRealtimeMulti(
    "clients",
    {
      onInsert: () => fetchStats(),
      onUpdate: () => fetchStats(),
      onDelete: () => fetchStats(),
    }
  );

  // Real-time updates for employees
  useSupabaseRealtimeMulti(
    "employees",
    {
      onInsert: () => fetchStats(),
      onUpdate: () => fetchStats(),
      onDelete: () => fetchStats(),
    }
  );

  // Real-time updates for schedule events
  useSupabaseRealtimeMulti(
    "schedule_events",
    {
      onInsert: () => fetchStats(),
      onUpdate: () => fetchStats(),
      onDelete: () => fetchStats(),
    }
  );

  // Real-time updates for tasks
  useSupabaseRealtimeMulti(
    "schedule_event_tasks",
    {
      onInsert: () => fetchStats(),
      onUpdate: () => fetchStats(),
      onDelete: () => fetchStats(),
    }
  );

  // Real-time updates for invoices
  useSupabaseRealtimeMulti(
    "billing_invoices",
    {
      onInsert: () => fetchStats(),
      onUpdate: () => fetchStats(),
      onDelete: () => fetchStats(),
    }
  );

  if (isLoadingStats || !stats) {
    return (
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="relative rounded-lg bg-neutral-0 p-4 shadow-card min-h-[92px] animate-pulse"
          >
            <div className="absolute right-4 top-4 h-5 w-5 bg-neutral-200 rounded" />
            <div className="pr-7 space-y-2">
              <div className="h-3 bg-neutral-200 rounded w-24" />
              <div className="h-6 bg-neutral-200 rounded w-16" />
              <div className="h-3 bg-neutral-200 rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cards: StatCard[] = [
    {
      title: "Total Clients",
      value: stats.totalClients.value.toString(),
      change: stats.totalClients.changeLabel,
      icon: Users,
      trend: stats.totalClients.change >= 0 ? "up" : "down",
    },
    {
      title: "Active Caregivers",
      value: stats.activeCaregivers.value.toString(),
      change: stats.activeCaregivers.changeLabel,
      icon: UserCheck,
      trend: "neutral",
    },
    {
      title: "Scheduled Visits Today",
      value: stats.scheduledVisitsToday.value.toString(),
      change: stats.scheduledVisitsToday.changeLabel,
      icon: Calendar,
      trend: "neutral",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks.value.toString(),
      change: stats.pendingTasks.changeLabel,
      icon: Clock,
      trend: "neutral",
    },
    {
      title: "Revenue This Month",
      value: `$${stats.monthRevenue.value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: stats.monthRevenue.changeLabel,
      icon: DollarSign,
      trend: stats.monthRevenue.change >= 0 ? "up" : "down",
    },
    {
      title: "Compliance Status",
      value: `${stats.complianceStatus.value.toFixed(1)}%`,
      change: stats.complianceStatus.changeLabel,
      icon: Shield,
      trend: stats.complianceStatus.value >= 95 ? "up" : "down",
    },
  ];

  return (
    <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className="relative rounded-lg bg-neutral-0 p-4 shadow-card min-h-[92px]"
          >
            <div className="absolute right-4 top-4 flex items-center justify-center">
              <Icon className="h-5 w-5 text-neutral-500" aria-hidden />
            </div>

            <div className="pr-7">
              <p className="text-[11px] font-normal text-neutral-500">{stat.title}</p>
              <p className="mt-1 text-[18px] font-semibold leading-6 text-neutral-900">
                {stat.value}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[11px] font-normal text-neutral-500",
                  stat.trend === "up" && "text-success-500",
                  stat.trend === "down" && "text-error-500"
                )}
              >
                {stat.change}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
