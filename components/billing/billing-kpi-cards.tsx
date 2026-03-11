"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertCircle, DollarSign, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICard {
  title: string;
  amount: string;
  count: string;
  icon: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "warning" | "success" | "danger";
}

interface BillingKPICardsProps {
  readyToInvoice: { amount: string; count: number };
  outstanding: { amount: string; count: number };
  overdue: { amount: string; count: number };
  paidThisMonth: { amount: string; count: number };
  onReadyToInvoiceClick?: () => void;
  onOutstandingClick?: () => void;
  onOverdueClick?: () => void;
  onPaidThisMonthClick?: () => void;
}

export function BillingKPICards({
  readyToInvoice,
  outstanding,
  overdue,
  paidThisMonth,
  onReadyToInvoiceClick,
  onOutstandingClick,
  onOverdueClick,
  onPaidThisMonthClick,
}: BillingKPICardsProps) {
  const cards: KPICard[] = [
    {
      title: "Ready to Invoice",
      amount: readyToInvoice.amount,
      count: `${readyToInvoice.count} shifts`,
      icon: <FileText className="h-4 w-4" />,
      onClick: onReadyToInvoiceClick,
      variant: "default",
    },
    {
      title: "Outstanding",
      amount: outstanding.amount,
      count: `${outstanding.count} invoices`,
      icon: <DollarSign className="h-4 w-4" />,
      onClick: onOutstandingClick,
      variant: "warning",
    },
    {
      title: "Overdue",
      amount: overdue.amount,
      count: `${overdue.count} invoices`,
      icon: <AlertCircle className="h-4 w-4" />,
      onClick: onOverdueClick,
      variant: "danger",
    },
    {
      title: "Paid This Month",
      amount: paidThisMonth.amount,
      count: `${paidThisMonth.count} invoices`,
      icon: <CheckCircle2 className="h-4 w-4" />,
      onClick: onPaidThisMonthClick,
      variant: "success",
    },
  ];

  const getIconDotStyles = (variant?: string) => {
    switch (variant) {
      case "warning":
        return "bg-neutral-100 text-neutral-700";
      case "danger":
        return "bg-neutral-200 text-neutral-900";
      case "success":
        return "bg-neutral-100 text-neutral-900";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={cn(
            "border-black/5 transition-shadow",
            card.onClick && "cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
          )}
          onClick={card.onClick}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-3 px-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">{card.title}</CardTitle>
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full [&>svg]:h-3.5 [&>svg]:w-3.5",
                getIconDotStyles(card.variant)
              )}
            >
              {card.icon}
            </div>
          </CardHeader>
          <CardContent className="pb-3 pt-0 px-4">
            <div className="text-[18px] font-semibold text-neutral-900">{card.amount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{card.count}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
