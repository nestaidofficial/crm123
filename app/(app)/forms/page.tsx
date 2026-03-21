"use client";

import * as React from "react";
import { FormsHeader } from "@/components/forms/forms-header";
import { FormsList } from "@/components/forms/forms-list";
import { SentFormsList } from "@/components/forms/sent-forms-list";
import { SubmissionsList } from "@/components/forms/submissions-list";
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
        <FormsList />
      </TabsContent>
      <TabsContent value="sent">
        <SentFormsList />
      </TabsContent>
      <TabsContent value="submissions">
        <SubmissionsList />
      </TabsContent>
    </Tabs>
  );
}
