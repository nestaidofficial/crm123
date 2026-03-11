"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Calendar, 
  UserPlus, 
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  FileCheck,
  Shield,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDashboardStore, type Activity } from "@/store/useDashboardStore";
import { useSupabaseRealtime } from "@/lib/hooks/useSupabaseRealtime";

const typeIcons = {
  care_note: FileText,
  schedule: Calendar,
  client: UserPlus,
  employee: UserPlus,
  visit: CheckCircle2,
  alert: AlertCircle,
  task: Clock,
  document: FileCheck,
  billing: DollarSign,
  compliance: Shield,
};

const statusColors = {
  completed: "border-neutral-200 bg-neutral-100 text-black",
  pending: "border-neutral-200 bg-neutral-100 text-neutral-700",
  urgent: "border-neutral-200 bg-neutral-200 text-black",
  info: "border-neutral-200 bg-neutral-100 text-neutral-700",
};

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function ActivityFeed() {
  const { activities, isLoadingActivities, fetchActivities, addActivity, updateActivity, removeActivity } = useDashboardStore();

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Real-time subscription to activity_log table
  useSupabaseRealtime(
    "activity_log",
    "*",
    (payload) => {
      if (payload.eventType === "INSERT") {
        addActivity(payload.new as Activity);
      } else if (payload.eventType === "UPDATE") {
        updateActivity((payload.new as Activity).id, payload.new as Activity);
      } else if (payload.eventType === "DELETE") {
        removeActivity((payload.old as Activity).id);
      }
    }
  );

  if (isLoadingActivities) {
    return (
      <Card className="border-0 rounded-lg bg-neutral-0 shadow-card">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-[15px] font-semibold text-neutral-900">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-6 w-6 bg-neutral-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-full" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="border-0 rounded-lg bg-neutral-0 shadow-card">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-[15px] font-semibold text-neutral-900">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="flex items-center justify-center h-32">
            <p className="text-[12px] text-neutral-500">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 rounded-lg bg-neutral-0 shadow-card">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-[15px] font-semibold text-neutral-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = typeIcons[activity.type] || Clock;
            const userInitials = getInitials(activity.actor_name);
            return (
              <div key={activity.id} className="flex gap-3">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-[10px] bg-neutral-200 text-neutral-900">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    <p className="text-[13px] font-medium text-neutral-900">{activity.title}</p>
                    {activity.status && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-medium h-6 px-2 rounded-full border",
                          statusColors[activity.status]
                        )}
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[12px] text-neutral-500">{activity.description}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-neutral-500">{activity.actor_name}</p>
                    <p className="text-[10px] text-neutral-500 shrink-0">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
