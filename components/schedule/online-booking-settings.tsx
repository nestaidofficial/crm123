"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function OnlineBookingSettings() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Online Appointment Booking</h2>
        <p className="text-sm text-muted-foreground">
          Set your availability and offer online appointment requests. Manage how clients can book appointments with you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Availability</CardTitle>
          <CardDescription>
            Configure when clients can book appointments online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Online Booking */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Online Booking</Label>
              <p className="text-sm text-muted-foreground">
                Allow clients to request appointments through the client portal
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="border-t pt-6 space-y-6">
            {/* Booking Window */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Advance Booking Window</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days in advance</SelectItem>
                    <SelectItem value="14">14 days in advance</SelectItem>
                    <SelectItem value="30">30 days in advance</SelectItem>
                    <SelectItem value="60">60 days in advance</SelectItem>
                    <SelectItem value="90">90 days in advance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Notice Required</Label>
                <Select defaultValue="24">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Booking Types */}
            <div className="space-y-4">
              <Label className="text-base">Available Appointment Types</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Home Care Visit</Label>
                    <p className="text-sm text-muted-foreground">Standard home care services</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Assessment</Label>
                    <p className="text-sm text-muted-foreground">Initial client assessment</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Follow-up Visit</Label>
                    <p className="text-sm text-muted-foreground">Follow-up care visit</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>

            {/* Time Slots */}
            <div className="space-y-4">
              <Label className="text-base">Available Time Slots</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" defaultValue="08:00" />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" defaultValue="17:00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Slot Duration</Label>
                <Select defaultValue="60">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
