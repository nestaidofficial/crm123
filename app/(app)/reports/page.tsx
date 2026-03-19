"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffDocumentExpiryReport } from "@/components/reports/staff-document-expiry-report";
import { 
  FileText, 
  Clock, 
  Users
} from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("staff-document-expiry");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="gap-2 rounded-none bg-transparent h-auto p-0">
        <TabsTrigger
          className="data-[state=active]:bg-[#F4F4F6] data-[state=active]:text-neutral-900 border-border relative h-auto flex-col px-4 py-2 text-xs data-[state=active]:shadow-none"
          value="staff-document-expiry"
        >
          <FileText
            aria-hidden="true"
            className="mb-1.5 opacity-60"
            size={16}
          />
          Document Expiry
        </TabsTrigger>
        <TabsTrigger
          className="data-[state=active]:bg-[#F4F4F6] data-[state=active]:text-neutral-900 border-border relative h-auto flex-col px-4 py-2 text-xs data-[state=active]:shadow-none"
          value="clock-variance"
        >
          <Clock
            aria-hidden="true"
            className="mb-1.5 opacity-60"
            size={16}
          />
          Clock Variance
        </TabsTrigger>
        <TabsTrigger
          className="data-[state=active]:bg-[#F4F4F6] data-[state=active]:text-neutral-900 border-border relative h-auto flex-col px-4 py-2 text-xs data-[state=active]:shadow-none"
          value="work-hours"
        >
          <Users
            aria-hidden="true"
            className="mb-1.5 opacity-60"
            size={16}
          />
          Work Hours
        </TabsTrigger>
      </TabsList>

      <TabsContent value="staff-document-expiry">
        <StaffDocumentExpiryReport />
      </TabsContent>

      <TabsContent value="clock-variance">
        <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-card p-8 text-center">
          <Clock className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Clock In/Out Variance Report</h3>
          <p className="text-neutral-500 mb-4">
            This report will show staff who clocked in or out from shifts with variance of at least 10 minutes from scheduled times.
          </p>
          <p className="text-sm text-neutral-400">Coming soon...</p>
        </div>
      </TabsContent>

      <TabsContent value="work-hours">
        <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-card p-8 text-center">
          <Users className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Work Hours Compliance Report</h3>
          <p className="text-neutral-500 mb-4">
            This report will monitor individual staff compliance with maximum work hour limits per period.
          </p>
          <p className="text-sm text-neutral-400">Coming soon...</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
