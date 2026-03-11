"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  MoreVertical,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { BillingClaimApi } from "@/lib/db/billing.mapper";
import { ExportClaimsDialog } from "@/components/billing/export-claims-dialog";

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
  lines?: any[];
}

export function ClaimsDashboard() {
  const [claims, setClaims] = useState<ClaimWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithRelations | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/claims");
      const { data } = await response.json();
      setClaims(data || []);
    } catch (error) {
      console.error("Failed to load claims:", error);
      toast.error("Failed to load claims");
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = useMemo(() => claims.filter((claim) => {
    const matchesSearch =
      claim.claimNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (claim.client &&
        `${claim.client.first_name} ${claim.client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;

    return matchesSearch && matchesStatus;
  }), [claims, searchQuery, statusFilter]);

  const handleUpdateStatus = async (claimId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/billing/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "submitted" && { submissionDate: new Date().toISOString() }),
        }),
      });

      if (!response.ok) throw new Error("Failed to update claim status");

      await loadClaims();
      toast.success(`Claim status updated to ${newStatus}`);
    } catch (error) {
      console.error("Failed to update claim:", error);
      toast.error("Failed to update claim status");
    }
  };

  const handleDownloadClaimCSV = async (claim: ClaimWithRelations) => {
    try {
      toast.info("Preparing CSV export...");
      
      const response = await fetch("/api/billing/claims/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "clearinghouse-csv",
          claimIds: [claim.id],
          includeLineItems: true,
          includeEVVData: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to export claim");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `claim_${claim.claimNumber}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Claim exported successfully");
    } catch (error) {
      console.error("Failed to export claim:", error);
      toast.error("Failed to export claim");
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedClaim || !paymentAmount) {
      toast.error("Please enter payment amount");
      return;
    }

    setRecordingPayment(true);
    try {
      const response = await fetch("/api/billing/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaim.id,
          amount: parseFloat(paymentAmount),
          paymentDate: new Date().toISOString(),
          paymentMethod: "eft",
          referenceNumber: paymentReference,
        }),
      });

      if (!response.ok) throw new Error("Failed to record payment");

      await loadClaims();
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setPaymentReference("");
      setSelectedClaim(null);
      toast.success("Payment recorded successfully");
    } catch (error) {
      console.error("Failed to record payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };


  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "neutral" | "info" | "positive" | "negative"; icon: any }> = {
      draft:     { variant: "neutral",  icon: Clock },
      submitted: { variant: "info",     icon: FileText },
      paid:      { variant: "positive", icon: CheckCircle2 },
      denied:    { variant: "negative", icon: XCircle },
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1 h-auto py-0.5">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const statusCounts = {
    all: claims.length,
    draft: claims.filter((c) => c.status === "draft").length,
    submitted: claims.filter((c) => c.status === "submitted").length,
    paid: claims.filter((c) => c.status === "paid").length,
    denied: claims.filter((c) => c.status === "denied").length,
  };

  const statusLabels: Record<string, string> = {
    all: "All",
    draft: "Draft",
    submitted: "Submitted",
    paid: "Paid",
    denied: "Denied",
  };

  return (
    <div className="space-y-4">
      {/* Header row — title + status tabs on left, search + export on right */}
      <div className="flex items-end justify-between border-b border-neutral-200 pb-0 pt-2">
        {/* Left: title + status tabs */}
        <div className="flex items-end gap-1">
          <div className="flex items-center gap-1.5 pr-4 pt-2 pb-2">
            <h2 className="text-[20px] font-semibold text-neutral-900 leading-none">Claims</h2>
          </div>
          {Object.entries(statusCounts).map(([status, count]) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 pt-2 pb-2 text-[12px] font-medium transition-colors",
                  isActive ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                <span>{statusLabels[status]}</span>
                <span className={cn(
                  "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  isActive ? "bg-neutral-200 text-neutral-700" : "bg-neutral-100 text-neutral-400"
                )}>
                  {count}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-neutral-900" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: search + export */}
        <div className="flex items-center gap-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
            <Input
              placeholder="Search claims…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 h-7 w-[200px] bg-white border-neutral-200 text-[12px] placeholder:text-neutral-400 focus-visible:ring-0"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            disabled={filteredClaims.length === 0}
            className="h-7 px-2.5 text-[12px] font-medium border-neutral-200 bg-white hover:bg-neutral-50 gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-neutral-400" />
            Export
          </Button>
        </div>
      </div>

      {/* Claims Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading claims...</div>
          ) : filteredClaims.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No claims found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-4 hover:bg-neutral-50">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{claim.claimNumber}</p>
                      {getStatusBadge(claim.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {claim.client
                        ? `${claim.client.first_name} ${claim.client.last_name}`
                        : "Unknown Client"}{" "}
                      • {claim.payer?.name || "Unknown Payer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Period: {format(new Date(claim.billingPeriodStart), "MMM d, yyyy")} -{" "}
                      {format(new Date(claim.billingPeriodEnd), "MMM d, yyyy")}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">${claim.totalAmount.toFixed(2)}</p>
                      {claim.paidAmount > 0 && (
                        <p className="text-xs text-green-600">Paid: ${claim.paidAmount.toFixed(2)}</p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownloadClaimCSV(claim)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download CSV
                        </DropdownMenuItem>
                        {claim.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(claim.id, "submitted")}>
                            <FileText className="h-4 w-4 mr-2" />
                            Mark as Submitted
                          </DropdownMenuItem>
                        )}
                        {claim.status === "submitted" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedClaim(claim);
                                setPaymentAmount(claim.totalAmount.toString());
                                setPaymentDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Record Payment
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(claim.id, "denied")}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Mark as Denied
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Claims Dialog */}
      <ExportClaimsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        claims={filteredClaims}
      />

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment received for claim {selectedClaim?.claimNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Reference Number (ERA/835)</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="ERA835-12345"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={recordingPayment}>
              {recordingPayment ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
