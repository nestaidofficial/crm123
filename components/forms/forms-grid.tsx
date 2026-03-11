"use client";

import * as React from "react";
import { FormCard } from "./form-card";
import type { Form } from "./form-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormsGridProps {
  forms: Form[];
  onOpen: (form: Form) => void;
  onEdit: (form: Form) => void;
  onDuplicate: (form: Form) => void;
  onArchive: (form: Form) => void;
}

export function FormsGrid({
  forms,
  onOpen,
  onEdit,
  onDuplicate,
  onArchive,
}: FormsGridProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filteredForms = React.useMemo(() => {
    return forms.filter((form) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !form.name.toLowerCase().includes(query) &&
          !form.description?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "all" && form.category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && form.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [forms, searchQuery, categoryFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-[50px]"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Onboarding">Onboarding</SelectItem>
            <SelectItem value="Care">Care</SelectItem>
            <SelectItem value="Compliance">Compliance</SelectItem>
            <SelectItem value="HR">HR</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="agency">Agency Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Forms Grid */}
      {filteredForms.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onOpen={onOpen}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No forms found</p>
        </div>
      )}
    </div>
  );
}
