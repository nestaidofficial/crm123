"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubscriptionInfoProps {
  subscription: {
    plan: "trial" | "basic" | "pro";
    status: "active" | "past_due" | "cancelled";
    renewalDate?: string;
  };
}

const planColors = {
  trial: "bg-neutral-100 text-neutral-700",
  basic: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
};

const statusColors = {
  active: "bg-green-100 text-green-700",
  past_due: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

const SubscriptionInfo = ({ subscription }: SubscriptionInfoProps) => {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Subscription</h3>
        <p className="text-muted-foreground text-sm">
          Your current plan and billing information.
        </p>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Current Plan</p>
            <Badge
              className={cn(
                "text-[12px] font-semibold capitalize",
                planColors[subscription.plan]
              )}
            >
              {subscription.plan}
            </Badge>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Status</p>
            <Badge
              className={cn(
                "text-[12px] font-semibold capitalize",
                statusColors[subscription.status]
              )}
            >
              {subscription.status.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {subscription.renewalDate && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Next Payment Date</p>
            <p className="text-[14px] font-medium text-foreground">
              {new Date(subscription.renewalDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        )}

        <Button variant="outline" className="max-sm:w-full">
          Manage Subscription
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionInfo;
