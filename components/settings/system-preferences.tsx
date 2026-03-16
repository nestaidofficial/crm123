"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SystemPreferences = () => {
  return (
    <div className="space-y-8">
      {/* Notifications */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Notifications</h3>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configure how you receive notifications and alerts.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base">
                Email Notifications
              </Label>
              <p className="text-muted-foreground text-sm">
                Receive notifications via email
              </p>
            </div>
            <Switch id="email-notifications" defaultChecked />
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications" className="text-base">
                SMS Notifications
              </Label>
              <p className="text-muted-foreground text-sm">
                Receive notifications via text message
              </p>
            </div>
            <Switch id="sms-notifications" />
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="text-base">
                Push Notifications
              </Label>
              <p className="text-muted-foreground text-sm">
                Receive browser push notifications
              </p>
            </div>
            <Switch id="push-notifications" defaultChecked />
          </div>
        </div>
      </div>

      <Separator />

      {/* Display Settings */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Display Settings</h3>
          <p className="text-muted-foreground text-sm mt-0.5">
            Customize how information is displayed in the system.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Select defaultValue="mm-dd-yyyy">
              <SelectTrigger id="date-format" className="w-full">
                <SelectValue placeholder="Select date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-format">Time Format</Label>
            <Select defaultValue="12h">
              <SelectTrigger id="time-format" className="w-full">
                <SelectValue placeholder="Select time format" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="compact-view" className="text-base">
                Compact View
              </Label>
              <p className="text-muted-foreground text-sm">
                Display more information in less space
              </p>
            </div>
            <Switch id="compact-view" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPreferences;
