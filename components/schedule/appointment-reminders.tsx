"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageSquare, CheckCircle2 } from "lucide-react";

export function AppointmentReminders() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Automated Appointment Reminders</h2>
        <p className="text-sm text-muted-foreground">
          Cut your no-show rate in half with automated, customized reminders. Clients can quickly confirm or cancel via text.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reminder Settings</CardTitle>
          <CardDescription>
            Configure automated reminders for appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Reminders */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Automated Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send unlimited automated reminders for free
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="border-t pt-6 space-y-6">
            {/* Reminder Channels */}
            <div className="space-y-4">
              <Label className="text-base">Reminder Channels</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Text Messages (SMS)</Label>
                      <p className="text-sm text-muted-foreground">
                        Clients can confirm or cancel via text
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Send email reminders to clients
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="space-y-4">
              <Label className="text-base">Reminder Timing</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First Reminder</Label>
                  <Select defaultValue="48">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 hours before</SelectItem>
                      <SelectItem value="48">48 hours before</SelectItem>
                      <SelectItem value="72">72 hours before</SelectItem>
                      <SelectItem value="168">1 week before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Second Reminder (Optional)</Label>
                  <Select defaultValue="24">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Disabled</SelectItem>
                      <SelectItem value="24">24 hours before</SelectItem>
                      <SelectItem value="12">12 hours before</SelectItem>
                      <SelectItem value="6">6 hours before</SelectItem>
                      <SelectItem value="1">1 hour before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Customization */}
            <div className="space-y-4">
              <Label className="text-base">Message Customization</Label>
              <div className="space-y-2">
                <Label>Text Message Template</Label>
                <Input 
                  placeholder="Hi {client_name}, this is a reminder of your appointment on {appointment_date} at {appointment_time}. Reply CONFIRM to confirm or CANCEL to cancel."
                  defaultValue="Hi {client_name}, this is a reminder of your appointment on {appointment_date} at {appointment_time}. Reply CONFIRM to confirm or CANCEL to cancel."
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{client_name}"}, {"{appointment_date}"}, {"{appointment_time}"}, {"{clinician_name}"}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-base font-semibold text-green-600">-52%</div>
                <div className="text-xs text-muted-foreground mt-0.5">Reduction in no-shows</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-base font-semibold">1,247</div>
                <div className="text-xs text-muted-foreground mt-0.5">Reminders sent this month</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-base font-semibold">94%</div>
                <div className="text-xs text-muted-foreground mt-0.5">Confirmation rate</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HIPAA Compliance Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">HIPAA Compliant</h4>
              <p className="text-sm text-blue-700 mt-1">
                All reminder communications are HIPAA-compliant and secure. Client information is protected and encrypted.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
