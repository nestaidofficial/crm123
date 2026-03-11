"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ComplianceStep, DocumentType } from "./types";
import { DOCUMENT_TYPE_LABELS } from "./constants";

interface StepUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  step: ComplianceStep | null;
  employeeId: string;
  onUploadSuccess: (uploadedDocuments: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    uploadedDate: string;
    expiryDate?: string;
    complianceStepId?: string;
  }>) => void;
}

export function StepUploadDialog({
  isOpen,
  onClose,
  step,
  employeeId,
  onUploadSuccess,
}: StepUploadDialogProps) {
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const allTypes: DocumentType[] = [
    "application",
    "cori",
    "sori",
    "training",
    "i9",
    "policy",
    "emergency",
    "w4",
    "direct_deposit",
    "offer_letter",
    "reference",
    "interview",
    "transportation",
    "other",
  ];

  const availableTypes: DocumentType[] = step?.requiredDocumentTypes.length
    ? [...step.requiredDocumentTypes, "other"]
    : allTypes;

  // Determine if the type is fixed (only one required type — no need to show the selector)
  const fixedType: DocumentType | null =
    step?.requiredDocumentTypes.length === 1
      ? step.requiredDocumentTypes[0]
      : null;

  // Initialise / reset form whenever the dialog opens for a specific step
  useEffect(() => {
    if (isOpen && step) {
      setDocumentName(step.title);
      setExpiryDate("");
      setSelectedFile(null);
      setIsDragging(false);
      // Pre-select first required type; user can still change when there are multiple
      setDocumentType(step.requiredDocumentTypes[0] ?? "");
    }
  }, [isOpen, step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDocumentName("");
      setDocumentType("");
      setExpiryDate("");
      setSelectedFile(null);
      setIsDragging(false);
      onClose();
    }
  };

  const handleUpload = async () => {
    const resolvedType = documentType || fixedType || "";
    if (!selectedFile || !documentName.trim() || !resolvedType || !step || !employeeId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("type", resolvedType);
      formData.set("name", documentName.trim());
      formData.set("step_id", step.id);
      if (expiryDate.trim()) {
        formData.set("expiry", expiryDate.trim());
      }
      formData.append("files", selectedFile);

      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Upload failed");
      }

      const json = await res.json();
      const uploadedDocs = Array.isArray(json?.data) ? json.data : [];
      
      toast.success("Document uploaded successfully");
      onUploadSuccess(uploadedDocs);
      handleOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  if (!step) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload document for {step.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Name */}
          <div className="space-y-2">
            <label htmlFor="doc-name" className="text-body-s font-medium text-neutral-700">
              Document name
            </label>
            <Input
              id="doc-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g. CNA Certification, Driver License"
            />
          </div>

          {/* Document Type — hidden when pre-determined by the step */}
          {fixedType ? null : (
            <div className="space-y-2">
              <label htmlFor="doc-type" className="text-body-s font-medium text-neutral-700">
                Document type
              </label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Expiry Date */}
          <div className="space-y-2">
            <label htmlFor="doc-expiry" className="text-body-s font-medium text-neutral-700">
              Expiry date <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <Input
              id="doc-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="text-neutral-700 [color-scheme:light]"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <span className="text-body-s font-medium text-neutral-700">File</span>
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) setSelectedFile(f);
              }}
              className={cn(
                "border-2 border-dashed rounded-xl p-4 text-center transition-colors",
                isDragging ? "border-primary-500 bg-primary-500/5" : "border-neutral-200 bg-neutral-50"
              )}
            >
              {selectedFile ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="text-body-s text-neutral-700 truncate">
                      {selectedFile.name}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="h-6 w-6 p-0 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-body-s text-neutral-600 mb-2">
                    Drop a file here or click to choose
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,.txt,.csv"
                    className="hidden"
                    id="step-doc-file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                  <label htmlFor="step-doc-file">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>Choose File</span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!documentName.trim() || !(documentType || fixedType) || !selectedFile || isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading…" : "Upload Document"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
