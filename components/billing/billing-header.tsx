"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Plus, DollarSign, Download, MoreVertical } from "lucide-react";

interface BillingHeaderProps {
  onGenerateInvoices: () => void;
  onNewManualInvoice: () => void;
  onRecordPayment: () => void;
  onExport: () => void;
}

export function BillingHeader({
  onGenerateInvoices,
  onNewManualInvoice,
  onRecordPayment,
  onExport,
}: BillingHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-[16px] font-semibold text-neutral-900">Private Pay Billing</h1>
          <p className="text-[12px] text-neutral-500 font-normal mt-0.5">
            Manage invoices and payments for self-pay clients
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onGenerateInvoices} className="h-8 rounded-full bg-black hover:bg-neutral-800 text-white text-[12px]">
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          <span className="font-medium">Generate Invoices</span>
        </Button>
        <Button variant="outline" onClick={onNewManualInvoice} className="h-8 rounded-full border-neutral-200 text-[12px]">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          <span className="font-medium">New Manual Invoice</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-neutral-200">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRecordPayment}>
              <DollarSign className="mr-2 h-4 w-4" />
              Record Payment
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
