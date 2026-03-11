"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  FileText,
  Plus,
  CheckCircle2,
  MessageSquare,
  Upload,
  Shield,
  Folder,
  BookOpen,
  ClipboardCheck,
  RefreshCw,
} from "lucide-react";
import type { ComplianceStep, ComplianceDocument, CaregiverInfo, CompliancePhase } from "./types";
import { VaultDocumentItem } from "./VaultDocumentItem";

interface ComplianceVaultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  step: ComplianceStep | null;
  caregiver: CaregiverInfo;
  phases: CompliancePhase[];
  onDocumentVerify: (documentId: string) => void;
  onDocumentReject: (documentId: string, reason?: string) => void;
  onAuditNoteAdd: (stepId: string, note: string) => void;
  onUpload: () => void;
}

export function ComplianceVaultDialog({
  isOpen,
  onClose,
  step,
  caregiver,
  phases,
  onDocumentVerify,
  onDocumentReject,
  onAuditNoteAdd,
  onUpload,
}: ComplianceVaultDialogProps) {
  const [auditNote, setAuditNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<"vault" | "training">("vault");

  // Generate training folder structure
  const trainingFolders = {
    application: phases
      .flatMap((p) => p.steps)
      .filter((s) => s.requiredDocumentTypes.includes("application"))
      .flatMap((s) => s.documents),
    coriSori: phases
      .flatMap((p) => p.steps)
      .filter((s) => s.requiredDocumentTypes.includes("cori") || s.requiredDocumentTypes.includes("sori"))
      .flatMap((s) => s.documents),
    trainingManual: phases
      .flatMap((p) => p.steps)
      .filter((s) => s.requiredDocumentTypes.includes("training"))
      .flatMap((s) => s.documents),
    quizResults: phases
      .flatMap((p) => p.steps)
      .filter((s) => s.title.toLowerCase().includes("quiz") || s.title.toLowerCase().includes("assessment"))
      .flatMap((s) => s.documents),
    annualRefreshers: phases
      .flatMap((p) => p.steps)
      .filter((s) => s.title.toLowerCase().includes("annual") || s.title.toLowerCase().includes("refresher"))
      .flatMap((s) => s.documents),
  };

  const handleAddNote = () => {
    if (auditNote.trim() && step) {
      onAuditNoteAdd(step.id, auditNote.trim());
      setAuditNote("");
      setIsAddingNote(false);
    }
  };

  // Vault content (step-specific)
  const VaultContent = () => {
    if (!step) {
      return (
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
            <FolderOpen className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-700 mb-2">
            Select a Step
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click on any step card to view its documents and compliance details
          </p>
        </div>
      );
    }

    const verifiedDocs = step.documents.filter((d) => d.status === "verified");
    const pendingDocs = step.documents.filter((d) => d.status === "pending_review");
    const rejectedDocs = step.documents.filter((d) => d.status === "rejected");

    return (
      <div className="space-y-4">
        {/* Step header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-neutral-900 text-white border-0 text-[10px]">
              Step {step.stepNumber}
            </Badge>
            {step.isComplianceGate && (
              <Badge className="bg-neutral-100 text-neutral-700 border-0 text-[10px]">
                <Shield className="h-3 w-3 mr-1" />
                Compliance Gate
              </Badge>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
          {step.description && (
            <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
          )}
        </div>

        {/* Step compliance status */}
            {step.isComplianceGate && (
            <div
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-xs",
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

        {/* Document stats */}
        <div className="flex items-center gap-2 flex-wrap">
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
            className="w-full h-10 text-sm text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900"
            onClick={onUpload}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Documents list */}
        {step.documents.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-neutral-700 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents ({step.documents.length})
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {step.documents.map((doc) => (
                <VaultDocumentItem
                  key={doc.id}
                  document={doc}
                  onVerify={() => onDocumentVerify(doc.id)}
                  onReject={() => onDocumentReject(doc.id)}
                  onView={() => {
                    console.log("View document:", doc.id);
                  }}
                  onDownload={() => {
                    console.log("Download document:", doc.id);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 px-4 rounded-2xl bg-neutral-50 border border-dashed border-black/10">
            <FileText className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
            <h4 className="text-xs font-medium text-neutral-700 mb-1">
              No documents yet
            </h4>
            <p className="text-[10px] text-muted-foreground mb-3">
              Upload documents for this step
            </p>
            <Button size="sm" onClick={onUpload} className="text-xs h-7">
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          </div>
        )}

        {/* Audit notes section */}
        <div className="pt-4 border-t border-black/5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-neutral-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Audit Notes
            </h4>
            {!isAddingNote && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setIsAddingNote(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>

          {/* Add note form */}
          {isAddingNote && (
            <div className="mb-3 p-2 rounded-lg bg-neutral-50 border border-black/5">
              <Textarea
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder="Enter audit note for EOEA compliance..."
                className="min-h-[60px] text-xs mb-2"
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-6"
                  onClick={() => {
                    setIsAddingNote(false);
                    setAuditNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-6 bg-neutral-900 hover:bg-neutral-800 text-white"
                  onClick={handleAddNote}
                  disabled={!auditNote.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Existing audit history */}
          {step.auditHistory.length > 0 ? (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {step.auditHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2 rounded-lg bg-neutral-50 border border-black/5 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-700">
                      {entry.performedBy}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[10px]">{entry.details || entry.action}</p>
                </div>
              ))}
            </div>
          ) : (
            !isAddingNote && (
              <p className="text-xs text-muted-foreground text-center py-3">
                No audit notes yet
              </p>
            )
          )}
        </div>
      </div>
    );
  };

  // Training folder content
  const TrainingFolderContent = () => {
    const totalDocs =
      trainingFolders.application.length +
      trainingFolders.coriSori.length +
      trainingFolders.trainingManual.length +
      trainingFolders.quizResults.length +
      trainingFolders.annualRefreshers.length;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Training Folder</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-generated for {caregiver.name}
            </p>
          </div>
          <Badge className="bg-slate-900 text-white border-0 text-xs">
            {totalDocs} docs
          </Badge>
        </div>

        {/* Folder structure */}
        <div className="space-y-3">
          {/* Application */}
          <div className="border rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Folder className="h-4 w-4 text-slate-600" />
              <h4 className="text-xs font-semibold text-slate-900">Application</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {trainingFolders.application.length}
              </Badge>
            </div>
            {trainingFolders.application.length > 0 ? (
              <div className="space-y-1">
                {trainingFolders.application.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 text-xs text-slate-600 p-1.5 rounded hover:bg-slate-50"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="flex-1 truncate">{doc.name}</span>
                    {doc.status === "verified" && (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">No documents</p>
            )}
          </div>

          {/* CORI/SORI */}
          <div className="border rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-slate-600" />
              <h4 className="text-xs font-semibold text-slate-900">CORI/SORI</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {trainingFolders.coriSori.length}
              </Badge>
            </div>
            {trainingFolders.coriSori.length > 0 ? (
              <div className="space-y-1">
                {trainingFolders.coriSori.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 text-xs text-slate-600 p-1.5 rounded hover:bg-slate-50"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="flex-1 truncate">{doc.name}</span>
                    {doc.status === "verified" && (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">No documents</p>
            )}
          </div>

          {/* Training Manual */}
          <div className="border rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-slate-600" />
              <h4 className="text-xs font-semibold text-slate-900">Training Manual</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {trainingFolders.trainingManual.length}
              </Badge>
            </div>
            {trainingFolders.trainingManual.length > 0 ? (
              <div className="space-y-1">
                {trainingFolders.trainingManual.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 text-xs text-slate-600 p-1.5 rounded hover:bg-slate-50"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="flex-1 truncate">{doc.name}</span>
                    {doc.status === "verified" && (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">No documents</p>
            )}
          </div>

          {/* Quiz Results */}
          <div className="border rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="h-4 w-4 text-slate-600" />
              <h4 className="text-xs font-semibold text-slate-900">Quiz Results</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {trainingFolders.quizResults.length}
              </Badge>
            </div>
            {trainingFolders.quizResults.length > 0 ? (
              <div className="space-y-1">
                {trainingFolders.quizResults.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 text-xs text-slate-600 p-1.5 rounded hover:bg-slate-50"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="flex-1 truncate">{doc.name}</span>
                    {doc.status === "verified" && (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">No documents</p>
            )}
          </div>

          {/* Annual Refreshers */}
          <div className="border rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-slate-600" />
              <h4 className="text-xs font-semibold text-slate-900">Annual Refreshers</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {trainingFolders.annualRefreshers.length}
              </Badge>
            </div>
            {trainingFolders.annualRefreshers.length > 0 ? (
              <div className="space-y-1">
                {trainingFolders.annualRefreshers.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 text-xs text-slate-600 p-1.5 rounded hover:bg-slate-50"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="flex-1 truncate">{doc.name}</span>
                    {doc.status === "verified" && (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">No documents</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-black/5 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <DialogHeader className="pb-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-neutral-100">
              <FolderOpen className="h-5 w-5 text-neutral-700" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-neutral-900">Compliance Vault</DialogTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Documents & audit trail
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4">
          {/* Segmented control: white container, selected pill = lime only */}
          <div className="bg-neutral-100 rounded-full p-1 flex mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("vault")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeTab === "vault"
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <FolderOpen className="h-3 w-3" />
              Vault
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("training")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeTab === "training"
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <Folder className="h-3 w-3" />
              Training
            </button>
          </div>

          {activeTab === "vault" && <VaultContent />}
          {activeTab === "training" && <TrainingFolderContent />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
