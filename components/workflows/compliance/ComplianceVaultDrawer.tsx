"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  FileText,
  Plus,
  CheckCircle2,
  MessageSquare,
  Upload,
  Shield,
} from "lucide-react";
import type { ComplianceStep, ComplianceDocument } from "./types";
import { VaultDocumentItem } from "./VaultDocumentItem";

interface ComplianceVaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  step: ComplianceStep | null;
  onDocumentVerify: (documentId: string) => void;
  onDocumentReject: (documentId: string, reason?: string) => void;
  onAuditNoteAdd: (stepId: string, note: string) => void;
  onUpload: () => void;
}

export function ComplianceVaultDrawer({
  isOpen,
  onClose,
  step,
  onDocumentVerify,
  onDocumentReject,
  onAuditNoteAdd,
  onUpload,
}: ComplianceVaultDrawerProps) {
  const [auditNote, setAuditNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  if (!step) return null;

  const verifiedDocs = step.documents.filter((d) => d.status === "verified");
  const pendingDocs = step.documents.filter((d) => d.status === "pending_review");
  const rejectedDocs = step.documents.filter((d) => d.status === "rejected");

  const handleAddNote = () => {
    if (auditNote.trim()) {
      onAuditNoteAdd(step.id, auditNote.trim());
      setAuditNote("");
      setIsAddingNote(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-white border-black/5">
        <SheetHeader className="pb-4 border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-neutral-100">
              <FolderOpen className="h-5 w-5 text-neutral-700" />
            </div>
            <div>
              <SheetTitle className="text-base">Compliance Vault</SheetTitle>
              <SheetDescription className="text-xs">
                Step {step.stepNumber}: {step.title}
              </SheetDescription>
            </div>
          </div>

          {/* Step compliance status */}
          {step.isComplianceGate && (
            <div
              className={cn(
                "mt-3 flex items-center gap-2 p-2 rounded-lg text-xs",
                step.status === "verified"
                  ? "bg-neutral-100 text-neutral-900"
                  : "bg-neutral-100 text-neutral-700"
              )}
            >
              <Shield className="h-4 w-4" />
              <span>
                {step.status === "verified"
                  ? "Compliance gate passed"
                  : "This step is required for assignment"}
              </span>
            </div>
          )}
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Document stats */}
          <div className="flex items-center gap-3">
            <Badge className="bg-neutral-100 text-neutral-900 border-0 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {verifiedDocs.length} verified
            </Badge>
            {pendingDocs.length > 0 && (
              <Badge className="bg-neutral-100 text-neutral-700 border-0 text-xs">
                {pendingDocs.length} pending
              </Badge>
            )}
            {rejectedDocs.length > 0 && (
              <Badge className="bg-neutral-200 text-neutral-900 border-0 text-xs">
                {rejectedDocs.length} rejected
              </Badge>
            )}
          </div>

          {/* Upload area — white card, dashed border */}
          <div className="bg-neutral-50 border border-dashed border-black/10 rounded-2xl">
            <Button
              variant="ghost"
              className="w-full h-12 text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900"
              onClick={onUpload}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New Document
            </Button>
          </div>

          {/* Documents list */}
          {step.documents.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-neutral-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents ({step.documents.length})
              </h3>
              {step.documents.map((doc) => (
                <VaultDocumentItem
                  key={doc.id}
                  document={doc}
                  onVerify={() => onDocumentVerify(doc.id)}
                  onReject={() => onDocumentReject(doc.id)}
                  onView={() => {
                    // TODO: Implement document preview
                    console.log("View document:", doc.id);
                  }}
                  onDownload={() => {
                    // TODO: Implement document download
                    console.log("Download document:", doc.id);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4 rounded-2xl bg-neutral-50 border border-dashed border-black/10">
              <FileText className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-neutral-700 mb-1">
                No documents yet
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Upload documents for this step to track compliance
              </p>
              <Button size="sm" onClick={onUpload}>
                <Upload className="h-3 w-3 mr-1" />
                Upload Document
              </Button>
            </div>
          )}

          {/* Audit notes section */}
          <div className="pt-4 border-t border-black/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-neutral-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Audit Notes
              </h3>
              {!isAddingNote && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setIsAddingNote(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Note
                </Button>
              )}
            </div>

            {/* Add note form */}
            {isAddingNote && (
              <div className="mb-4 p-3 rounded-lg bg-neutral-50 border border-black/5">
                <Textarea
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="Enter audit note for EOEA compliance tracking..."
                  className="min-h-[80px] text-sm mb-2"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => {
                      setIsAddingNote(false);
                      setAuditNote("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-neutral-900 hover:bg-neutral-800 text-white"
                    onClick={handleAddNote}
                    disabled={!auditNote.trim()}
                  >
                    Save Note
                  </Button>
                </div>
              </div>
            )}

            {/* Existing audit history */}
            {step.auditHistory.length > 0 ? (
              <div className="space-y-2">
                {step.auditHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2 rounded-lg bg-neutral-50 border border-black/5 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-neutral-700">
                        {entry.performedBy}
                      </span>
                      <span className="text-muted-foreground">
                        {entry.timestamp}
                      </span>
                    </div>
                    <p className="text-neutral-600">{entry.details || entry.action}</p>
                  </div>
                ))}
              </div>
            ) : (
              !isAddingNote && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No audit notes yet. Add notes for EOEA compliance tracking.
                </p>
              )
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
