"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Phone, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  icon: React.ReactNode;
  count: number | string;
  label: string;
}

interface IdentityChip {
  icon?: React.ReactNode;
  label: string;
}

interface ProfileSidebarProps {
  name: string;
  role: string;
  status: "active" | "inactive" | "onboarding";
  avatarUrl?: string;
  avatarFallback: string;
  stats: StatItem[];
  identityChips: IdentityChip[];
  onEditProfile?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  className?: string;
}

const statusConfig = {
  active: {
    label: "Active",
    className: "bg-neutral-100 text-neutral-900",
  },
  inactive: {
    label: "Inactive",
    className: "bg-neutral-200 text-neutral-900",
  },
  onboarding: {
    label: "Onboarding",
    className: "bg-neutral-100 text-neutral-700",
  },
};

export function ProfileSidebar({
  name,
  role,
  status,
  avatarUrl,
  avatarFallback,
  stats,
  identityChips,
  onEditProfile,
  onCall,
  onMessage,
  className,
}: ProfileSidebarProps) {
  const statusInfo = statusConfig[status];

  return (
    <div
      className={cn(
        "w-80 shrink-0 bg-white rounded-2xl shadow-card p-6 space-y-6 h-fit sticky top-6",
        className
      )}
    >
      {/* Avatar */}
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-24 w-24 border-2 border-neutral-200 mb-4">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="text-2xl font-semibold bg-neutral-100 text-neutral-700">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <h1 className="text-h1 font-bold text-neutral-900 mb-2">{name}</h1>

        {/* Role Badge */}
        <Badge variant="secondary" className="mb-2">
          {role}
        </Badge>

        {/* Status Pill */}
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
            statusInfo.className
          )}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Quick Action Buttons */}
      <div className="space-y-2">
        {onEditProfile && (
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={onEditProfile}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {onCall && (
            <Button variant="outline" size="sm" onClick={onCall}>
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          )}
          {onMessage && (
            <Button variant="outline" size="sm" onClick={onMessage}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Button>
          )}
        </div>
      </div>

      {/* Compact Stats */}
      <div className="space-y-3">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-neutral-50 border border-neutral-100"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-neutral-200">
                {stat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-h2 text-neutral-900">{stat.count}</p>
                <p className="text-body-s text-neutral-500 truncate">
                  {stat.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Identity Chips */}
      {identityChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {identityChips.map((chip, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-body-s bg-neutral-100 text-neutral-700"
            >
              {chip.icon && <span className="mr-1.5">{chip.icon}</span>}
              {chip.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
