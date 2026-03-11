"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, Users, Calendar, DollarSign } from "lucide-react";

interface Prediction {
  id: string;
  type: "client_needs" | "scheduling" | "revenue" | "compliance";
  title: string;
  description: string;
  confidence: number;
  impact: "high" | "medium" | "low";
  trend: "up" | "down";
  value: string;
}

const predictions: Prediction[] = [
  {
    id: "1",
    type: "client_needs",
    title: "Client Readmission Risk",
    description: "3 clients show elevated risk of readmission within 30 days",
    confidence: 87,
    impact: "high",
    trend: "up",
    value: "3 clients",
  },
  {
    id: "2",
    type: "scheduling",
    title: "Staffing Shortage Forecast",
    description: "Predicted staffing shortage next week due to increased visit volume",
    confidence: 92,
    impact: "high",
    trend: "up",
    value: "8 shifts",
  },
  {
    id: "3",
    type: "revenue",
    title: "Revenue Projection",
    description: "Projected revenue increase of 12% next month based on current trends",
    confidence: 85,
    impact: "medium",
    trend: "up",
    value: "+12%",
  },
  {
    id: "4",
    type: "compliance",
    title: "EVV Compliance Risk",
    description: "Low risk - all visits are currently compliant with EVV requirements",
    confidence: 98,
    impact: "low",
    trend: "down",
    value: "98.5%",
  },
];

const typeIcons = {
  client_needs: Users,
  scheduling: Calendar,
  revenue: DollarSign,
  compliance: AlertCircle,
};

export function PredictiveAnalytics() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Predictive Analytics</h2>
        <p className="text-sm text-muted-foreground">
          AI-powered insights and predictions to help you make data-driven decisions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {predictions.map((prediction) => {
          const Icon = typeIcons[prediction.type];
          return (
            <Card key={prediction.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{prediction.title}</CardTitle>
                  </div>
                  <Badge
                    variant={
                      prediction.impact === "high"
                        ? "destructive"
                        : prediction.impact === "medium"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {prediction.impact}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {prediction.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Predicted Value</span>
                    <span className="font-semibold flex items-center gap-1">
                      {prediction.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-blue-600" />
                      )}
                      {prediction.value}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-semibold">{prediction.confidence}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${prediction.confidence}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>
            Detailed predictive analytics and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">
              Analytics charts and visualizations will be displayed here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
