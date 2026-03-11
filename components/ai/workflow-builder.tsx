"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, Trash2, Settings, Copy } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft";
  lastRun: string;
  runs: number;
  successRate: number;
}

const workflows: Workflow[] = [
  {
    id: "1",
    name: "Automated Care Note Reminder",
    description: "Sends reminders for missing care notes 24 hours after visit",
    status: "active",
    lastRun: "2 hours ago",
    runs: 1247,
    successRate: 98.5,
  },
  {
    id: "2",
    name: "Schedule Conflict Resolution",
    description: "Automatically resolves scheduling conflicts and suggests alternatives",
    status: "active",
    lastRun: "15 minutes ago",
    runs: 892,
    successRate: 94.2,
  },
  {
    id: "3",
    name: "Credential Expiration Alert",
    description: "Alerts HR when caregiver credentials are expiring within 30 days",
    status: "active",
    lastRun: "1 hour ago",
    runs: 156,
    successRate: 100,
  },
  {
    id: "4",
name: "Client Assessment Automation",
      description: "Generates initial assessment forms from client intake data",
    status: "paused",
    lastRun: "3 days ago",
    runs: 45,
    successRate: 91.1,
  },
  {
    id: "5",
    name: "Invoice Generation Workflow",
    description: "Auto-generates invoices based on completed visits and EVV data",
    status: "active",
    lastRun: "5 minutes ago",
    runs: 2341,
    successRate: 97.8,
  },
];

export function WorkflowBuilder() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">AI Workflow Builder</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage automated workflows powered by AI
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base">{workflow.name}</CardTitle>
                    <Badge
                      variant={
                        workflow.status === "active"
                          ? "default"
                          : workflow.status === "paused"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {workflow.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {workflow.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {workflow.status === "active" ? (
                    <Button variant="ghost" size="icon">
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon">
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Runs</p>
                  <p className="font-semibold">{workflow.runs.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="font-semibold">{workflow.successRate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Run</p>
                  <p className="font-semibold">{workflow.lastRun}</p>
                </div>
                <div>
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
