"use client";

import * as React from "react";
import { EVVSettings, EVVSettingsData } from "@/components/evv/evv-settings";

export default function EVVSettingsPage() {
  const handleSave = (settings: EVVSettingsData) => {
    console.log("Save settings:", settings);
    // TODO: Implement API call to save settings
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold">EVV Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure Electronic Visit Verification parameters
          </p>
        </div>

        <EVVSettings onSave={handleSave} />
      </div>
    </>
  );
}
