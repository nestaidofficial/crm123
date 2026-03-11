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
import { Separator } from "@/components/ui/separator";
import {
  Send,
  Download,
  DollarSign,
  Plus,
  X,
  FileText,
  Clock,
  History,
  AlertCircle,
  MapPin,
  Edit,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { Invoice } from "./invoice-table";
import { cn } from "@/lib/utils";

interface InvoiceDetailDrawerProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onSend: (invoice: Invoice) => void;
  onDownloadPDF: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onAddAdjustment: (invoice: Invoice) => void;
  onVoid: (invoice: Invoice) => void;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  type: "service" | "mileage" | "expense";
  serviceType?: string;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  recordedBy: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

export function InvoiceDetailDrawer({
  invoice,
  open,
  onClose,
  onSend,
  onDownloadPDF,
  onRecordPayment,
  onAddAdjustment,
  onVoid,
}: InvoiceDetailDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<"line-items" | "source-shifts" | "payments" | "audit">("line-items");

  if (!invoice) return null;

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

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    const variants: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-neutral-100 text-neutral-700" },
      sent: { label: "Sent", className: "bg-neutral-100 text-neutral-700" },
      unpaid: { label: "Unpaid", className: "bg-neutral-100 text-neutral-700" },
      partially_paid: { label: "Partially Paid", className: "bg-neutral-100 text-neutral-800" },
      paid: { label: "Paid", className: "bg-neutral-100 text-neutral-900" },
      overdue: { label: "Overdue", className: "bg-neutral-200 text-neutral-900" },
      voided: { label: "Voided", className: "bg-neutral-100 text-neutral-500" },
    };

    const config = variants[status] || { label: status, className: "bg-neutral-100 text-neutral-600" };
    return (
      <span className={cn("text-xs font-medium px-2 py-1 rounded-full", config.className)}>
        {config.label}
      </span>
    );
  };

  // Mock data - in real app, this would come from props or API
  const lineItems: LineItem[] = [
    {
      id: "1",
      description: "Personal Care - 8 hours",
      quantity: 8,
      unit: "hours",
      rate: 25.0,
      amount: 200.0,
      type: "service",
      serviceType: "Personal Care",
    },
    {
      id: "2",
      description: "Mileage - 15 miles",
      quantity: 15,
      unit: "miles",
      rate: 0.56,
      amount: 8.4,
      type: "mileage",
    },
  ];

  const payments: Payment[] = [
    {
      id: "1",
      date: "2024-01-15",
      amount: 100.0,
      method: "Check",
      reference: "CHK-1234",
      recordedBy: "Admin User",
    },
  ];

  const auditLog: AuditLogEntry[] = [
    {
      id: "1",
      action: "Invoice created",
      user: "System",
      timestamp: invoice.billingPeriod.start,
    },
    {
      id: "2",
      action: "Invoice sent",
      user: "Admin User",
      timestamp: invoice.dueDate,
    },
  ];

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = 0; // Would be calculated
  const total = subtotal + tax;

  const isOverdue = invoice.status === "overdue" || (new Date(invoice.dueDate) < new Date() && invoice.balance > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-white border-black/5 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <DialogHeader className="border-b border-black/5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-semibold text-neutral-900">
                  {invoice.invoiceNumber}
                </DialogTitle>
                {getStatusBadge(invoice.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {invoice.client.name} • Billing Period: {formatDate(invoice.billingPeriod.start)} - {formatDate(invoice.billingPeriod.end)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {invoice.flags.missingRate && (
                <span title="Missing rate"><AlertCircle className="h-4 w-4 text-amber-600" /></span>
              )}
              {invoice.flags.mileageIncluded && (
                <span title="Mileage included"><MapPin className="h-4 w-4 text-blue-600" /></span>
              )}
              {invoice.flags.manualEdits && (
                <span title="Manual edits"><Edit className="h-4 w-4 text-orange-600" /></span>
              )}
              {invoice.flags.expenseIncluded && (
                <span title="Expense included"><Receipt className="h-4 w-4 text-purple-600" /></span>
              )}
              {invoice.flags.recurring && (
                <span title="Recurring invoice"><RotateCcw className="h-4 w-4 text-green-600" /></span>
              )}
            </div>
          </div>

          {/* Summary — neutral boxes, color only on number */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="p-3 rounded-xl border border-black/5 bg-neutral-50/50">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold mt-1 text-neutral-900">{formatCurrency(invoice.total)}</p>
            </div>
            <div className="p-3 rounded-xl border border-black/5 bg-neutral-50/50">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-semibold mt-1 text-green-700">{formatCurrency(invoice.paid)}</p>
            </div>
            <div className="p-3 rounded-xl border border-black/5 bg-neutral-50/50">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={cn("text-lg font-semibold mt-1", isOverdue ? "text-red-600" : "text-neutral-900")}>{formatCurrency(invoice.balance)}</p>
            </div>
            <div className="p-3 rounded-xl border border-black/5 bg-neutral-50/50">
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="text-lg font-semibold mt-1 text-neutral-900">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs: white container, selected = lime pill */}
        <div className="pt-4">
          <div className="bg-neutral-100 rounded-full p-1 flex mb-4">
            {(["line-items", "source-shifts", "payments", "audit"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  activeTab === tab ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {tab === "line-items" && "Line Items"}
                {tab === "source-shifts" && "Source Shifts"}
                {tab === "payments" && "Payments"}
                {tab === "audit" && "Audit Log"}
              </button>
            ))}
          </div>

          {activeTab === "line-items" && (
            <div className="space-y-4 mt-4">
              {/* Service Lines — Stripe/QuickBooks style: white rows, light gray header, dividers */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 mb-2">Services</h4>
                <div className="rounded-lg border border-black/5 overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-100 border-b border-black/5">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-700">Description</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-700">Qty</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-700">Rate</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white">
                      {lineItems
                        .filter((item) => item.type === "service")
                        .map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2.5 text-neutral-900">{item.description}</td>
                            <td className="px-3 py-2.5 text-right text-neutral-600">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2.5 text-right text-neutral-600">{formatCurrency(item.rate)}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-neutral-900">{formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {lineItems.some((item) => item.type === "mileage") && (
                <>
                  <div className="border-t border-black/5 pt-4" role="separator" aria-hidden />
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-2">Mileage</h4>
                    <div className="rounded-lg border border-black/5 overflow-hidden bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-neutral-100 border-b border-black/5">
                          <tr>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-700">Description</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-700">Miles</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-700">Rate</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-700">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 bg-white">
                          {lineItems
                            .filter((item) => item.type === "mileage")
                            .map((item) => (
                              <tr key={item.id}>
                                <td className="px-3 py-2.5 text-neutral-900">{item.description}</td>
                                <td className="px-3 py-2.5 text-right text-neutral-600">{item.quantity}</td>
                                <td className="px-3 py-2.5 text-right text-neutral-600">{formatCurrency(item.rate)}</td>
                                <td className="px-3 py-2.5 text-right font-medium text-neutral-900">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-black/5 pt-4" role="separator" aria-hidden />
              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-neutral-900">{formatCurrency(subtotal)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium text-neutral-900">{formatCurrency(tax)}</span>
                    </div>
                  )}
                  <Separator className="bg-black/5" />
                  <div className="flex justify-between text-base font-semibold text-neutral-900">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "source-shifts" && (
            <div className="space-y-3 mt-4 pt-4 border-t border-black/5">
              <p className="text-sm text-muted-foreground">
                This invoice includes the following approved shifts:
              </p>
              <div className="rounded-lg border border-black/5 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Shift #12345</p>
                    <p className="text-xs text-muted-foreground">Jan 10, 2024 • 8 hours</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs">
                    View Shift
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-3 mt-4 pt-4 border-t border-black/5">
              {payments.length > 0 ? (
                <>
                  {payments.map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-black/5 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(payment.date)} • {payment.method}
                            {payment.reference && ` • ${payment.reference}`}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">by {payment.recordedBy}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-black/5">
                    <div className="flex justify-between text-sm font-medium text-neutral-900">
                      <span>Remaining Balance</span>
                      <span>{formatCurrency(invoice.balance)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No payments recorded yet
                </p>
              )}
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-3 mt-4 pt-4 border-t border-black/5">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-black/5 bg-white">
                  <History className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{entry.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.user} • {formatDateTime(entry.timestamp)}
                    </p>
                    {entry.details && (
                      <p className="text-xs text-muted-foreground mt-1">{entry.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap gap-2 border-t border-black/5 pt-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {invoice.status !== "voided" && (
            <>
              {invoice.status === "draft" && (
                <Button variant="outline" onClick={() => onSend(invoice)}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              )}
              <Button variant="outline" onClick={() => onDownloadPDF(invoice)}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              {invoice.balance > 0 && (
                <Button onClick={() => onRecordPayment(invoice)}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              )}
              <Button variant="outline" onClick={() => onAddAdjustment(invoice)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Adjustment
              </Button>
              <Button variant="destructive" onClick={() => onVoid(invoice)}>
                <X className="mr-2 h-4 w-4" />
                Void
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
