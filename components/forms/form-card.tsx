"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Lock, FileText, Eye, Edit, Copy, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Form {
  id: string;
  name: string;
  category: "Onboarding" | "Care" | "Compliance" | "HR";
  status: "system" | "agency";
  usedIn: ("Onboarding" | "Shifts" | "Incidents" | "Billing" | "HR")[];
  description?: string;
}

interface FormCardProps {
  form: Form;
  onOpen: (form: Form) => void;
  onEdit: (form: Form) => void;
  onDuplicate: (form: Form) => void;
  onArchive: (form: Form) => void;
}

export function FormCard({
  form,
  onOpen,
  onEdit,
  onDuplicate,
  onArchive,
}: FormCardProps) {
  const getCategoryColor = (category: Form["category"]) => {
    const colors = {
      Onboarding: "bg-blue-100 text-blue-800 border-blue-200",
      Care: "bg-green-100 text-green-800 border-green-200",
      Compliance: "bg-orange-100 text-orange-800 border-orange-200",
      HR: "bg-purple-100 text-purple-800 border-purple-200",
    };
    return colors[category];
  };

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all",
        "group"
      )}
      onClick={() => onOpen(form)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold truncate">{form.name}</h3>
              {form.status === "system" && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0.5", getCategoryColor(form.category))}
            >
              {form.category}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(form); }}>
                <Eye className="mr-2 h-4 w-4" />
                Open
              </DropdownMenuItem>
              {form.status === "agency" && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(form); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(form); }}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              {form.status === "agency" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onArchive(form); }}
                    className="text-destructive"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {form.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {form.description}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Used in:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {form.usedIn.map((usage, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {usage}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t">
          <Badge
            variant={form.status === "system" ? "outline" : "default"}
            className="text-[10px] px-1.5 py-0.5"
          >
            {form.status === "system" ? "System" : "Agency Custom"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
