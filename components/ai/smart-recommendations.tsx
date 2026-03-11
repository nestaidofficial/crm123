"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  DollarSign
} from "lucide-react";

interface Recommendation {
  id: string;
  type: "scheduling" | "client" | "revenue" | "efficiency";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  status: "pending" | "accepted" | "dismissed";
}

const recommendations: Recommendation[] = [
  {
    id: "1",
    type: "scheduling",
    title: "Optimize Caregiver Routes",
    description: "Reorganize 8 visits to reduce travel time by 2.5 hours total",
    priority: "high",
    estimatedImpact: "Save 2.5 hours daily",
    status: "pending",
  },
  {
    id: "2",
    type: "client",
    title: "Schedule Follow-up Assessment",
    description: "Client Sarah Johnson is due for a 30-day assessment within 2 days",
    priority: "high",
    estimatedImpact: "Improve compliance",
    status: "pending",
  },
  {
    id: "3",
    type: "revenue",
    title: "Review Outstanding Invoices",
    description: "15 invoices over 60 days old totaling $8,450 - recommend follow-up",
    priority: "medium",
    estimatedImpact: "Recover $8,450",
    status: "pending",
  },
  {
    id: "4",
    type: "efficiency",
    title: "Automate Care Note Reminders",
    description: "Set up automated reminders for caregivers who frequently miss documentation",
    priority: "medium",
    estimatedImpact: "Reduce missing notes by 40%",
    status: "pending",
  },
];

const typeIcons = {
  scheduling: Zap,
  client: TrendingUp,
  revenue: DollarSign,
  efficiency: Lightbulb,
};

export function SmartRecommendations() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Smart Recommendations</h2>
        <p className="text-sm text-muted-foreground">
          AI-powered suggestions to improve your agency&apos;s efficiency and outcomes
        </p>
      </div>

      <div className="grid gap-4">
        {recommendations.map((rec) => {
          const Icon = typeIcons[rec.type];
          return (
            <Card key={rec.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">{rec.title}</CardTitle>
                        <Badge
                          variant={
                            rec.priority === "high"
                              ? "destructive"
                              : rec.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {rec.priority} priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Estimated Impact:
                        </span>
                        <span className="font-semibold">{rec.estimatedImpact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button size="sm">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button variant="outline" size="sm">
                    <Clock className="mr-2 h-4 w-4" />
                    Review Later
                  </Button>
                  <Button variant="ghost" size="sm">
                    <XCircle className="mr-2 h-4 w-4" />
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
