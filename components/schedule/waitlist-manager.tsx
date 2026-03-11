"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, UserPlus, CheckCircle2, XCircle, Mail, Phone } from "lucide-react";

interface WaitlistEntry {
  id: string;
  clientName: string;
  clientInitials: string;
  requestedDate: string;
  preferredTime: string;
  serviceType: string;
  status: "pending" | "contacted" | "scheduled" | "declined";
  notes: string;
  contactInfo: {
    email: string;
    phone: string;
  };
}

const waitlistEntries: WaitlistEntry[] = [
  {
    id: "1",
    clientName: "Emily Rodriguez",
    clientInitials: "ER",
    requestedDate: "2024-11-20",
    preferredTime: "Morning",
    serviceType: "Home Care",
    status: "pending",
    notes: "Prefers Monday/Wednesday mornings",
    contactInfo: {
      email: "emily.r@example.com",
      phone: "(555) 123-4567",
    },
  },
  {
    id: "2",
    clientName: "Michael Chen",
    clientInitials: "MC",
    requestedDate: "2024-11-18",
    preferredTime: "Afternoon",
    serviceType: "Assessment",
    status: "contacted",
    notes: "Waiting for insurance approval",
    contactInfo: {
      email: "mchen@example.com",
      phone: "(555) 234-5678",
    },
  },
  {
    id: "3",
    clientName: "Sarah Johnson",
    clientInitials: "SJ",
    requestedDate: "2024-11-15",
    preferredTime: "Flexible",
    serviceType: "Follow-up",
    status: "pending",
    notes: "Returning client",
    contactInfo: {
      email: "sjohnson@example.com",
      phone: "(555) 345-6789",
    },
  },
];

export function WaitlistManager() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Waitlist Management</h2>
        <p className="text-sm text-muted-foreground">
          Take charge of your caseload. Organize prospective clients on a waitlist and accept new requests when you have openings.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-base font-semibold">12</div>
                <div className="text-sm text-muted-foreground">On Waitlist</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">5</div>
                <div className="text-sm text-muted-foreground">Pending Contact</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-muted-foreground">Scheduled This Month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">3.2</div>
                <div className="text-sm text-muted-foreground">Avg Days Wait</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waitlist Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Waitlist Entries</CardTitle>
              <CardDescription>
                Manage clients waiting for appointments
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Search waitlist..." className="w-[200px] rounded-[50px]" />
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {waitlistEntries.map((entry) => (
              <div key={entry.id} className="p-4 border rounded-lg">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>{entry.clientInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{entry.clientName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Requested: {new Date(entry.requestedDate).toLocaleDateString()} • {entry.preferredTime}
                        </p>
                      </div>
                      <Badge
                        variant={
                          entry.status === "pending"
                            ? "secondary"
                            : entry.status === "contacted"
                            ? "default"
                            : entry.status === "scheduled"
                            ? "default"
                            : "outline"
                        }
                        className={
                          entry.status === "scheduled" ? "bg-green-600" : ""
                        }
                      >
                        {entry.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {entry.contactInfo.email}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {entry.contactInfo.phone}
                      </div>
                      <Badge variant="outline">{entry.serviceType}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">{entry.notes}</p>

                    <div className="flex items-center gap-2 pt-2">
                      <Button size="sm">
                        Schedule Appointment
                      </Button>
                      <Button variant="outline" size="sm">
                        Contact Client
                      </Button>
                      <Button variant="ghost" size="sm">
                        View Profile
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <XCircle className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Waitlist Settings</CardTitle>
          <CardDescription>
            Configure waitlist management options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Auto-Notify When Slot Available</Label>
              <Select defaultValue="enabled">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Waitlist Capacity</Label>
              <Input type="number" placeholder="50" defaultValue="50" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
