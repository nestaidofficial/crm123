"use client";

import { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
    <div className="space-y-4">
      <div>
        <h1 className="text-[16px] font-semibold text-neutral-900">Reports & Analytics</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea>
          <TabsList className="mb-3 h-auto -space-x-px bg-background p-0 shadow-sm shadow-black/5 rtl:space-x-reverse">
            <TabsTrigger
              value="staff-document-expiry"
              className="relative overflow-hidden rounded-none border border-border py-2 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 first:rounded-s last:rounded-e data-[state=active]:bg-muted data-[state=active]:after:bg-primary"
            >
              <FileText
                className="-ms-0.5 me-1.5 opacity-60"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
              Document Expiry
            </TabsTrigger>
            <TabsTrigger
              value="clock-variance"
              className="relative overflow-hidden rounded-none border border-border py-2 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 first:rounded-s last:rounded-e data-[state=active]:bg-muted data-[state=active]:after:bg-primary"
            >
              <Clock
                className="-ms-0.5 me-1.5 opacity-60"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
              Clock Variance
            </TabsTrigger>
            <TabsTrigger
              value="work-hours"
              className="relative overflow-hidden rounded-none border border-border py-2 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 first:rounded-s last:rounded-e data-[state=active]:bg-muted data-[state=active]:after:bg-primary"
            >
              <Users
                className="-ms-0.5 me-1.5 opacity-60"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
              Work Hours
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="staff-document-expiry">
          <div className="pt-1">
            <StaffDocumentExpiryReport />
          </div>
        </TabsContent>

        <TabsContent value="clock-variance">
          <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-card p-8 text-center mt-1">
            <Clock className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Clock In/Out Variance Report</h3>
            <p className="text-neutral-500 mb-4">
              This report will show staff who clocked in or out from shifts with variance of at least 10 minutes from scheduled times.
            </p>
            <p className="text-sm text-neutral-400">Coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="work-hours">
          <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-card p-8 text-center mt-1">
            <Users className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Work Hours Compliance Report</h3>
            <p className="text-neutral-500 mb-4">
              This report will monitor individual staff compliance with maximum work hour limits per period.
            </p>
            <p className="text-sm text-neutral-400">Coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
