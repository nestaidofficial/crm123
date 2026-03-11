"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerateInvoicesWizardProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (data: WizardData) => void;
}

interface WizardData {
  billingPeriod: {
    start: string;
    end: string;
  };
  clients: string[]; // empty array means "all"
  includeMileage: boolean;
  includeExpenses: boolean;
}

interface ValidationIssue {
  type: "missing_rate" | "missing_service_type" | "unapproved_shift" | "mileage_missing";
  count: number;
  description: string;
}

interface PreviewClient {
  id: string;
  name: string;
  total: number;
  shiftCount: number;
}

export function GenerateInvoicesWizard({
  open,
  onClose,
  onGenerate,
}: GenerateInvoicesWizardProps) {
  const [step, setStep] = React.useState(1);
  const [billingPeriodStart, setBillingPeriodStart] = React.useState("");
  const [billingPeriodEnd, setBillingPeriodEnd] = React.useState("");
  const [selectedClients, setSelectedClients] = React.useState<string[]>([]);
  const [selectAllClients, setSelectAllClients] = React.useState(true);
  const [includeMileage, setIncludeMileage] = React.useState(true);
  const [includeExpenses, setIncludeExpenses] = React.useState(true);
  const [validationIssues, setValidationIssues] = React.useState<ValidationIssue[]>([]);
  const [previewClients, setPreviewClients] = React.useState<PreviewClient[]>([]);

  // Mock client data
  const clients = [
    { id: "client-1", name: "John Doe" },
    { id: "client-2", name: "Jane Smith" },
    { id: "client-3", name: "Bob Johnson" },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate step 1
      if (!billingPeriodStart || !billingPeriodEnd) {
        alert("Please select a billing period");
        return;
      }
      // Simulate validation
      setValidationIssues([
        {
          type: "missing_rate",
          count: 3,
          description: "Shifts with missing rates",
        },
        {
          type: "missing_service_type",
          count: 1,
          description: "Shifts with missing service types",
        },
      ]);
      setStep(2);
    } else if (step === 2) {
      // Generate preview
      setPreviewClients([
        { id: "client-1", name: "John Doe", total: 1250.0, shiftCount: 5 },
        { id: "client-2", name: "Jane Smith", total: 890.0, shiftCount: 3 },
      ]);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleGenerate = () => {
    const data: WizardData = {
      billingPeriod: {
        start: billingPeriodStart,
        end: billingPeriodEnd,
      },
      clients: selectAllClients ? [] : selectedClients,
      includeMileage,
      includeExpenses,
    };
    onGenerate(data);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setBillingPeriodStart("");
    setBillingPeriodEnd("");
    setSelectedClients([]);
    setSelectAllClients(true);
    setIncludeMileage(true);
    setIncludeExpenses(true);
    setValidationIssues([]);
    setPreviewClients([]);
    onClose();
  };

  const toggleClient = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter((id) => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
    setSelectAllClients(false);
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectAllClients(checked);
    if (checked) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map((c) => c.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide rounded-lg border-neutral-200 bg-neutral-0 p-6 shadow-card border">
        <DialogHeader className="p-0 text-left">
          <DialogTitle className="text-h2 text-neutral-900">Generate Invoices</DialogTitle>
        </DialogHeader>

        {/* Progress: design system primary-500 / neutral-200, 8pt scale */}
        <div className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-body-s font-medium",
                step >= 1 ? "bg-primary-500 text-neutral-0" : "bg-neutral-200 text-neutral-500"
              )}
            >
              1
            </div>
            <div className={cn("h-0.5 w-16 shrink-0", step > 1 ? "bg-primary-500" : "bg-neutral-200")} />
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-body-s font-medium",
                step >= 2 ? "bg-primary-500 text-neutral-0" : "bg-neutral-200 text-neutral-500"
              )}
            >
              2
            </div>
            <div className={cn("h-0.5 w-16 shrink-0", step > 2 ? "bg-primary-500" : "bg-neutral-200")} />
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-body-s font-medium",
                step >= 3 ? "bg-primary-500 text-neutral-0" : "bg-neutral-200 text-neutral-500"
              )}
            >
              3
            </div>
          </div>
        </div>

        {/* Step 1: Select Scope — design system typography, inputs, borders */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-body-m font-medium text-neutral-900">Billing Period</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-body-s text-neutral-500">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={billingPeriodStart}
                    onChange={(e) => setBillingPeriodStart(e.target.value)}
                    className="h-11 rounded-md border-neutral-200 bg-neutral-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-body-s text-neutral-500">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={billingPeriodEnd}
                    onChange={(e) => setBillingPeriodEnd(e.target.value)}
                    className="h-11 rounded-md border-neutral-200 bg-neutral-50"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-neutral-200" />

            <div className="space-y-2">
              <Label className="text-body-m font-medium text-neutral-900">Clients</Label>
              <div className="rounded-md border border-neutral-200 bg-neutral-0 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="select-all" checked={selectAllClients} onCheckedChange={toggleSelectAll} />
                  <Label htmlFor="select-all" className="text-body-m font-medium text-neutral-900 cursor-pointer">
                    All Clients
                  </Label>
                </div>
                <Separator className="bg-neutral-200" />
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center gap-2">
                    <Checkbox
                      id={client.id}
                      checked={selectAllClients || selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                      disabled={selectAllClients}
                    />
                    <Label htmlFor={client.id} className="text-body-m text-neutral-900 cursor-pointer">
                      {client.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-neutral-200" />

            <div className="space-y-4">
              <Label className="text-body-m font-medium text-neutral-900">Options</Label>
              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <Label htmlFor="include-mileage" className="text-body-m font-medium text-neutral-900">
                    Include Mileage
                  </Label>
                  <p className="text-body-s text-neutral-500">Include mileage charges in invoices</p>
                </div>
                <Switch id="include-mileage" checked={includeMileage} onCheckedChange={setIncludeMileage} />
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <Label htmlFor="include-expenses" className="text-body-m font-medium text-neutral-900">
                    Include Expenses
                  </Label>
                  <p className="text-body-s text-neutral-500">Include expense charges in invoices</p>
                </div>
                <Switch id="include-expenses" checked={includeExpenses} onCheckedChange={setIncludeExpenses} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Validation — design system Warning 500, neutral surfaces */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning-500" aria-hidden />
                <Label className="text-h2 text-neutral-900">Validation Issues</Label>
              </div>
              <p className="text-body-m text-neutral-500">
                Please review and fix the following issues before generating invoices:
              </p>
            </div>

            <div className="space-y-3">
              {validationIssues.map((issue, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-0 p-4"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-warning-500" aria-hidden />
                    <div>
                      <p className="text-body-m font-medium text-neutral-900">{issue.description}</p>
                      <p className="text-body-s text-neutral-500">
                        {issue.count} item{issue.count !== 1 ? "s" : ""} affected
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-neutral-200 text-neutral-900 hover:bg-neutral-50">
                    Fix Now
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning-500 mt-0.5" aria-hidden />
                <div>
                  <p className="text-body-m font-medium text-neutral-900 mb-1">Continue & Flag</p>
                  <p className="text-body-s text-neutral-500">
                    You can continue and generate invoices with these issues flagged. They will appear
                    with warning icons in the invoice table.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview — design system table, Success 500 for ready state */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-h2 text-neutral-900">Preview</Label>
              <p className="text-body-m text-neutral-500">Review the invoices that will be generated:</p>
            </div>

            <div className="overflow-hidden rounded-md border border-neutral-200">
              <table className="w-full text-left">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-body-s font-semibold text-neutral-900">Client</th>
                    <th className="px-4 py-3 text-right text-body-s font-semibold text-neutral-900">Shifts</th>
                    <th className="px-4 py-3 text-right text-body-s font-semibold text-neutral-900">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {previewClients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-4 py-3 text-body-m font-medium text-neutral-900">{client.name}</td>
                      <td className="px-4 py-3 text-right text-body-m text-neutral-500">{client.shiftCount}</td>
                      <td className="px-4 py-3 text-right text-body-m font-medium text-neutral-900">
                        {formatCurrency(client.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-50">
                  <tr>
                    <td className="px-4 py-3 text-body-m font-semibold text-neutral-900">Total</td>
                    <td className="px-4 py-3 text-right text-body-m font-semibold text-neutral-900">
                      {previewClients.reduce((sum, c) => sum + c.shiftCount, 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-body-m font-semibold text-neutral-900">
                      {formatCurrency(previewClients.reduce((sum, c) => sum + c.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="rounded-md border border-neutral-200 bg-neutral-100 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500 mt-0.5" aria-hidden />
                <div>
                  <p className="text-body-m font-medium text-neutral-900 mb-1">Ready to Generate</p>
                  <p className="text-body-s text-neutral-500">
                    {previewClients.length} draft invoice{previewClients.length !== 1 ? "s" : ""} will be created.
                    You can review and send them individually.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between gap-4 border-t border-neutral-200 pt-6">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-neutral-200 text-neutral-900 hover:bg-neutral-50"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-neutral-200 text-neutral-900 hover:bg-neutral-50"
            >
              Cancel
            </Button>
            {step < 3 ? (
              <Button onClick={handleNext} className="bg-primary-500 text-white hover:bg-primary-600">
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                className="bg-primary-500 text-white hover:bg-primary-600"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Generate Draft Invoices
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
