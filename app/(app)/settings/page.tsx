"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import UserManagement from "@/components/settings/user-management";
import Integrations from "@/components/settings/integrations";
import BillingSettings from "@/components/settings/billing-settings";
import SystemPreferences from "@/components/settings/system-preferences";

const tabs = [
  { name: "User Management", value: "user-management" },
  { name: "Integrations", value: "integrations" },
  { name: "Billing Settings", value: "billing-settings" },
  { name: "System Preferences", value: "system-preferences" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("user-management");

  return (
    <div className="w-full py-8">
      <div className="mx-auto min-h-screen max-w-7xl px-4 sm:px-6 lg:px-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gap-4"
        >
          <TabsList className="h-fit! w-full rounded-none border-b bg-transparent p-0 sm:justify-start">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:border-primary dark:data-[state=active]:border-primary rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none! sm:flex-0 dark:data-[state=active]:bg-transparent"
              >
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4">
            <TabsContent value="user-management" className="mt-0">
              <section className="py-3">
                <div className="mx-auto max-w-7xl">
                  <UserManagement />
                </div>
              </section>
            </TabsContent>

            <TabsContent value="integrations" className="mt-0">
              <section className="py-3">
                <div className="mx-auto max-w-7xl">
                  <Integrations />
                </div>
              </section>
            </TabsContent>

            <TabsContent value="billing-settings" className="mt-0">
              <section className="py-3">
                <div className="mx-auto max-w-7xl">
                  <BillingSettings />
                </div>
              </section>
            </TabsContent>

            <TabsContent value="system-preferences" className="mt-0">
              <section className="py-3">
                <div className="mx-auto max-w-7xl">
                  <SystemPreferences />
                  <div className="mt-10 flex justify-end">
                    <Button type="submit" className="max-sm:w-full">
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </section>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
