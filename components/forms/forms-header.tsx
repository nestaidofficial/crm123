"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Copy, Upload, MoreVertical } from "lucide-react";

interface FormsHeaderProps {
  onCreateForm: () => void;
  onDuplicateForm: () => void;
  onImportForm: () => void;
}

export function FormsHeader({
  onCreateForm,
  onDuplicateForm,
  onImportForm,
}: FormsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-[16px] font-semibold text-neutral-900">Forms</h1>
        <p className="text-[12px] text-neutral-500 font-normal mt-0.5">
          Create, customize, and reuse forms across your agency
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onCreateForm} className="h-8 rounded-full bg-black hover:bg-neutral-800 text-white text-[12px]">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          <span className="font-medium">Create Form</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-neutral-200">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDuplicateForm}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Form
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImportForm}>
              <Upload className="mr-2 h-4 w-4" />
              Import (PDF / DOCX)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
