"use client";

import { useEffect, useState } from "react";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, AlertTriangle } from "lucide-react";
import { useEmployeesStore } from "@/store/useEmployeesStore";
import { useSupabaseRealtimeMulti } from "@/lib/hooks/useSupabaseRealtime";
import { apiFetch } from "@/lib/api-fetch";

interface QuickStats {
  activeStaff: number;
  activeCaregivers: number;
  pendingVerifications: number;
}

export default function DashboardPage() {
  const { employees, hydrate } = useEmployeesStore();
  const [quickStats, setQuickStats] = useState<QuickStats>({
    activeStaff: 0,
    activeCaregivers: 0,
    pendingVerifications: 0,
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Calculate quick stats from employees store
  useEffect(() => {
    const activeCount = employees.filter((emp) => emp.status === "active").length;
    const caregiverRoles = ["caregiver", "cna", "hha", "lpn", "rn"];
    const caregiversCount = employees.filter(
      (emp) => caregiverRoles.includes(emp.role) && emp.status === "active"
    ).length;
    const credentialsExpiringCount = employees.filter(
      (emp) => emp.verifications.some((v) => v.status === "pending" || v.status === "missing")
    ).length;

    setQuickStats({
      activeStaff: activeCount,
      activeCaregivers: caregiversCount,
      pendingVerifications: credentialsExpiringCount,
    });
  }, [employees]);

  // Real-time updates for employees
  useSupabaseRealtimeMulti(
    "employees",
    {
      onInsert: () => hydrate(),
      onUpdate: () => hydrate(),
      onDelete: () => hydrate(),
    }
  );

  // Real-time updates for employee verifications
  useSupabaseRealtimeMulti(
    "employee_verifications",
    {
      onInsert: () => hydrate(),
      onUpdate: () => hydrate(),
      onDelete: () => hydrate(),
    }
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[16px] font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-[12px] text-neutral-500 font-normal mt-0.5">
          Welcome back! Here&apos;s what&apos;s happening with your agency today.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-3 px-4">
            <CardTitle className="text-[11px] font-normal text-neutral-500">Total Staff</CardTitle>
            <Users className="h-3 w-3 text-neutral-500" />
          </CardHeader>
          <CardContent className="pb-3 pt-0 px-4">
            <div className="text-[18px] font-semibold text-neutral-900">{quickStats.activeStaff}</div>
            <p className="text-[11px] text-neutral-500 mt-0.5">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-3 px-4">
            <CardTitle className="text-[11px] font-normal text-neutral-500">Caregivers</CardTitle>
            <UserCheck className="h-3 w-3 text-neutral-500" />
          </CardHeader>
          <CardContent className="pb-3 pt-0 px-4">
            <div className="text-[18px] font-semibold text-neutral-900">{quickStats.activeCaregivers}</div>
            <p className="text-[11px] text-neutral-500 mt-0.5">Active caregivers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-3 px-4">
            <CardTitle className="text-[11px] font-normal text-neutral-500">Credentials Review</CardTitle>
            <AlertTriangle className="h-3 w-3 text-amber-600" />
          </CardHeader>
          <CardContent className="pb-3 pt-0 px-4">
            <div className="text-[18px] font-semibold text-neutral-900">{quickStats.pendingVerifications}</div>
            <p className="text-[11px] text-amber-600 mt-0.5">Pending verifications</p>
          </CardContent>
        </Card>
      </div>

      <OverviewCards />

      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        <ChartsSection />
        <ActivityFeed />
      </div>
    </div>
  );
}
