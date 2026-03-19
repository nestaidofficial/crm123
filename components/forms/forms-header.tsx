"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FormsHeaderProps {
  tabsSlot?: React.ReactNode;
}

export function FormsHeader({ tabsSlot }: FormsHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      {tabsSlot}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => router.push("/forms/builder")}
          className="h-8 rounded-full bg-black hover:bg-neutral-800 text-white text-[12px]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          <span className="font-medium">Create Form</span>
        </Button>
      </div>
    </div>
  );
}
