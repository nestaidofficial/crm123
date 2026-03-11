"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, Link as LinkIcon, CheckCircle2, AlertCircle } from "lucide-react";

export function CalendarSync() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Calendar Sync</h2>
        <p className="text-sm text-muted-foreground">
          Streamline business and personal meetings by syncing your external calendars with our scheduling platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Google Calendar</CardTitle>
                  <CardDescription>Sync with Google Calendar</CardDescription>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600">
                Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Sync</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>Sync Direction</Label>
              <select className="w-full p-2 border rounded-md">
                <option>Two-way sync</option>
                <option>Import from Google Calendar</option>
                <option>Export to Google Calendar</option>
              </select>
            </div>
            <Button variant="outline" className="w-full">
              Manage Connection
            </Button>
          </CardContent>
        </Card>

        {/* Outlook Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Outlook Calendar</CardTitle>
                  <CardDescription>Sync with Microsoft Outlook</CardDescription>
                </div>
              </div>
              <Badge variant="secondary">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Sync</Label>
              <Switch />
            </div>
            <Button className="w-full">
              Connect Outlook
            </Button>
          </CardContent>
        </Card>

        {/* iCal */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-base">iCal / Apple Calendar</CardTitle>
                  <CardDescription>Sync with Apple Calendar</CardDescription>
                </div>
              </div>
              <Badge variant="secondary">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Sync</Label>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label>Calendar URL</Label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="webcal://calendar.example.com/ical.ics"
                  className="flex-1 p-2 border rounded-md text-sm"
                />
                <Button variant="outline" size="icon">
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Connect iCal
            </Button>
          </CardContent>
        </Card>

        {/* Other Calendars */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Other Calendars</CardTitle>
                <CardDescription>Sync with other calendar systems</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect other calendar systems using standard iCal format or custom integrations.
            </p>
            <Button variant="outline" className="w-full">
              Add Calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>
            Configure how calendar sync works
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync calendars every 15 minutes
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Conflict Resolution</Label>
              <p className="text-sm text-muted-foreground">
                When conflicts occur, prioritize Nessa CRM appointments
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sync Personal Appointments</Label>
              <p className="text-sm text-muted-foreground">
                Import personal appointments from external calendars
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Last Sync Info */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900">Last Sync: 5 minutes ago</h4>
              <p className="text-sm text-green-700 mt-1">
                Google Calendar synced successfully. 15 appointments imported, 23 appointments exported.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
