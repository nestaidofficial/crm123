"use client";

import * as React from "react";
import { FormsHeader } from "@/components/forms/forms-header";
import { FormsEmptyState } from "@/components/forms/forms-empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Send, CheckSquare } from "lucide-react";

export default function FormsPage() {
  return (
    <Tabs defaultValue="templates" className="space-y-6">
      <FormsHeader 
        tabsSlot={
          <TabsList className="gap-2 rounded-none bg-transparent h-auto p-0">
            <TabsTrigger
              className="data-[state=active]:bg-[#F4F4F6] data-[state=active]:text-neutral-900 border-border relative h-auto flex-col px-4 py-2 text-xs data-[state=active]:shadow-none"
              value="templates"
            >
              <FileText
                aria-hidden="true"
                className="mb-1.5 opacity-60"
                size={16}
              />
              Templates
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-[#F4F4F6] data-[state=active]:text-neutral-900 border-border relative h-auto flex-col px-4 py-2 text-xs data-[state=active]:shadow-none"
              value="sent"
            >
              <Send
                aria-hidden="true"
                className="mb-1.5 opacity-60"
                size={16}
              />
              Sent Forms
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-[#F4F4F6] data-[state=active]:text-neutral-900 border-border relative h-auto flex-col px-4 py-2 text-xs data-[state=active]:shadow-none"
              value="submissions"
            >
              <CheckSquare
                aria-hidden="true"
                className="mb-1.5 opacity-60"
                size={16}
              />
              Submissions
            </TabsTrigger>
          </TabsList>
        }
      />
      
      <TabsContent value="templates">
        <FormsEmptyState />
      </TabsContent>
      <TabsContent value="sent">
        <div className="text-center py-16">
          <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold mb-2">No sent forms</h3>
          <p className="text-sm text-muted-foreground">
            Forms sent to employees or clients will appear here
          </p>
        </div>
      </TabsContent>
      <TabsContent value="submissions">
        <div className="text-center py-16">
          <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold mb-2">No submissions yet</h3>
          <p className="text-sm text-muted-foreground">
            Completed form submissions will appear here
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
