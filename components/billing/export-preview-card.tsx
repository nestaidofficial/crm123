"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, DollarSign, Users, FileCheck } from "lucide-react";
import type { BillingClaimApi } from "@/lib/db/billing.mapper";

interface ExportPreviewCardProps {
  claims: Array<BillingClaimApi & { lines?: any[] }>;
  includeLineItems?: boolean;
  includeEVVData?: boolean;
}

export function ExportPreviewCard({
  claims,
  includeLineItems = true,
  includeEVVData = true,
}: ExportPreviewCardProps) {
  const totalAmount = claims.reduce((sum, claim) => sum + claim.totalAmount, 0);
  const totalPaid = claims.reduce((sum, claim) => sum + claim.paidAmount, 0);
  const totalLines = claims.reduce((sum, claim) => sum + (claim.lines?.length || 0), 0);
  
  const claimsWithEDI = claims.filter((c) => c.ediContent).length;
  
  const statusBreakdown = claims.reduce((acc, claim) => {
    acc[claim.status] = (acc[claim.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dateRange = {
    start: claims.reduce((earliest, claim) => {
      const date = new Date(claim.billingPeriodStart);
      return date < earliest ? date : earliest;
    }, new Date(claims[0]?.billingPeriodStart || new Date())),
    end: claims.reduce((latest, claim) => {
      const date = new Date(claim.billingPeriodEnd);
      return date > latest ? date : latest;
    }, new Date(claims[0]?.billingPeriodEnd || new Date())),
  };

  return (
    <Card className="border-neutral-200 bg-neutral-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-neutral-600">Export Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-neutral-500 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Claims</p>
              <p className="text-lg font-semibold">{claims.length}</p>
            </div>
          </div>

          {includeLineItems && (
            <div className="flex items-start gap-2">
              <FileCheck className="h-4 w-4 text-neutral-500 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Line Items</p>
                <p className="text-lg font-semibold">{totalLines}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-neutral-500 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg font-semibold">${totalAmount.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Paid Amount</p>
              <p className="text-lg font-semibold text-green-600">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
          </span>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-600">Status Breakdown</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(statusBreakdown).map(([status, count]) => (
              <Badge key={status} variant="secondary" className="text-xs">
                {status}: {count}
              </Badge>
            ))}
          </div>
        </div>

        {/* EDI Availability */}
        {claimsWithEDI > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">EDI Files Available</span>
            <span className="font-medium">
              {claimsWithEDI} / {claims.length}
            </span>
          </div>
        )}

        {/* Data Included */}
        {(includeLineItems || includeEVVData) && (
          <div className="pt-2 border-t border-neutral-200">
            <p className="text-xs font-medium text-neutral-600 mb-2">Data Included</p>
            <div className="space-y-1">
              {includeLineItems && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Service line details
                </div>
              )}
              {includeEVVData && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  EVV verification data
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
