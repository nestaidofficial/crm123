"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar, Trash2, Edit, Bell } from "lucide-react";

interface OutOfOfficeBlock {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  notifyClients: boolean;
  status: "active" | "upcoming" | "past";
}

const sampleBlocks: OutOfOfficeBlock[] = [
  {
    id: "1",
    title: "Holiday - Christmas Break",
    startDate: "2024-12-24",
    endDate: "2024-12-26",
    startTime: "00:00",
    endTime: "23:59",
    notifyClients: true,
    status: "upcoming",
  },
  {
    id: "2",
    title: "Vacation",
    startDate: "2024-11-15",
    endDate: "2024-11-22",
    startTime: "00:00",
    endTime: "23:59",
    notifyClients: true,
    status: "past",
  },
];

export function OutOfOfficeBlocks() {
  const [blocks] = useState<OutOfOfficeBlock[]>(sampleBlocks);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Out-of-Office Blocks</h2>
        <p className="text-sm text-muted-foreground">
          Add out-of-office blocks to your calendar to pause online booking and automatically notify clients of any canceled appointments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manage Blocks</CardTitle>
              <CardDescription>
                Create blocks to mark when you&apos;re unavailable
              </CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Block
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {blocks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No out-of-office blocks scheduled</p>
              <p className="text-sm mt-2">Click &quot;Add Block&quot; to create one</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map((block) => (
                <div key={block.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{block.title}</h4>
                        <Badge
                          variant={
                            block.status === "active"
                              ? "default"
                              : block.status === "upcoming"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {block.status}
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <div>
                          <span className="font-medium">Start:</span>{" "}
                          {new Date(block.startDate).toLocaleDateString()} at {block.startTime}
                        </div>
                        <div>
                          <span className="font-medium">End:</span>{" "}
                          {new Date(block.endDate).toLocaleDateString()} at {block.endTime}
                        </div>
                      </div>
                      {block.notifyClients && (
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Clients will be automatically notified
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Block Settings</CardTitle>
          <CardDescription>
            Configure how out-of-office blocks work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-notify Clients</Label>
              <p className="text-sm text-muted-foreground">
                Automatically notify clients when appointments are canceled due to out-of-office blocks
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pause Online Booking</Label>
              <p className="text-sm text-muted-foreground">
                Automatically pause online booking during out-of-office blocks
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show on Calendar</Label>
              <p className="text-sm text-muted-foreground">
                Display out-of-office blocks on your calendar
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Form */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Add Block</CardTitle>
          <CardDescription>
            Create a new out-of-office block
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g., Vacation, Holiday, Training" />
            </div>
            <div className="space-y-2">
              <Label>Notify Clients</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch />
                <span className="text-sm text-muted-foreground">
                  Send automatic notifications
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" />
                <Input type="time" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" />
                <Input type="time" />
              </div>
            </div>
          </div>

          <Button className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Create Out-of-Office Block
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
