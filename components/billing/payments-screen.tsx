"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, Calendar, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Payment {
  id: string;
  date: string;
  client: {
    name: string;
    id: string;
  };
  amount: number;
  method: string;
  reference?: string;
  appliedInvoices: string[];
  unappliedAmount: number;
}

interface PaymentsScreenProps {
  payments: Payment[];
  onRecordPayment: (payment: PaymentData) => void;
}

interface PaymentData {
  clientId: string;
  amount: number;
  method: string;
  reference?: string;
  date: string;
  autoApply: boolean;
}

export function PaymentsScreen({ payments, onRecordPayment }: PaymentsScreenProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState("month");
  const [selectedClient, setSelectedClient] = React.useState("");
  const [selectedMethod, setSelectedMethod] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Form state
  const [formClientId, setFormClientId] = React.useState("");
  const [formAmount, setFormAmount] = React.useState("");
  const [formMethod, setFormMethod] = React.useState("check");
  const [formReference, setFormReference] = React.useState("");
  const [formDate, setFormDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [autoApply, setAutoApply] = React.useState(true);

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

  const handleRecordPayment = () => {
    if (!formClientId || !formAmount) {
      alert("Please fill in all required fields");
      return;
    }

    const paymentData: PaymentData = {
      clientId: formClientId,
      amount: parseFloat(formAmount),
      method: formMethod,
      reference: formReference || undefined,
      date: formDate,
      autoApply,
    };

    onRecordPayment(paymentData);
    setIsDialogOpen(false);
    // Reset form
    setFormClientId("");
    setFormAmount("");
    setFormMethod("check");
    setFormReference("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setAutoApply(true);
  };

  const filteredPayments = payments.filter((payment) => {
    if (selectedClient && selectedClient !== "all" && payment.client.id !== selectedClient) return false;
    if (selectedMethod && selectedMethod !== "all" && payment.method !== selectedMethod) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        payment.client.name.toLowerCase().includes(query) ||
        payment.reference?.toLowerCase().includes(query) ||
        payment.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Mock clients - in real app, this would come from props or API
  const clients = [
    { id: "client-1", name: "John Doe" },
    { id: "client-2", name: "Jane Smith" },
    { id: "client-3", name: "Bob Johnson" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Payments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track and manage payment records
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedClient || "all"} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMethod || "all"} onValueChange={setSelectedMethod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Payment Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="check">Check</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="credit_card">Credit Card</SelectItem>
            <SelectItem value="ach">ACH</SelectItem>
            <SelectItem value="wire">Wire Transfer</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-[50px]"
          />
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Payment ID
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Client
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Method
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Reference #
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Applied Invoices
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider">
                      Unapplied
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2 text-xs font-medium border-r">
                        {payment.id}
                      </td>
                      <td className="px-3 py-2 text-xs border-r whitespace-nowrap">
                        {formatDate(payment.date)}
                      </td>
                      <td className="px-3 py-2 text-xs border-r">
                        {payment.client.name}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-medium border-r">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-3 py-2 border-r">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                          {payment.method}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground border-r">
                        {payment.reference || "-"}
                      </td>
                      <td className="px-3 py-2 text-xs border-r">
                        {payment.appliedInvoices.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {payment.appliedInvoices.map((inv, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-[10px] px-1 py-0"
                              >
                                {inv}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-right border-r">
                        {payment.unappliedAmount > 0 ? (
                          <span className="text-yellow-600 font-medium">
                            {formatCurrency(payment.unappliedAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPayments.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No payments found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-client">Client *</Label>
              <Select value={formClientId} onValueChange={setFormClientId}>
                <SelectTrigger id="payment-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Method *</Label>
                <Select value={formMethod} onValueChange={setFormMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="ach">ACH</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date">Date *</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-reference">Reference #</Label>
              <Input
                id="payment-reference"
                placeholder="Check number, transaction ID, etc."
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
              />
            </div>

            <div className="bg-muted/50 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-apply" className="text-sm">
                    Auto-apply to oldest unpaid invoices
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically apply this payment to the oldest unpaid invoices for this client
                  </p>
                </div>
                <input
                  id="auto-apply"
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment}>
              <DollarSign className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
