"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { BillingHeader } from "@/components/billing/billing-header";
import { BillingFilters } from "@/components/billing/billing-filters";
import { BillingKPICards } from "@/components/billing/billing-kpi-cards";
import { BillingWorkQueueTabs } from "@/components/billing/billing-work-queue-tabs";
import { InvoiceTable, Invoice } from "@/components/billing/invoice-table";
import { InvoiceDetailDrawer } from "@/components/billing/invoice-detail-drawer";
import { BillingEmptyStates } from "@/components/billing/billing-empty-states";

const GenerateInvoicesWizard = dynamic(
  () => import("@/components/billing/generate-invoices-wizard").then(m => ({ default: m.GenerateInvoicesWizard })),
  { ssr: false }
);
const GenerateClaimsWizard = dynamic(
  () => import("@/components/billing/generate-claims-wizard").then(m => ({ default: m.GenerateClaimsWizard })),
  { ssr: false }
);
const ClaimsDashboard = dynamic(
  () => import("@/components/billing/claims-dashboard").then(m => ({ default: m.ClaimsDashboard })),
  { ssr: false }
);
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Receipt, Building2, FileText, Plus, Settings2 } from "lucide-react";
import { ProviderConfig } from "@/components/billing/provider-config";
import { Button } from "@/components/ui/button";
import { DateRange } from "@/components/billing/date-range-picker";
import {
  isToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
} from "date-fns";

