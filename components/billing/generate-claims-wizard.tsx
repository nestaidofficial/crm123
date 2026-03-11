"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Calendar as CalendarIcon, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Client {
  id: string;
  assignmentId: string;
  firstName: string;
  lastName: string;
  memberID?: string;
  payerName?: string;
  payerId?: string;
}

interface TimesheetEntry {
  id: string;
  clientId: string;
  caregiverId: string;
  caregiverName: string;
  serviceDate: string;
  billableHours: number;
  serviceCode?: string;
  modifier?: string;
  rate?: number;
}

interface ValidationIssue {
  clientId: string;
  clientName: string;
  issue: string;
  severity: "error" | "warning";
}

interface GeneratedClaim {
  claimNumber: string;
  clientName: string;
  totalAmount: number;
  lineCount: number;
}

export function GenerateClaimsWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Date Range & Client Selection
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [medicaidClients, setMedicaidClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  // Step 2: Validation
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // Step 3: Preview & Generate
  const [claimSummary, setClaimSummary] = useState<{
    totalClaims: number;
    totalAmount: number;
    totalUnits: number;
  } | null>(null);

  // Step 4: Results
  const [generatedClaims, setGeneratedClaims] = useState<GeneratedClaim[]>([]);

  // Load Medicaid clients
  useEffect(() => {
    loadMedicaidClients();
  }, []);

  const loadMedicaidClients = async () => {
    try {
      const response = await fetch("/api/billing/client-payer-assignments");
      const { data } = await response.json();
      
      const clients: Client[] = data
        .filter((assignment: any) => assignment.payer?.payerType === "medicaid")
        .map((assignment: any) => ({
          id: assignment.clientId,
          assignmentId: assignment.id,
          firstName: assignment.client?.first_name || "",
          lastName: assignment.client?.last_name || "",
          memberID: assignment.memberId,
          payerName: assignment.payer?.name,
          payerId: assignment.payerId,
        }));
      
      setMedicaidClients(clients);
    } catch (error) {
      console.error("Failed to load Medicaid clients:", error);
      toast.error("Failed to load Medicaid clients");
    }
  };

  const handleClientToggle = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!startDate || !endDate) {
        toast.error("Please select a date range");
        return;
      }
      if (selectedClients.size === 0) {
        toast.error("Please select at least one client");
        return;
      }
      await validateAndLoadTimesheets();
    } else if (step === 2) {
      if (validationIssues.some((i) => i.severity === "error")) {
        toast.error("Please fix all errors before continuing");
        return;
      }
      calculateClaimSummary();
    } else if (step === 3) {
      await generateClaims();
    }
    setStep(step + 1);
  };

  const validateAndLoadTimesheets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: startDate,
        endDate: endDate,
        timesheetStatus: "approved",
      });

      const response = await fetch(`/api/evv/timesheets?${params}`);
      const result = await response.json();
      const entries: any[] = result.data ?? [];

      const relevantTimesheets = entries.filter((entry: any) =>
        selectedClients.has(entry.client.id)
      );

      setTimesheets(relevantTimesheets);

      const issues: ValidationIssue[] = [];
      
      selectedClients.forEach((clientId) => {
        const client = medicaidClients.find((c) => c.id === clientId);
        if (!client) return;

        const clientTimesheets = relevantTimesheets.filter((t: any) => t.client.id === clientId);
        
        if (clientTimesheets.length === 0) {
          issues.push({
            clientId,
            clientName: `${client.firstName} ${client.lastName}`,
            issue: "No approved timesheets found in this period",
            severity: "warning",
          });
        }

        if (!client.memberID) {
          issues.push({
            clientId,
            clientName: `${client.firstName} ${client.lastName}`,
            issue: "Missing Medicaid Member ID",
            severity: "error",
          });
        }

        const missingRates = clientTimesheets.filter((t: any) => !t.caregiver?.payRate);
        if (missingRates.length > 0) {
          issues.push({
            clientId,
            clientName: `${client.firstName} ${client.lastName}`,
            issue: `${missingRates.length} shift(s) missing service rate`,
            severity: "error",
          });
        }
      });

      setValidationIssues(issues);
    } catch (error) {
      console.error("Failed to validate timesheets:", error);
      toast.error("Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  };

  const calculateClaimSummary = () => {
    const totalAmount = timesheets.reduce((sum, t) => sum + ((t as any).caregiver?.payRate || 0) * t.billableHours, 0);
    const totalUnits = timesheets.reduce((sum, t) => sum + Math.round(t.billableHours * 4), 0);

    setClaimSummary({
      totalClaims: selectedClients.size,
      totalAmount,
      totalUnits,
    });
  };

  const generateClaims = async () => {
    setLoading(true);
    try {
      const generated: GeneratedClaim[] = [];

      for (const clientId of Array.from(selectedClients)) {
        const client = medicaidClients.find((c) => c.id === clientId);
        if (!client) continue;

        const clientTimesheets = timesheets.filter((t) => (t as any).client.id === clientId);
        if (clientTimesheets.length === 0) continue;

        const lineItems = clientTimesheets.map((t: any) => {
          const units = Math.max(1, Math.round(t.billableHours * 4));
          // Use caregiver pay rate, fall back to $6.50/unit (standard Medicaid personal care rate)
          const ratePerUnit = t.caregiver?.payRate ? t.caregiver.payRate / 4 : 6.50;
          const rate = parseFloat(ratePerUnit.toFixed(2));
          const amount = parseFloat((units * rate).toFixed(2));
          return {
            evvVisitId: t.id,
            serviceCode: "T1019",
            modifier: null,
            units,
            rate,
            amount,
            serviceDate: t.shiftDate,
            placeOfService: "12",
            diagnosisCode: "Z74.1",
            renderingProviderNpi: null,
          };
        });

        const response = await fetch("/api/billing/claims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: client.id,
            payerId: client.payerId,
            clientPayerAssignmentId: client.assignmentId,
            billingPeriodStart: startDate,
            billingPeriodEnd: endDate,
            lineItems,
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = errBody?.error ?? errBody?.message ?? `HTTP ${response.status}`;
          throw new Error(`Failed to create claim for ${client.firstName} ${client.lastName}: ${errMsg}`);
        }

        const { data: claim } = await response.json();

        generated.push({
          claimNumber: claim.claimNumber,
          clientName: `${client.firstName} ${client.lastName}`,
          totalAmount: claim.totalAmount,
          lineCount: lineItems.length,
        });
      }

      setGeneratedClaims(generated);
      toast.success(`Successfully generated ${generated.length} claims`);
    } catch (error) {
      console.error("Failed to generate claims:", error);
      toast.error("Failed to generate claims");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setStartDate("");
    setEndDate("");
    setSelectedClients(new Set());
    setTimesheets([]);
    setValidationIssues([]);
    setClaimSummary(null);
    setGeneratedClaims([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Medicaid Claims</CardTitle>
        <CardDescription>
          Create batch Medicaid claims from approved timesheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step >= s ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
                )}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    "h-1 w-16 mx-2",
                    step > s ? "bg-neutral-900" : "bg-neutral-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Clients & Date Range */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Billing Period Start</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">Billing Period End</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Medicaid Clients ({selectedClients.size} selected)</Label>
              <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                {medicaidClients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No Medicaid clients found. Assign payers to clients first.
                  </div>
                ) : (
                  medicaidClients.map((client) => (
                    <div key={client.id} className="flex items-center gap-3 p-3 hover:bg-neutral-50">
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={() => handleClientToggle(client.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {client.firstName} {client.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.payerName} • Member ID: {client.memberID || "Missing"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Validation */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Validation Results</h3>
              <Badge variant={validationIssues.some((i) => i.severity === "error") ? "destructive" : "secondary"}>
                {validationIssues.length} issue(s) found
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Validating timesheets...
              </div>
            ) : validationIssues.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-900">All validations passed. Ready to generate claims.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {validationIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-2 p-3 rounded-lg border",
                      issue.severity === "error"
                        ? "bg-red-50 border-red-200"
                        : "bg-yellow-50 border-yellow-200"
                    )}
                  >
                    <AlertCircle
                      className={cn(
                        "h-5 w-5 mt-0.5",
                        issue.severity === "error" ? "text-red-600" : "text-yellow-600"
                      )}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{issue.clientName}</p>
                      <p className="text-sm text-muted-foreground">{issue.issue}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Found {timesheets.length} approved timesheet(s) for {selectedClients.size} client(s).
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && claimSummary && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Claim Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{claimSummary.totalClaims}</div>
                  <p className="text-xs text-muted-foreground">Claims to Generate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{claimSummary.totalUnits.toFixed(0)}</div>
                  <p className="text-xs text-muted-foreground">Total Units</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">${claimSummary.totalAmount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Click <strong>Generate Claims</strong> to create Medicaid claims with embedded EVV data.
                Claims will be ready for export in various formats.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Generated Claims</h3>

            <div className="divide-y border rounded-lg">
              {generatedClaims.map((claim) => (
                <div key={claim.claimNumber} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{claim.claimNumber}</p>
                      <p className="text-xs text-muted-foreground">{claim.clientName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${claim.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{claim.lineCount} line(s)</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 inline mr-2" />
              <span className="text-sm text-green-900">
                Successfully generated {generatedClaims.length} claim(s). You can now submit them to your clearinghouse.
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? null : setStep(step - 1))}
            disabled={step === 1 || loading}
          >
            Back
          </Button>
          <div className="flex gap-2">
            {step === 4 && (
              <Button variant="outline" onClick={handleReset}>
                Generate More Claims
              </Button>
            )}
            {step < 4 && (
              <Button onClick={handleNextStep} disabled={loading}>
                {loading
                  ? "Processing..."
                  : step === 3
                  ? "Generate Claims"
                  : "Next"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
