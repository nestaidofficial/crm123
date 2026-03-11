"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Building2,
  AlertCircle,
  Download,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { BillingClaimApi, BillingClaimLineApi } from "@/lib/db/billing.mapper";
import {
  exportClaimsToCSV,
  exportClaimsToExcel,
  exportClaimsForClearinghouse,
  exportClearinghouseExcel,
} from "@/lib/billing/exports";
import { ExportPreviewCard } from "@/components/billing/export-preview-card";

interface ClaimWithRelations extends BillingClaimApi {
  client?: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  payer?: {
    name: string;
    electronic_payer_id: string | null;
    state: string | null;
  };
  lines?: BillingClaimLineApi[];
}

type ExportFormat = "csv" | "excel" | "clearinghouse-csv" | "clearinghouse-excel";

interface ExportClaimsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claims: ClaimWithRelations[];
  selectedClaimIds?: string[];
}

export function ExportClaimsDialog({
  open,
  onOpenChange,
  claims,
  selectedClaimIds,
}: ExportClaimsDialogProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel");
  const [includeLineItems, setIncludeLineItems] = useState(true);
  const [includeEVVData, setIncludeEVVData] = useState(true);
  const [exporting, setExporting] = useState(false);

  const claimsToExport = selectedClaimIds
    ? claims.filter((c) => selectedClaimIds.includes(c.id))
    : claims;

  const exportFormats = [
    {
      id: "csv",
      name: "CSV",
      description: "Comma-separated values for spreadsheets",
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      id: "excel",
      name: "Excel",
      description: "Multi-sheet workbook with formatting",
      icon: FileSpreadsheet,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      id: "clearinghouse-csv",
      name: "Clearinghouse CSV",
      description: "CSV format for clearinghouse upload",
      icon: Building2,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      id: "clearinghouse-excel",
      name: "Clearinghouse Excel",
      description: "Excel format for clearinghouse upload",
      icon: Building2,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ] as const;

  const handleExport = async () => {
    if (claimsToExport.length === 0) {
      toast.error("No claims to export");
      return;
    }

    setExporting(true);

    try {
      const timestamp = new Date().toISOString().split("T")[0];

      switch (exportFormat) {
        case "csv":
          exportClaimsToCSV(claimsToExport, {
            filename: `claims_${timestamp}.csv`,
          });
          toast.success(`Exported ${claimsToExport.length} claims to CSV`);
          break;

        case "excel":
          await exportClaimsToExcel(claimsToExport, {
            filename: `claims_${timestamp}.xlsx`,
            includeLineItems,
            includeEVVData,
          });
          toast.success(`Exported ${claimsToExport.length} claims to Excel`);
          break;

        case "clearinghouse-csv":
        case "clearinghouse-excel": {
          const response = await fetch("/api/billing/provider-config");
          const { data: providerConfig } = await response.json();

          if (!providerConfig) {
            toast.error("Provider configuration not found. Please configure your provider info first.");
            return;
          }

          // Fetch full claim details with lines if not already loaded
          const claimsWithLines = await Promise.all(
            claimsToExport.map(async (claim) => {
              if (claim.lines && claim.lines.length > 0) {
                return claim;
              }
              const linesResponse = await fetch(`/api/billing/claims/${claim.id}`);
              const { data } = await linesResponse.json();
              return { ...claim, lines: data.lines || [] };
            })
          );

          const config = {
            providerName: providerConfig.providerName,
            npi: providerConfig.npi,
            taxId: providerConfig.taxId,
            taxonomyCode: providerConfig.taxonomyCode,
            address: providerConfig.billingAddress,
          };

          if (exportFormat === "clearinghouse-csv") {
            exportClaimsForClearinghouse(claimsWithLines as any, config, {
              filename: `clearinghouse_${timestamp}.csv`,
            });
            toast.success(`Exported ${claimsWithLines.length} claims for clearinghouse (CSV)`);
          } else {
            await exportClearinghouseExcel(claimsWithLines as any, config, {
              filename: `clearinghouse_${timestamp}.xlsx`,
            });
            toast.success(`Exported ${claimsWithLines.length} claims for clearinghouse (Excel)`);
          }
          break;
        }

        default:
          toast.error("Unsupported export format");
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const selectedFormat = exportFormats.find((f) => f.id === exportFormat);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Claims</DialogTitle>
          <DialogDescription>
            Choose an export format for {claimsToExport.length} claim{claimsToExport.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Preview */}
          <ExportPreviewCard
            claims={claimsToExport}
            includeLineItems={includeLineItems}
            includeEVVData={includeEVVData}
          />

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
              <div className="grid gap-3">
                {exportFormats.map((format) => {
                  const Icon = format.icon;
                  const isSelected = exportFormat === format.id;

                  return (
                    <Card
                      key={format.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isSelected && `ring-2 ring-neutral-900 ${format.borderColor}`
                      )}
                      onClick={() => setExportFormat(format.id as ExportFormat)}
                    >
                      <CardContent className="flex items-start gap-4 p-4">
                        <RadioGroupItem value={format.id} id={format.id} className="mt-1" />
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                            format.bgColor
                          )}
                        >
                          <Icon className={cn("h-5 w-5", format.color)} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label htmlFor={format.id} className="text-sm font-semibold cursor-pointer">
                            {format.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">{format.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-neutral-900 shrink-0 mt-1" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Export Options */}
          {(exportFormat === "excel" || exportFormat === "csv") && (
            <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
              <Label className="text-sm font-medium">Export Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeLineItems"
                    checked={includeLineItems}
                    onCheckedChange={(checked) => setIncludeLineItems(checked as boolean)}
                  />
                  <label
                    htmlFor="includeLineItems"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Include line item details
                  </label>
                </div>
                {exportFormat === "excel" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeEVVData"
                      checked={includeEVVData}
                      onCheckedChange={(checked) => setIncludeEVVData(checked as boolean)}
                    />
                    <label
                      htmlFor="includeEVVData"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include EVV verification data
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Format-specific info */}
          {(exportFormat === "clearinghouse-csv" || exportFormat === "clearinghouse-excel") && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <Building2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-medium">Clearinghouse Format:</p>
                <ul className="mt-1 space-y-1 text-xs list-disc list-inside">
                  <li>Flattened format for Change Healthcare, Availity, Office Ally</li>
                  <li>Includes provider, patient, and service line details</li>
                  <li>Contains EVV verification timestamps and GPS coordinates</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting || claimsToExport.length === 0}>
            {exporting ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {claimsToExport.length} Claim{claimsToExport.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
