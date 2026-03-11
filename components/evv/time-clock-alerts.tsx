"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Phone, MessageSquare, UserPlus, AlertTriangle, FileText } from "lucide-react";
import { TimeClockEntry } from "./time-clock-table";

interface Alert {
  id: string;
  type: "late" | "no-show" | "outside-geofence" | "missing-signature" | "missing-notes";
  entry: TimeClockEntry;
  timestamp: string;
  severity: "warning" | "error" | "critical";
}

interface TimeClockAlertsProps {
  alerts: Alert[];
  onCallCaregiver: (entry: TimeClockEntry) => void;
  onSendMessage: (entry: TimeClockEntry) => void;
  onAssignBackup: (entry: TimeClockEntry) => void;
  onNotifyFamily: (entry: TimeClockEntry) => void;
  onCreateIncident: (entry: TimeClockEntry) => void;
}

export function TimeClockAlerts({
  alerts,
  onCallCaregiver,
  onSendMessage,
  onAssignBackup,
  onNotifyFamily,
  onCreateIncident,
}: TimeClockAlertsProps) {
  const getAlertIcon = (severity: "warning" | "error" | "critical") => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "warning":
        return <Bell className="h-4 w-4 text-yellow-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertTitle = (type: string) => {
    switch (type) {
      case "late":
        return "Late Clock-In";
      case "no-show":
        return "No-Show Alert";
      case "outside-geofence":
        return "Outside Geofence";
      case "missing-signature":
        return "Missing Client Signature";
      case "missing-notes":
        return "Missing Care Notes";
      default:
        return "Alert";
    }
  };

  const getAlertBadge = (severity: "warning" | "error" | "critical") => {
    switch (severity) {
      case "critical":
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 text-[10px]">Critical</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">Error</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 text-[10px]">Warning</Badge>;
      default:
        return null;
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alerts
          <Badge variant="secondary" className="ml-auto">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3 flex-1">
              {getAlertIcon(alert.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-medium">{getAlertTitle(alert.type)}</p>
                  {getAlertBadge(alert.severity)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {alert.entry.caregiver.name} → {alert.entry.client.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onCallCaregiver(alert.entry)}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call caregiver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSendMessage(alert.entry)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send message template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAssignBackup(alert.entry)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign backup caregiver
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNotifyFamily(alert.entry)}>
                  Notify family
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateIncident(alert.entry)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Create incident report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
