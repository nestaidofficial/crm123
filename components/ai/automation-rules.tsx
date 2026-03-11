"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, Trash2, Edit } from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  enabled: boolean;
  executions: number;
}

const automationRules: AutomationRule[] = [
  {
    id: "1",
    name: "Auto-Assign Caregivers",
    description: "Automatically assign available caregivers to new visits based on location and skills",
    trigger: "New visit scheduled",
    action: "Assign best-matched caregiver",
    enabled: true,
    executions: 456,
  },
  {
    id: "2",
    name: "Documentation Reminder",
    description: "Send reminders for missing care notes 24 hours after visit completion",
    trigger: "Visit completed, no notes after 24h",
    action: "Send reminder notification",
    enabled: true,
    executions: 234,
  },
  {
    id: "3",
    name: "Credential Expiration Alert",
    description: "Alert HR when caregiver credentials expire within 30 days",
    trigger: "Credential expiring in 30 days",
    action: "Send alert to HR team",
    enabled: true,
    executions: 12,
  },
  {
    id: "4",
    name: "Schedule Conflict Auto-Resolution",
    description: "Automatically suggest alternative caregivers when conflicts are detected",
    trigger: "Schedule conflict detected",
    action: "Suggest alternatives and notify coordinator",
    enabled: false,
    executions: 0,
  },
  {
    id: "5",
    name: "Invoice Auto-Generation",
    description: "Generate invoices automatically when visit is marked complete with EVV",
    trigger: "Visit completed with EVV",
    action: "Generate invoice",
    enabled: true,
    executions: 1892,
  },
];

export function AutomationRules() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Automation Rules</h2>
          <p className="text-sm text-muted-foreground">
            Configure AI-powered automation rules and triggers
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Rule
        </Button>
      </div>

      <div className="grid gap-4">
        {automationRules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    {rule.enabled && (
                      <Badge variant="default" className="bg-green-600">
                        Active
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mb-3">
                    {rule.description}
                  </CardDescription>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Trigger:</span>
                      <p className="font-medium mt-1">{rule.trigger}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Action:</span>
                      <p className="font-medium mt-1">{rule.action}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Enabled</span>
                    <Switch checked={rule.enabled} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {rule.executions.toLocaleString()} executions
                </span>
                <Button variant="outline" size="sm">
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
