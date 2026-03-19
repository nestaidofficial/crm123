"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Phone, Mail, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DetailRowProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
}

function DetailRow({ icon, label, value, className }: DetailRowProps) {
  return (
    <div
      className={cn(
        "flex items-start py-3 border-b border-neutral-100 last:border-0",
        className
      )}
    >
      <div className="flex items-center gap-2 w-40 shrink-0 text-neutral-500">
        <div className="h-4 w-4">{icon}</div>
        <span className="text-body-m">{label}</span>
      </div>
      <div className="flex-1 text-body-m text-neutral-900">{value}</div>
    </div>
  );
}

interface MetadataItem {
  label: string;
  value: string;
}

interface TagItem {
  id: string;
  label: string;
  onRemove?: (id: string) => void;
}

interface ProfileDetailCardProps {
  // Header
  avatarUrl?: string;
  avatarFallback: string;
  name: string;
  shortId?: string;
  subtitle?: string; // e.g., "Sales Manager • Tickmark Inc."
  badges?: Array<{ label: string; variant?: "default" | "secondary" | "outline" }>;
  statusPill?: {
    label: string;
    className: string;
  };
  
  // Metadata row
  metadata?: MetadataItem[];
  
  // Quick actions
  onEdit?: () => void;
  onDelete?: () => void;
  onPhoneCall?: () => void;
  onEmail?: () => void;
  onSMS?: () => void;
  
  // Detail rows
  detailSections: Array<{
    title?: string;
    rows: Array<{
      icon: ReactNode;
      label: string;
      value: ReactNode;
    }>;
  }>;
  
  // Tags
  tags?: TagItem[];
  onAddTag?: () => void;
  
  className?: string;
}

export function ProfileDetailCard({
  avatarUrl,
  avatarFallback,
  name,
  shortId,
  subtitle,
  badges = [],
  statusPill,
  metadata = [],
  onEdit,
  onDelete,
  onPhoneCall,
  onEmail,
  onSMS,
  detailSections,
  tags = [],
  onAddTag,
  className,
}: ProfileDetailCardProps) {
  return (
    <div
      className={cn(
        "flex-1 bg-white rounded-2xl shadow-card overflow-hidden h-fit flex flex-col",
        className
      )}
    >
      {/* Header Section */}
      <div className="p-6 border-b border-neutral-100">
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <Avatar className="h-20 w-20 border-2 border-neutral-200">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-xl font-semibold bg-neutral-100 text-neutral-700">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>

          {/* Name, badges, metadata */}
          <div className="flex-1 min-w-0">
            {/* Top row: name + edit/delete buttons */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-2xl font-bold text-neutral-900 truncate">
                  {name}
                </h1>
                {shortId && (
                  <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                    {shortId}
                  </span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {subtitle && (
              <p className="text-body-m text-neutral-500 mb-2">{subtitle}</p>
            )}

            {/* Bottom row: badges + status pill on left, metadata on right */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2">
                {badges.map((badge, idx) => (
                  <Badge key={idx} variant={badge.variant || "secondary"}>
                    {badge.label}
                  </Badge>
                ))}
                {statusPill && (
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                      statusPill.className
                    )}
                  >
                    {statusPill.label}
                  </span>
                )}
              </div>

              {/* Metadata — bottom right */}
              {metadata.length > 0 && (
                <div className="flex items-center gap-6 text-body-s text-neutral-500 shrink-0">
                  {metadata.map((item, idx) => (
                    <div key={idx} className="text-right">
                      <div className="font-medium">{item.label}</div>
                      <div>{item.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons row — below badges */}
            {(onPhoneCall || onEmail || onSMS) && (
              <div className="flex gap-2">
                {onPhoneCall && (
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={onPhoneCall}>
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
                {onEmail && (
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={onEmail}>
                    <Mail className="h-4 w-4" />
                  </Button>
                )}
                {onSMS && (
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={onSMS}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail sections */}
      <div className="flex-1">
        {detailSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="p-6 border-b border-neutral-100 last:border-0">
            {section.title && (
              <h3 className="text-body-m font-semibold text-neutral-900 mb-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-0">
              {section.rows.map((row, rowIdx) => (
                <DetailRow
                  key={rowIdx}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Tags section */}
        {(tags.length > 0 || onAddTag) && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-body-s text-neutral-500">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="gap-1"
                >
                  {tag.label}
                  {tag.onRemove && (
                    <button
                      onClick={() => tag.onRemove?.(tag.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  )}
                </Badge>
              ))}
              {onAddTag && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddTag}
                  className="h-6 px-2 text-body-s text-primary-500"
                >
                  + Add
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