export default function BillingPage() {
  const [billingSection, setBillingSection] = React.useState("private-pay");
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedInvoices, setSelectedInvoices] = React.useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = React.useState(false);
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [claimsTab, setClaimsTab] = React.useState("manage");

  // Filter states
  const [dateRange, setDateRange] = React.useState("month");
  const [customDateRange, setCustomDateRange] = React.useState<DateRange>({ start: null, end: null });
  const [status, setStatus] = React.useState("all");
  const [serviceType, setServiceType] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Mock data — dates spread across today / this week / this month / last month
  const mockInvoices: Invoice[] = React.useMemo(() => {
    const t = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const daysAgo = (n: number) => { const d = new Date(t); d.setDate(d.getDate() - n); return d; };
    return [
      {
        id: "inv-1",
        invoiceNumber: "INV-000126",
        client: { name: "John Doe", id: "client-1" },
        billingPeriod: { start: fmt(daysAgo(14)), end: fmt(daysAgo(1)) },
        total: 1250.0,
        paid: 0,
        balance: 1250.0,
        status: "unpaid",
        dueDate: fmt(t),
        flags: { mileageIncluded: true, manualEdits: true },
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-000125",
        client: { name: "Jane Smith", id: "client-2" },
        billingPeriod: { start: fmt(daysAgo(21)), end: fmt(daysAgo(15)) },
        total: 890.0,
        paid: 500.0,
        balance: 390.0,
        status: "partially_paid",
        dueDate: fmt(daysAgo(3)),
        flags: { expenseIncluded: true },
      },
      {
        id: "inv-3",
        invoiceNumber: "INV-000124",
        client: { name: "Bob Johnson", id: "client-3" },
        billingPeriod: { start: fmt(daysAgo(35)), end: fmt(daysAgo(22)) },
        total: 2100.0,
        paid: 2100.0,
        balance: 0,
        status: "paid",
        dueDate: fmt(daysAgo(12)),
        flags: {},
      },
      {
        id: "inv-4",
        invoiceNumber: "INV-000123",
        client: { name: "Sara Lee", id: "client-4" },
        billingPeriod: { start: fmt(daysAgo(60)), end: fmt(daysAgo(40)) },
        total: 3200.0,
        paid: 0,
        balance: 3200.0,
        status: "overdue",
        dueDate: fmt(daysAgo(35)),
        flags: { manualEdits: true },
      },
    ];
  }, []);

  // Filter invoices based on active tab and filters
  const filteredInvoices = React.useMemo(() => {
    let filtered = [...mockInvoices];

    // Apply tab filter
    if (activeTab === "ready") {
      filtered = [];
    } else if (activeTab === "draft") {
      filtered = filtered.filter((inv) => inv.status === "draft");
    } else if (activeTab === "unpaid") {
      filtered = filtered.filter((inv) => inv.status === "unpaid" || inv.status === "partially_paid");
    } else if (activeTab === "overdue") {
      filtered = filtered.filter((inv) => inv.status === "overdue");
    }

    // Apply date range filter using billing period (check if periods overlap)
    if (dateRange !== "all") {
      const now = new Date();
      filtered = filtered.filter((inv) => {
        const periodStart = parseISO(inv.billingPeriod.start);
        const periodEnd = parseISO(inv.billingPeriod.end);
        
        let filterStart: Date;
        let filterEnd: Date;

        if (dateRange === "today") {
          filterStart = startOfDay(now);
          filterEnd = endOfDay(now);
        } else if (dateRange === "week") {
          filterStart = startOfDay(startOfWeek(now, { weekStartsOn: 0 }));
          filterEnd = endOfDay(endOfWeek(now, { weekStartsOn: 0 }));
        } else if (dateRange === "month") {
          filterStart = startOfDay(startOfMonth(now));
          filterEnd = endOfDay(endOfMonth(now));
        } else if (dateRange === "custom" && customDateRange.start && customDateRange.end) {
          filterStart = startOfDay(customDateRange.start);
          filterEnd = endOfDay(customDateRange.end);
        } else {
          return true;
        }

        // Check if billing period overlaps with filter range
        // Periods overlap if: periodStart <= filterEnd AND periodEnd >= filterStart
        return !isAfter(periodStart, filterEnd) && !isBefore(periodEnd, filterStart);
      });
    }

    // Apply status filter
    if (status !== "all") {
      filtered = filtered.filter((inv) => inv.status === status);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(query) ||
          inv.client.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activeTab, dateRange, customDateRange, status, serviceType, searchQuery, mockInvoices]);

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedInvoices(filteredInvoices.map((inv) => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleRowClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailDrawerOpen(true);
  };

  const handleClearFilters = () => {
    setDateRange("month");
    setCustomDateRange({ start: null, end: null });
    setStatus("all");
    setServiceType("all");
    setSearchQuery("");
  };

  // Calculate KPI data
  const kpiData = {
    readyToInvoice: { amount: "$3,450.00", count: 12 },
    outstanding: { amount: "$18,240.00", count: 23 },
    overdue: { amount: "$5,200.00", count: 8 },
    paidThisMonth: { amount: "$106,110.00", count: 156 },
  };

  // Calculate tab counts
  const tabCounts = {
    readyToInvoice: 12,
    draft: mockInvoices.filter((inv) => inv.status === "draft").length,
    unpaid: mockInvoices.filter((inv) => inv.status === "unpaid" || inv.status === "partially_paid").length,
    overdue: mockInvoices.filter((inv) => inv.status === "overdue").length,
  };

  return (
    <div className="space-y-4">
      {/* Top-level section tabs — header integrated */}
      <Tabs value={billingSection} onValueChange={setBillingSection}>
        {/* Header row */}
        <div className="flex items-end justify-between border-b border-neutral-200 pb-0 pt-4">
          <div className="flex items-end gap-1">
            <div className="flex items-center gap-1.5 pr-4 pt-2 pb-2">
              <h1 className="text-[20px] font-semibold text-neutral-900 leading-none">Billing</h1>
            </div>
            <TabsList variant="line" className="border-b-0">
              <TabsTrigger value="private-pay" variant="line">
                <Receipt className="h-3.5 w-3.5" />
                Private Pay
              </TabsTrigger>
              <TabsTrigger value="medicaid" variant="line">
                <Building2 className="h-3.5 w-3.5" />
                Medicaid Claims
              </TabsTrigger>
              <TabsTrigger value="configuration" variant="line">
                <Settings2 className="h-3.5 w-3.5" />
                Configuration
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-2 pb-2">
            {billingSection === "private-pay" && (
              <Button onClick={() => setIsWizardOpen(true)} className="h-7 rounded-full bg-[#FED96A] hover:bg-[#F5CC5A] text-neutral-900 px-3 text-[12px]">
                <FileText className="mr-1 h-3.5 w-3.5" />
                <span className="font-medium">Generate Invoices</span>
              </Button>
            )}
            {billingSection === "medicaid" && (
              <Button onClick={() => setClaimsTab("generate")} className="h-7 rounded-full bg-[#FED96A] hover:bg-[#F5CC5A] text-neutral-900 px-3 text-[12px]">
                <Plus className="mr-1 h-3.5 w-3.5" />
                <span className="font-medium">Generate Claims</span>
              </Button>
            )}
          </div>
        </div>

        {/* Private Pay content */}
        <TabsContent value="private-pay" className="mt-4 space-y-4">
          <BillingFilters
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
            status={status}
            onStatusChange={setStatus}
            serviceType={serviceType}
            onServiceTypeChange={setServiceType}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearFilters={handleClearFilters}
          />

          <BillingKPICards
            readyToInvoice={kpiData.readyToInvoice}
            outstanding={kpiData.outstanding}
            overdue={kpiData.overdue}
            paidThisMonth={kpiData.paidThisMonth}
            onReadyToInvoiceClick={() => {
              setActiveTab("ready");
              setIsWizardOpen(true);
            }}
            onOutstandingClick={() => setActiveTab("unpaid")}
            onOverdueClick={() => setActiveTab("overdue")}
            onPaidThisMonthClick={() => {
              setStatus("paid");
              setActiveTab("all");
            }}
          />

          <BillingWorkQueueTabs
            readyToInvoiceCount={tabCounts.readyToInvoice}
            draftCount={tabCounts.draft}
            unpaidCount={tabCounts.unpaid}
            overdueCount={tabCounts.overdue}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            {filteredInvoices.length === 0 ? (
              <BillingEmptyStates
                type={
                  activeTab === "ready"
                    ? "no-ready-to-invoice"
                    : filteredInvoices.length === 0 && searchQuery
                    ? "no-invoices"
                    : "no-invoices"
                }
                onGenerateInvoices={() => setIsWizardOpen(true)}
              />
            ) : (
              <InvoiceTable
                invoices={filteredInvoices}
                selectedInvoices={selectedInvoices}
                onSelectInvoice={handleSelectInvoice}
                onSelectAll={handleSelectAll}
                onRowClick={handleRowClick}
                onMarkAsSent={(ids) => {
                  console.log("Mark as sent:", ids);
                  setSelectedInvoices([]);
                }}
                onDownloadPDFs={(ids) => {
                  console.log("Download PDFs:", ids);
                }}
                onExportCSV={(ids) => {
                  console.log("Export CSV:", ids);
                }}
                onApplyLateFee={(ids) => {
                  console.log("Apply late fee:", ids);
                }}
                onVoid={(ids) => {
                  console.log("Void:", ids);
                  setSelectedInvoices([]);
                }}
              />
            )}
          </BillingWorkQueueTabs>

          <InvoiceDetailDrawer
            invoice={selectedInvoice}
            open={isDetailDrawerOpen}
            onClose={() => {
              setIsDetailDrawerOpen(false);
              setSelectedInvoice(null);
            }}
            onSend={(invoice) => console.log("Send invoice:", invoice)}
            onDownloadPDF={(invoice) => console.log("Download PDF:", invoice)}
            onRecordPayment={(invoice) => console.log("Record payment:", invoice)}
            onAddAdjustment={(invoice) => console.log("Add adjustment:", invoice)}
            onVoid={(invoice) => {
              console.log("Void invoice:", invoice);
              setIsDetailDrawerOpen(false);
            }}
          />

          <GenerateInvoicesWizard
            open={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onGenerate={(data) => console.log("Generate invoices:", data)}
          />
        </TabsContent>

        {/* Medicaid Claims content */}
        <TabsContent value="medicaid" className="mt-4">
          <Tabs value={claimsTab} onValueChange={setClaimsTab}>
            <TabsList>
              <TabsTrigger value="manage" className="gap-2">
                <FileText className="h-4 w-4" />
                Manage Claims
              </TabsTrigger>
              <TabsTrigger value="generate" className="gap-2">
                <Plus className="h-4 w-4" />
                Generate New Claims
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manage" className="mt-6">
              <ClaimsDashboard />
            </TabsContent>

            <TabsContent value="generate" className="mt-6">
              <GenerateClaimsWizard />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Configuration content */}
        <TabsContent value="configuration" className="mt-4">
          <ProviderConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
