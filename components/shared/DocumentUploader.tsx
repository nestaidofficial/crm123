"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileWithMeta {
  file: File;
  name: string;
  expiryDate: string;
}

interface DocumentUploaderProps {
  onUpload: (files: FileWithMeta[]) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  uploading?: boolean;
}

export function DocumentUploader({
  onUpload,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,image/*,.txt,.csv",
  maxSize = 10,
  className,
  disabled = false,
  uploading = false,
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [documentExpiry, setDocumentExpiry] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setSelectedFile(f);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null;
      setSelectedFile(f);
      e.target.value = "";
    },
    []
  );

  const handleUpload = useCallback(() => {
    if (!selectedFile || !documentName.trim() || disabled) return;
    onUpload([{ file: selectedFile, name: documentName.trim(), expiryDate: documentExpiry }]);
    setSelectedFile(null);
    setDocumentName("");
    setDocumentExpiry("");
  }, [selectedFile, documentName, documentExpiry, onUpload, disabled]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Document Name */}
      <div className="space-y-2">
        <label htmlFor="doc-name" className="text-body-s font-medium text-neutral-700">
          Document name
        </label>
        <Input
          id="doc-name"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="e.g. Consent Form, Care Plan, Insurance Card"
          className="max-w-md"
          disabled={disabled}
        />
      </div>

      {/* Expiry Date */}
      <div className="space-y-2">
        <label htmlFor="doc-expiry" className="text-body-s font-medium text-neutral-700">
          Expiry date{" "}
          <span className="text-neutral-400 font-normal">(optional)</span>
        </label>
        <Input
          id="doc-expiry"
          type="date"
          value={documentExpiry}
          onChange={(e) => setDocumentExpiry(e.target.value)}
          className="max-w-xs text-neutral-700 [color-scheme:light]"
          disabled={disabled}
        />
      </div>

      {/* File Drop Zone */}
      <div className="space-y-2">
        <span className="text-body-s font-medium text-neutral-700">File</span>
        <div
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-4 text-center transition-colors max-w-md",
            isDragging ? "border-primary-500 bg-primary-500/5" : "border-neutral-200 bg-neutral-50"
          )}
        >
          <p className="text-body-s text-neutral-600 mb-2">
            {selectedFile
              ? selectedFile.name
              : `Drop a file here or click to choose`}
          </p>
          <p className="text-[11px] text-neutral-400 mb-2">Maximum file size: {maxSize}MB</p>
          <input
            type="file"
            accept={accept}
            className="hidden"
            id="doc-file-upload"
            onChange={handleFileSelect}
            disabled={disabled}
          />
          <label htmlFor="doc-file-upload">
            <Button type="button" variant="outline" size="sm" asChild disabled={disabled}>
              <span>Choose File</span>
            </Button>
          </label>
        </div>
      </div>

      {/* Upload Button */}
      <Button
        disabled={!documentName.trim() || !selectedFile || disabled || uploading}
        onClick={handleUpload}
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Uploading…" : "Upload Document"}
      </Button>
    </div>
  );
}
