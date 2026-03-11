"use client";

import { useRouter } from "next/navigation";
import { ReportCard } from "@/components/reports/report-card";
import { 
  FileText, 
  Clock, 
  Users, 
  UserCheck, 
  DollarSign, 
  BarChart3 
} from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const router = useRouter();

  const handleViewReport = (reportName: string) => {
    toast.info(`Opening ${reportName}...`);
    // In a real app, this would navigate to the report detail page or open a modal
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-[16px] font-semibold text-neutral-900">Reports & Analytics</h1>
          <p className="text-[12px] text-neutral-500 font-normal mt-0.5">
            Generate insights and analytics for your agency
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ReportCard
            title="Staff Document Expiry"
            description="Shows staff documents that are expiring or have expired."
            icon={FileText}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            onViewReport={() => router.push("/reports/staff-document-expiry")}
          />

          <ReportCard
            title="Clock In/Out Variance"
            description="Shows staff who clocked in or out from shifts with variance of at least 10 minutes from scheduled times."
            icon={Clock}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            onViewReport={() => handleViewReport("Clock In/Out Variance")}
          />

          <ReportCard
            title="Work Hours Compliance - Staff View"
            description="Monitor individual staff compliance with maximum work hour limits per period."
            icon={Users}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            onViewReport={() => handleViewReport("Work Hours Compliance")}
          />

          <ReportCard
            title="Staff Onboarding Status"
            description="Tracks progress of new staff members through the onboarding process."
            icon={UserCheck}
            iconBgColor="bg-neutral-100"
            iconColor="text-neutral-600"
            status="coming-soon"
          />

          <ReportCard
            title="Pay Review Date"
            description="Shows staff members who are due for pay rate reviews."
            icon={DollarSign}
            iconBgColor="bg-amber-100"
            iconColor="text-amber-600"
            onViewReport={() => handleViewReport("Pay Review Date")}
          />

          <ReportCard
            title="Human Capital Variance"
            description="Compares minimum work hours of staff with actual hours worked."
            icon={BarChart3}
            iconBgColor="bg-cyan-100"
            iconColor="text-cyan-600"
            onViewReport={() => handleViewReport("Human Capital Variance")}
          />
        </div>
      </div>
    </>
  );
}
