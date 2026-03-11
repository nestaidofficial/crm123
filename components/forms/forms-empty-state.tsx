"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

interface FormsEmptyStateProps {
  onCreateForm: () => void;
}

export function FormsEmptyState({ onCreateForm }: FormsEmptyStateProps) {
  return (
    <div className="text-center py-16">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-base font-semibold mb-2">No forms yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        Start with premade forms or create your own. Forms can be reused across onboarding, visits, incidents, and billing.
      </p>
      <Button onClick={onCreateForm}>
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Form
      </Button>
    </div>
  );
}
