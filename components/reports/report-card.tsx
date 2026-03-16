"use client";

import { LucideIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  onViewReport?: () => void;
  status?: "active" | "coming-soon";
}

export function ReportCard({
  title,
  description,
  icon: Icon,
  iconBgColor = "bg-blue-100",
  iconColor = "text-blue-600",
  onViewReport,
  status = "active",
}: ReportCardProps) {
  return (
    <Card className="w-full max-w-xs gap-2 pt-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 border-neutral-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
              iconBgColor
            )}
          >
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
          <CardTitle className="text-[14px] font-semibold text-neutral-900 leading-tight">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="mb-2 pt-0">
        <p className="text-[12px] text-neutral-500 leading-relaxed">
          {description}
        </p>
      </CardContent>
      
      <CardFooter className="py-2 pt-0">
        {status === "active" ? (
          <Button 
            variant="link" 
            className="px-0 text-[12px] font-medium text-blue-600 hover:text-blue-700 h-auto p-0"
            onClick={onViewReport}
          >
            View Report
            <ExternalLinkIcon className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-[11px] font-medium text-neutral-500">
            Coming Soon
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
