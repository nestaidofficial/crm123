"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  MapPin,
  Edit,
  Receipt,
  RotateCcw,
  MoreHorizontal,
  Download,
  FileText,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  client: {
    name: string;
    id: string;
  };
  billingPeriod: {
    start: string;
    end: string;
  };
  total: number;
  paid: number;
  balance: number;
  status: "draft" | "sent" | "unpaid" | "partially_paid" | "paid" | "overdue" | "voided";
  dueDate: string;
  flags: {
    missingRate?: boolean;
    mileageIncluded?: boolean;
    manualEdits?: boolean;
    expenseIncluded?: boolean;
    recurring?: boolean;
  };
}

interface InvoiceTableProps {
  invoices: Invoice[];
  selectedInvoices: string[];
  onSelectInvoice: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onRowClick: (invoice: Invoice) => void;
  onMarkAsSent: (ids: string[]) => void;
  onDownloadPDFs: (ids: string[]) => void;
  onExportCSV: (ids: string[]) => void;
  onApplyLateFee: (ids: string[]) => void;
  onVoid: (ids: string[]) => void;
}

export function InvoiceTable({
  invoices,
  selectedInvoices,
  onSelectInvoice,
  onSelectAll,
  onRowClick,
  onMarkAsSent,
  onDownloadPDFs,
  onExportCSV,
  onApplyLateFee,
  onVoid,
}: InvoiceTableProps) {
  const allSelected = invoices.length > 0 && selectedInvoices.length === invoices.length;
  const someSelected = selectedInvoices.length > 0 && selectedInvoices.length < invoices.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    const variants: Record<Invoice["status"], { variant: "neutral" | "info" | "warning" | "positive" | "negative"; label: string }> = {
      draft:          { variant: "neutral",  label: "Draft" },
      sent:           { variant: "info",     label: "Sent" },
      unpaid:         { variant: "warning",  label: "Unpaid" },
      partially_paid: { variant: "warning",  label: "Partially Paid" },
      paid:           { variant: "positive", label: "Paid" },
      overdue:        { variant: "negative", label: "Overdue" },
      voided:         { variant: "neutral",  label: "Voided" },
    };

    const config = variants[status] || { variant: "neutral" as const, label: status };
    return (
      <Badge variant={config.variant} className="text-[10px] px-1.5 py-0.5 h-auto">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedInvoices.length > 0 && (
        <div className="flex items-center justify-between border-b border-black/5 bg-neutral-50 px-4 py-2">
          <span className="text-xs text-muted-foreground">
            {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkAsSent(selectedInvoices)}
              className="h-7 text-xs"
            >
              <Send className="mr-1 h-3 w-3" />
              Mark as Sent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadPDFs(selectedInvoices)}
              className="h-7 text-xs"
            >
              <Download className="mr-1 h-3 w-3" />
              Download PDFs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportCSV(selectedInvoices)}
              className="h-7 text-xs"
            >
              <FileText className="mr-1 h-3 w-3" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApplyLateFee(selectedInvoices)}
              className="h-7 text-xs"
            >
              Apply Late Fee
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVoid(selectedInvoices)}
              className="h-7 text-xs text-destructive"
            >
              <X className="mr-1 h-3 w-3" />
              Void
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="border-b border-black/5 bg-neutral-100">
            <tr>
              <th className="px-3 py-2 text-left w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                  aria-label="Select all"
                />
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                Invoice #
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                Client
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                Billing Period
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                Total
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                Paid
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                Balance
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                Status
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                Due Date
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                Flags
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 bg-white">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className={cn(
                  "cursor-pointer bg-white transition-colors hover:bg-neutral-50",
                  invoice.status === "overdue" && "hover:bg-neutral-100/50",
                  invoice.status === "paid" && "hover:bg-neutral-50/50"
                )}
                onClick={() => onRowClick(invoice)}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedInvoices.includes(invoice.id)}
                    onCheckedChange={() => onSelectInvoice(invoice.id)}
                    aria-label={`Select invoice ${invoice.invoiceNumber}`}
                  />
                </td>
                <td className="px-3 py-2 text-xs font-medium border-r">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-3 py-2 text-xs border-r">{invoice.client.name}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground border-r whitespace-nowrap">
                  {formatDate(invoice.billingPeriod.start)} - {formatDate(invoice.billingPeriod.end)}
                </td>
                <td className="px-3 py-2 text-xs text-right font-medium border-r">
                  {formatCurrency(invoice.total)}
                </td>
                <td className="px-3 py-2 text-xs text-right text-muted-foreground border-r">
                  {formatCurrency(invoice.paid)}
                </td>
                <td className="px-3 py-2 text-xs text-right font-medium border-r">
                  {formatCurrency(invoice.balance)}
                </td>
                <td className="px-3 py-2 border-r">{getStatusBadge(invoice.status)}</td>
                <td className="px-3 py-2 text-xs border-r whitespace-nowrap">
                  {formatDate(invoice.dueDate)}
                </td>
                <td className="px-3 py-2 border-r">
                  <div className="flex items-center gap-1">
                    {invoice.flags.missingRate && (
                      <span title="Missing rate"><AlertTriangle className="h-3.5 w-3.5 text-yellow-600" /></span>
                    )}
                    {invoice.flags.mileageIncluded && (
                      <span title="Mileage included"><MapPin className="h-3.5 w-3.5 text-blue-600" /></span>
                    )}
                    {invoice.flags.manualEdits && (
                      <span title="Manual edits"><Edit className="h-3.5 w-3.5 text-orange-600" /></span>
                    )}
                    {invoice.flags.expenseIncluded && (
                      <span title="Expense included"><Receipt className="h-3.5 w-3.5 text-purple-600" /></span>
                    )}
                    {invoice.flags.recurring && (
                      <span title="Recurring invoice"><RotateCcw className="h-3.5 w-3.5 text-green-600" /></span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onRowClick(invoice)}>
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDownloadPDFs([invoice.id])}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </DropdownMenuItem>
                      {invoice.status === "draft" && (
                        <DropdownMenuItem onClick={() => onMarkAsSent([invoice.id])}>
                          <Send className="mr-2 h-4 w-4" />
                          Mark as Sent
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onVoid([invoice.id])}
                        className="text-destructive"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Void Invoice
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {invoices.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No invoices found</p>
        </div>
      )}
    </div>
  );
}
