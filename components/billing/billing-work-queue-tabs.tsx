"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BillingWorkQueueTabsProps {
  readyToInvoiceCount: number;
  draftCount: number;
  unpaidCount: number;
  overdueCount: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function BillingWorkQueueTabs({
  readyToInvoiceCount,
  draftCount,
  unpaidCount,
  overdueCount,
  activeTab,
  onTabChange,
  children,
}: BillingWorkQueueTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-5 gap-0 rounded-xl border border-black/5 bg-white p-1">
        <TabsTrigger
          value="ready"
          className={cn(
            "relative rounded-lg data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground"
          )}
        >
          Ready to Invoice
          {readyToInvoiceCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-[10px] border-black/10">
              {readyToInvoiceCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="draft"
          className="rounded-lg data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground"
        >
          Draft
          {draftCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-[10px] border-black/10">
              {draftCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="unpaid"
          className="rounded-lg data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground"
        >
          Unpaid
          {unpaidCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-[10px] border-black/10">
              {unpaidCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="overdue"
          className="rounded-lg data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground"
        >
          Overdue
          {overdueCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-[10px]">
              {overdueCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="all"
          className="rounded-lg data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground"
        >
          All Invoices
        </TabsTrigger>
      </TabsList>
      <TabsContent value={activeTab} className="mt-4">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
          {children}
        </div>
      </TabsContent>
    </Tabs>
  );
}
