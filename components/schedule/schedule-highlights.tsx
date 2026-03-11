"use client";

import { Card, CardContent } from "@/components/ui/card";
import { 
  Repeat, 
  FileText, 
  Users, 
  BarChart3,
  ClipboardList,
  Calendar as CalendarIcon
} from "lucide-react";

export function ScheduleHighlights() {
  const highlights = [
    {
      icon: Repeat,
      title: "Recurring Shifts",
      description: "Create recurring shifts in seconds with drag-and-drop calendar",
    },
    {
      icon: ClipboardList,
      title: "Shift Instructions & Tasks",
      description: "Attach shift-specific instructions, tasks, and required forms",
    },
    {
      icon: Users,
      title: "Open Shifts / Self-Assignment",
      description: "Optional open shifts allow caregivers to self-assign",
    },
    {
      icon: BarChart3,
      title: "Care-Oriented Shift Types",
      description: "Clean reporting with care-specific shift types",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {highlights.map((highlight, index) => {
        const Icon = highlight.icon;
        return (
          <Card key={index} className="border-dashed">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-semibold mb-1">{highlight.title}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {highlight.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
