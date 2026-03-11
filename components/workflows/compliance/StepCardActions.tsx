"use client";

import { Button } from "@/components/ui/button";
import {
  Upload,
  Send,
  CheckCircle2,
  RotateCcw,
  Shield,
  XCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepStatus, ComplianceStep } from "./types";

interface StepCardActionsProps {
  step: ComplianceStep;
  onStatusChange: (status: StepStatus) => void;
  onUpload: () => void;
  onSendForm: () => void;
  onDeleteDocument?: () => void;
  className?: string;
}

export function StepCardActions({
  step,
  onStatusChange,
  onUpload,
  onSendForm,
  onDeleteDocument,
  className,
}: StepCardActionsProps) {
  const { status, autoValidation, isComplianceGate, noDocumentUpload } = step;
  const hasDocuments = step.documents.length > 0;

  // For steps that don't allow document upload
  if (noDocumentUpload) {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {/* Not started - show mark complete + send */}
        {status === "not_started" && (
          <>
            <Button
              size="sm"
              className="text-xs h-8 bg-black hover:bg-neutral-800 text-white"
              onClick={() => onStatusChange("verified")}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Mark as Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-black/10"
              onClick={onSendForm}
            >
              <Send className="h-3 w-3 mr-1" />
              Send to Caregiver
            </Button>
          </>
        )}

        {/* Uploaded/Waiting - show verify */}
        {(status === "uploaded" || status === "waiting") && !autoValidation && (
          <Button
            size="sm"
            className="text-xs h-8 bg-black hover:bg-neutral-800 text-white"
            onClick={() => onStatusChange("verified")}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verify
          </Button>
        )}

        {/* Verified - show unverify */}
        {status === "verified" && !autoValidation && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={() => onStatusChange("uploaded")}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Unverify
          </Button>
        )}

        {/* Blocked - show review again */}
        {status === "blocked" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={() => onStatusChange("uploaded")}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Review Again
          </Button>
        )}

        {/* Auto-validation indicator */}
        {autoValidation && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded">
            <Shield className="h-3 w-3" />
            <span>Auto-validated by system</span>
          </div>
        )}

        {/* Compliance gate indicator */}
        {isComplianceGate && (
          <div
            className={cn(
              "ml-auto flex items-center gap-1 text-[10px] px-2 py-1 rounded",
              status === "verified"
                ? "bg-neutral-100 text-neutral-900"
                : "bg-neutral-100 text-neutral-700"
            )}
          >
            <Shield className="h-3 w-3" />
            <span>{status === "verified" ? "Gate Passed" : "Required for Assignment"}</span>
          </div>
        )}
      </div>
    );
  }

  // For steps that allow document upload
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Status-specific actions */}
      {status === "not_started" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={onUpload}
          >
            <Upload className="h-3 w-3 mr-1" />
            Add Document
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={onSendForm}
          >
            <Send className="h-3 w-3 mr-1" />
            Send to Caregiver
          </Button>
        </>
      )}

      {status === "waiting" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10 bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
            onClick={onSendForm}
          >
            <Send className="h-3 w-3 mr-1" />
            Resend Request
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={onUpload}
          >
            <Upload className="h-3 w-3 mr-1" />
            Upload on Behalf
          </Button>
        </>
      )}

      {status === "uploaded" && !autoValidation && (
        <>
          <Button
            size="sm"
            className="text-xs h-8 bg-black hover:bg-neutral-800 text-white"
            onClick={() => onStatusChange("verified")}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verify
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10 text-neutral-900 hover:bg-neutral-100"
            onClick={() => onStatusChange("blocked")}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={onUpload}
          >
            <Upload className="h-3 w-3 mr-1" />
            Add Document
          </Button>
        </>
      )}

      {status === "verified" && !autoValidation && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={() => onStatusChange("uploaded")}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Unverify
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={onUpload}
          >
            <Upload className="h-3 w-3 mr-1" />
            Add Document
          </Button>
          {onDeleteDocument && hasDocuments && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-black/10 text-red-600 hover:bg-red-50"
              onClick={onDeleteDocument}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete Document
            </Button>
          )}
        </>
      )}

      {status === "blocked" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={onUpload}
          >
            <Upload className="h-3 w-3 mr-1" />
            Add Document
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-black/10"
            onClick={() => onStatusChange("uploaded")}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Review Again
          </Button>
        </>
      )}

      {/* Auto-validation indicator */}
      {autoValidation && (
        <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded">
          <Shield className="h-3 w-3" />
          <span>Auto-validated by system</span>
        </div>
      )}

      {/* Compliance gate indicator */}
      {isComplianceGate && (
        <div
          className={cn(
            "ml-auto flex items-center gap-1 text-[10px] px-2 py-1 rounded",
            status === "verified"
              ? "bg-neutral-100 text-neutral-900"
              : "bg-neutral-100 text-neutral-700"
          )}
        >
          <Shield className="h-3 w-3" />
          <span>{status === "verified" ? "Gate Passed" : "Required for Assignment"}</span>
        </div>
      )}
    </div>
  );
}
