"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ComplianceDocument } from "./types";
import { DOCUMENT_TYPE_LABELS } from "./constants";

interface VaultDocumentItemProps {
  document: ComplianceDocument;
  onVerify: () => void;
  onReject: () => void;
  onView: () => void;
  onDownload: () => void;
  className?: string;
}

const documentStatusConfig = {
  pending_review: {
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    label: "Pending Review",
    badgeColor: "bg-yellow-100 text-yellow-700",
  },
  verified: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Verified",
    badgeColor: "bg-green-100 text-green-700",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Rejected",
    badgeColor: "bg-red-100 text-red-700",
  },
  expired: {
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    label: "Expired",
    badgeColor: "bg-orange-100 text-orange-700",
  },
};

export function VaultDocumentItem({
  document,
  onVerify,
  onReject,
  onView,
  onDownload,
  className,
}: VaultDocumentItemProps) {
  const statusConfig = documentStatusConfig[document.status];
  const StatusIcon = statusConfig.icon;

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-all hover:shadow-md",
        statusConfig.bgColor,
        statusConfig.borderColor,
        className
      )}
    >
      {/* Document header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              document.status === "verified" ? "bg-green-100" : "bg-white"
            )}
          >
            <FileText className={cn("h-5 w-5", statusConfig.color)} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">
              {document.name}
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {DOCUMENT_TYPE_LABELS[document.type]} • {formatFileSize(document.fileSize)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={cn("border-0 text-[10px]", statusConfig.badgeColor)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                View Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Document metadata */}
      <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
        <div className="flex items-center gap-1 text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Uploaded by {document.uploadedBy}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{document.uploadedAt}</span>
        </div>
        {document.verifiedBy && (
          <>
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>Verified by {document.verifiedBy}</span>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <Calendar className="h-3 w-3" />
              <span>{document.verifiedAt}</span>
            </div>
          </>
        )}
        {document.expiresAt && (
          <div className="flex items-center gap-1 text-orange-600 col-span-2">
            <AlertCircle className="h-3 w-3" />
            <span>Expires: {document.expiresAt}</span>
          </div>
        )}
      </div>

      {/* Audit notes */}
      {document.auditNotes && (
        <div className="mb-3 p-2 bg-white/50 rounded-lg border border-white">
          <p className="text-[10px] font-medium text-slate-600 mb-1">Audit Notes:</p>
          <p className="text-[11px] text-slate-700 italic">&quot;{document.auditNotes}&quot;</p>
        </div>
      )}

      {/* Actions */}
      {document.status === "pending_review" && (
        <div className="flex items-center gap-2 pt-2 border-t border-white">
          <Button
            size="sm"
            className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
            onClick={onVerify}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verify
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
            onClick={onReject}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Reject
          </Button>
        </div>
      )}

      {document.status === "rejected" && (
        <div className="flex items-center gap-2 pt-2 border-t border-white">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-8"
            onClick={onVerify}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approve After Review
          </Button>
        </div>
      )}
    </div>
  );
}
