"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react";

interface BillingEmptyStatesProps {
  type: "no-invoices" | "no-ready-to-invoice" | "validation-errors";
  onGenerateInvoices?: () => void;
  onFixRates?: () => void;
}

export function BillingEmptyStates({
  type,
  onGenerateInvoices,
  onFixRates,
}: BillingEmptyStatesProps) {
  if (type === "no-invoices") {
    return (
      <div className="text-center py-16 px-6">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-base font-semibold mb-2">No invoices yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Get started by generating invoices from approved shifts. You can also create manual invoices for one-off charges.
        </p>
        {onGenerateInvoices && (
          <Button onClick={onGenerateInvoices}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Invoices from Approved Shifts
          </Button>
        )}
      </div>
    );
  }

  if (type === "no-ready-to-invoice") {
    return (
      <div className="text-center py-16 px-6">
        <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
        <h3 className="text-base font-semibold mb-2">No approved shifts pending billing</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          All approved shifts have been invoiced. New invoices will appear here once shifts are approved.
        </p>
      </div>
    );
  }

  if (type === "validation-errors") {
    return (
      <div className="text-center py-16 px-6">
        <AlertCircle className="h-12 w-12 mx-auto text-yellow-600 mb-4" />
        <h3 className="text-base font-semibold mb-2">Fix rates and service types to invoice</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Some shifts are missing required billing information. Please fix rates and service types before generating invoices.
        </p>
        {onFixRates && (
          <Button variant="outline" onClick={onFixRates}>
            <AlertCircle className="mr-2 h-4 w-4" />
            Fix Rates and Service Types
          </Button>
        )}
      </div>
    );
  }

  return null;
}
