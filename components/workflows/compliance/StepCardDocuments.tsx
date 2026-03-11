"use client";

import { cn } from "@/lib/utils";
import { FileText, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import type { ComplianceDocument, DocumentType } from "./types";
import { DOCUMENT_TYPE_LABELS } from "./constants";

interface StepCardDocumentsProps {
  documents: ComplianceDocument[];
  requiredTypes: DocumentType[];
  maxDisplay?: number;
  className?: string;
}

const documentStatusConfig = {
  pending_review: {
    icon: Clock,
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    label: "Pending Review",
  },
  verified: {
    icon: CheckCircle2,
    color: "text-green-700",
    bgColor: "bg-green-100",
    label: "Verified",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-700",
    bgColor: "bg-red-100",
    label: "Rejected",
  },
  expired: {
    icon: AlertCircle,
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    label: "Expired",
  },
};

export function StepCardDocuments({
  documents,
  requiredTypes,
  maxDisplay = 3,
  className,
}: StepCardDocumentsProps) {
  const displayDocs = documents.slice(0, maxDisplay);
  const remainingCount = documents.length - maxDisplay;

  // Find missing required document types
  const uploadedTypes = new Set(documents.map((d) => d.type));
  const missingTypes = requiredTypes.filter((type) => !uploadedTypes.has(type));

  if (documents.length === 0 && missingTypes.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Uploaded documents */}
      {displayDocs.map((doc) => {
        const statusConfig = documentStatusConfig[doc.status];
        const StatusIcon = statusConfig.icon;

        // Check if document is expired or expiring soon
        const isExpired = doc.expiresAt && new Date(doc.expiresAt) < new Date();
        const isExpiringSoon =
          doc.expiresAt &&
          !isExpired &&
          new Date(doc.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        return (
          <div key={doc.id} className="space-y-1">
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                statusConfig.bgColor
              )}
            >
              <FileText className={cn("h-3.5 w-3.5 flex-shrink-0", statusConfig.color)} />
              <span className="flex-1 text-[11px] font-medium text-slate-700 truncate">
                {doc.name}
              </span>
              <div className="flex items-center gap-1">
                <StatusIcon className={cn("h-3 w-3", statusConfig.color)} />
                <span className={cn("text-[10px]", statusConfig.color)}>
                  {statusConfig.label}
                </span>
              </div>
            </div>
            {doc.expiresAt && (
              <div
                className={cn(
                  "text-[10px] px-2",
                  isExpired
                    ? "text-red-600 font-medium"
                    : isExpiringSoon
                      ? "text-amber-600"
                      : "text-neutral-500"
                )}
              >
                {isExpired ? "Expired " : "Expires "}
                {new Date(doc.expiresAt).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      })}

      {/* Remaining documents indicator */}
      {remainingCount > 0 && (
        <div className="text-[10px] text-muted-foreground text-center py-1">
          +{remainingCount} more document{remainingCount > 1 ? "s" : ""}
        </div>
      )}

      {/* Missing required documents */}
      {missingTypes.length > 0 && (
        <div className="pt-2 mt-2 border-t border-black/5">
          <p className="text-[10px] text-muted-foreground mb-1">Required:</p>
          {missingTypes.map((type) => (
            <div
              key={type}
              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-neutral-50"
            >
              <FileText className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-[11px] text-gray-500">
                {DOCUMENT_TYPE_LABELS[type]}
              </span>
              <span className="ml-auto text-[10px] text-gray-400">Missing</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact document count indicator
interface DocumentCountBadgeProps {
  uploaded: number;
  required: number;
  className?: string;
}

export function DocumentCountBadge({
  uploaded,
  required,
  className,
}: DocumentCountBadgeProps) {
  const isComplete = uploaded >= required;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full",
        isComplete ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600",
        className
      )}
    >
      <FileText className="h-3 w-3" />
      <span>
        {uploaded}/{required} docs
      </span>
    </div>
  );
}
