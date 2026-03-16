"use client";

import { useState } from "react";
import {
  UsersIcon,
  LinkIcon,
  CreditCardIcon,
  SlidersIcon,
  Save,
  Edit2,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserManagement from "@/components/settings/user-management";
import Integrations from "@/components/settings/integrations";
import SystemPreferences from "@/components/settings/system-preferences";

// ─── Sidebar Navigation Items ─────────────────────────────────────────────────
const sidebarNavItems = [
  { title: "Team", icon: UsersIcon },
  { title: "Integrations", icon: LinkIcon },
  { title: "Billing", icon: CreditCardIcon },
  { title: "Preferences", icon: SlidersIcon },
];

// ─── Team Section ─────────────────────────────────────────────────────────────
function TeamSection() {
  return (
    <Card>
      <CardContent className="pt-6">
        <UserManagement />
      </CardContent>
    </Card>
  );
}

// ─── Integrations Section ─────────────────────────────────────────────────────
function IntegrationsSection() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Integrations />
      </CardContent>
    </Card>
  );
}

// ─── Billing Static Data ──────────────────────────────────────────────────────
const transactions = [
  { id: "#36223", product: "Agency Pro — Monthly", status: "pending" as const, date: "03/01/2026", amount: "$59.90" },
  { id: "#34283", product: "Agency Pro — Monthly", status: "paid" as const, date: "02/01/2026", amount: "$59.90" },
  { id: "#32234", product: "Agency Pro — Monthly", status: "paid" as const, date: "01/01/2026", amount: "$59.90" },
  { id: "#31354", product: "Agency Pro — Monthly", status: "failed" as const, date: "12/01/2025", amount: "$59.90" },
  { id: "#30254", product: "Agency Pro — Monthly", status: "paid" as const, date: "11/01/2025", amount: "$59.90" },
  { id: "#29876", product: "Agency Starter — Monthly", status: "paid" as const, date: "10/01/2025", amount: "$29.90" },
];

const statusVariantMap = {
  pending: "warning",
  failed: "negative",
  paid: "positive",
} as const;

// ─── Billing Section ──────────────────────────────────────────────────────────
function BillingSection() {
  return (
    <div className="space-y-4">
      {/* Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base">Subscription Plan</CardTitle>
              <CardDescription>
                Agency Pro — billed monthly &nbsp;|&nbsp; Next payment on{" "}
                <span className="font-medium text-foreground">04/01/2026</span>{" "}
                for <span className="font-medium text-foreground">$59.90</span>
              </CardDescription>
            </div>
            <Button size="sm" className="shrink-0">
              Change plan
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Agency Card •••• 0392</span>
                <Badge variant="info">Primary</Badge>
              </div>
              <p className="text-muted-foreground text-xs">Expires Dec 2027</p>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <span className="text-sm font-medium">Agency Card •••• 8461</span>
              <p className="text-muted-foreground text-xs">Expires Jun 2026</p>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4" />
            Add payment method
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-sm">{t.id}</TableCell>
                  <TableCell className="text-sm">{t.product}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[t.status]} className="capitalize h-6 text-xs">
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{t.date}</TableCell>
                  <TableCell className="text-right font-medium text-sm">{t.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Preferences Section ──────────────────────────────────────────────────────
function PreferencesSection() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-8">
          <SystemPreferences />
          <div className="flex justify-end">
            <Button>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Team");

  const renderContent = () => {
    switch (activeTab) {
      case "Team":
        return <TeamSection />;
      case "Integrations":
        return <IntegrationsSection />;
      case "Billing":
        return <BillingSection />;
      case "Preferences":
        return <PreferencesSection />;
      default:
        return <TeamSection />;
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto lg:space-y-6">
      {/* Header */}
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      </div>

      {/* Layout: Sidebar + Content */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
        {/* Sidebar Nav */}
        <aside className="lg:w-56">
          <Card className="py-0">
            <CardContent className="p-2">
              <nav className="flex flex-col space-y-0.5">
                {sidebarNavItems.map((item) => (
                  <Button
                    key={item.title}
                    variant="ghost"
                    className={cn(
                      "hover:bg-muted justify-start",
                      activeTab === item.title
                        ? "bg-muted hover:bg-muted"
                        : ""
                    )}
                    onClick={() => setActiveTab(item.title)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>
    </div>
  );
}
