"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileHeaderProps {
  name: string;
  username?: string; // @role or @id
  bio?: string; // Description text
  avatarUrl?: string;
  avatarFallback: string;
  inlineStats?: Array<{ icon: React.ReactNode; count: number | string; label: string }>;
  contactInfo?: { phone?: string; email?: string; location?: string };
  badges?: Array<{ label: string; variant?: "default" | "secondary" | "outline" | "destructive" }>;
  metadata?: Array<{ icon: React.ReactNode; text: string }>;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

export function ProfileHeader({
  name,
  username,
  bio,
  avatarUrl,
  avatarFallback,
  inlineStats,
  contactInfo,
  badges,
  metadata,
  primaryAction,
  secondaryAction,
  className,
}: ProfileHeaderProps) {
  return (
    <div className={cn("border border-neutral-200 bg-white rounded-2xl p-8", className)}>
      {/* Main Header Row */}
      <div className="flex items-start gap-8">
        {/* Avatar */}
        <Avatar className="h-24 w-24 border-2 border-neutral-200">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="text-2xl font-semibold bg-neutral-100 text-neutral-700">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 flex justify-between gap-8">
          {/* Left: name, actions, details */}
          <div className="space-y-3">
            {/* Name */}
            <h1 className="text-2xl font-bold text-neutral-900">{name}</h1>

            {/* Username/Role */}
            {username && (
              <p className="text-base text-neutral-500">{username}</p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {primaryAction && (
                <Button variant="default" size="sm" onClick={primaryAction.onClick}>
                  <Edit className="h-4 w-4 mr-2" />
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )}
            </div>

            {/* Bio */}
            {bio && (
              <p className="text-sm text-neutral-600 leading-relaxed max-w-2xl">
                {bio}
              </p>
            )}

            {/* Contact Icons Row */}
            {contactInfo && (
              <div className="flex items-center gap-4 flex-wrap">
                {contactInfo.phone && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{contactInfo.phone}</span>
                  </div>
                )}
                {contactInfo.email && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{contactInfo.email}</span>
                  </div>
                )}
                {contactInfo.location && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{contactInfo.location}</span>
                  </div>
                )}
              </div>
            )}

            {/* Badges and Metadata Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Badges */}
              {badges && badges.length > 0 && (
                <div className="flex items-center gap-2">
                  {badges.map((badge, idx) => (
                    <Badge key={idx} variant={badge.variant || "default"}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Metadata */}
              {metadata && metadata.length > 0 && (
                <div className="flex items-center gap-4 flex-wrap">
                  {metadata.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-sm text-neutral-500">
                      {item.icon}
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: inline stats */}
          {inlineStats && inlineStats.length > 0 && (
            <div className="flex items-center">
              <div className="flex flex-col gap-3 min-w-[200px] rounded-xl border border-neutral-200 bg-neutral-50/60 px-5 py-4">
                {inlineStats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-400 border border-neutral-200">
                        {stat.icon}
                      </div>
                      <span className="text-xs text-neutral-500">
                        {stat.label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">
                      {stat.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
