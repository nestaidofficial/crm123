"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileTextIcon,
  Download,
  Trash2,
  UploadCloudIcon,
  FileIcon,
  FileArchiveIcon,
  FileSpreadsheetIcon,
  VideoIcon,
  HeadphonesIcon,
  ImageIcon,
  AlertCircleIcon,
  X,
  CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileUpload, formatBytes } from "@/hooks/useFileUpload";

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedDate: string;
  expiryDate?: string;
  complianceStepId?: string;
  url?: string;
}

export interface DocumentUploadPayload {
  file: File;
  name: string;
  expiryDate: string;
}

interface DocumentListProps {
  documents: DocumentItem[];
  onPreview?: (document: DocumentItem) => void;
  onDownload?: (document: DocumentItem) => void;
  onDelete?: (documentId: string) => void;
  onUpload?: (files: DocumentUploadPayload[]) => void;
  emptyStateMessage?: string;
  className?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  accept?: string;
  uploading?: boolean;
}

type StagedFile = {
  id: string;
  file: File;
  name: string;
  expiryDate: string;
};

const getExt = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot > -1 ? name.slice(dot + 1).toLowerCase() : "";
};

const getFileIcon = (file: File) => {
  const type = file.type || "";
  const ext = getExt(file.name);

  if (
    type.includes("pdf") || ext === "pdf" ||
    type.includes("word") || ext === "doc" || ext === "docx" ||
    type.includes("text") || ext === "txt" || ext === "md"
  ) {
    return <FileTextIcon className="size-4 opacity-60" aria-hidden="true" />;
  }
  if (
    type.includes("zip") || type.includes("archive") ||
    ["zip", "rar", "7z", "tar"].includes(ext)
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" aria-hidden="true" />;
  }
  if (type.includes("excel") || ["xls", "xlsx", "csv"].includes(ext)) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" aria-hidden="true" />;
  }
  if (type.startsWith("video/") || ["mp4", "mov", "webm", "mkv"].includes(ext)) {
    return <VideoIcon className="size-4 opacity-60" aria-hidden="true" />;
  }
  if (type.startsWith("audio/") || ["mp3", "wav", "flac", "m4a"].includes(ext)) {
    return <HeadphonesIcon className="size-4 opacity-60" aria-hidden="true" />;
  }
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return <ImageIcon className="size-4 opacity-60" aria-hidden="true" />;
  }
  return <FileIcon className="size-4 opacity-60" aria-hidden="true" />;
};

const formatExpiry = (dateStr?: string) => {
  if (!dateStr) return <span className="text-neutral-400 text-xs">—</span>;
  const d = new Date(dateStr);
  const now = new Date();
  const formatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const isExpired = d < now;
  const soon = !isExpired && d.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000;
  return (
    <span
      className={cn(
        "text-xs font-medium",
        isExpired && "text-red-500",
        soon && !isExpired && "text-amber-500",
        !isExpired && !soon && "text-neutral-600"
      )}
    >
      {formatted}
      {isExpired && " · Expired"}
      {soon && !isExpired && " · Soon"}
    </span>
  );
};

export function DocumentList({
  documents,
  onPreview,
  onDownload,
  onDelete,
  onUpload,
  emptyStateMessage = "No documents yet. Drop files above to get started.",
  className,
  maxSize = 20 * 1024 * 1024,
  maxFiles = 20,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,image/*,.txt,.csv",
  uploading = false,
}: DocumentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  const [{ isDragging, errors }, { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, getInputProps }] =
    useFileUpload({
      multiple: true,
      maxFiles,
      maxSize,
      accept,
      onFilesAdded: (addedFiles) => {
        setStagedFiles((prev) => [
          ...prev,
          ...addedFiles
            .map((f) => f.file)
            .filter((f): f is File => f instanceof File)
            .map((file) => ({
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              file,
              name: file.name.replace(/\.[^/.]+$/, ""),
              expiryDate: "",
            })),
        ]);
      },
    });

  const handleDeleteClick = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (documentToDelete && onDelete) {
      onDelete(documentToDelete);
    }
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const updateStaged = (id: string, field: "name" | "expiryDate", value: string) => {
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const removeStaged = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUploadAll = () => {
    if (!onUpload || stagedFiles.length === 0) return;
    const payloads: DocumentUploadPayload[] = stagedFiles.map((f) => ({
      file: f.file,
      name: f.name.trim() || f.file.name,
      expiryDate: f.expiryDate,
    }));
    onUpload(payloads);
    setStagedFiles([]);
  };

  return (
    <>
      <div className={cn("flex flex-col gap-3", className)}>
        {/* Compact Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          className="border-neutral-200 data-[dragging=true]:bg-neutral-50 data-[dragging=true]:border-neutral-400 rounded-[8px] border border-dashed p-3 transition-colors"
          aria-label="Drop files here or use the select button to upload"
        >
          <input
            {...getInputProps({ accept, "aria-label": "Upload files" })}
            className="sr-only"
            disabled={uploading}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                <UploadCloudIcon className="size-4 text-neutral-500" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <p className="font-medium text-neutral-700">Drop files to upload</p>
                <p className="text-neutral-400">
                  Up to {maxFiles} files · {formatBytes(maxSize)} per file
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openFileDialog}
              disabled={uploading}
              className="h-7 px-3 text-xs rounded-[6px] border-neutral-300 text-neutral-700 hover:bg-neutral-100"
            >
              Select files
            </Button>
          </div>
        </div>

        {/* Validation errors */}
        {errors.length > 0 && (
          <div
            className="text-destructive flex items-center gap-1 text-xs"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircleIcon className="size-3 shrink-0" />
            <span>{errors[0]}</span>
          </div>
        )}

        {/* Staged files — edit name & expiry before uploading */}
        {stagedFiles.length > 0 && (
          <div className="rounded-[8px] border border-neutral-200 bg-white overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold" style={{ color: '#ffffff' }}>
                  {stagedFiles.length}
                </div>
                <span className="text-xs font-semibold text-neutral-700">
                  Ready to upload
                </span>
              </div>
              <button
                onClick={handleUploadAll}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[6px] text-xs font-semibold bg-[#FED96A] text-neutral-900 hover:bg-[#e8c55a] transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <UploadCloudIcon className="size-3.5" />
                {uploading
                  ? "Uploading…"
                  : `Upload ${stagedFiles.length === 1 ? "file" : `${stagedFiles.length} files`}`}
              </button>
            </div>

            {/* File rows */}
            <div className="divide-y divide-neutral-100">
              {stagedFiles.map((staged) => (
                <div key={staged.id} className="px-4 py-3">
                  {/* Top row: icon + filename + size + remove */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-neutral-400 shrink-0">{getFileIcon(staged.file)}</span>
                    <span className="flex-1 min-w-0 text-[13px] font-medium text-neutral-800 truncate">
                      {staged.file.name}
                    </span>
                    <span className="text-[11px] text-neutral-400 shrink-0">
                      {formatBytes(staged.file.size)}
                    </span>
                    <button
                      onClick={() => removeStaged(staged.id)}
                      aria-label={`Remove ${staged.file.name}`}
                      className="shrink-0 rounded-full p-0.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  {/* Bottom row: inline name + expiry inputs */}
                  <div className="flex items-center gap-2">
                    {/* Name */}
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        value={staged.name}
                        onChange={(e) => updateStaged(staged.id, "name", e.target.value)}
                        placeholder="Document name (optional)"
                        className="w-full h-8 rounded-[6px] border border-neutral-200 bg-neutral-50 pl-2.5 pr-2 text-[12px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 focus:bg-white transition-colors"
                      />
                    </div>

                    {/* Expiry */}
                    <div className="relative shrink-0">
                      <CalendarIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 size-3 text-neutral-400" />
                      <input
                        type="date"
                        value={staged.expiryDate}
                        onChange={(e) => updateStaged(staged.id, "expiryDate", e.target.value)}
                        title="Expiry date"
                        className="h-8 rounded-[6px] border border-neutral-200 bg-neutral-50 pl-6 pr-2 text-[12px] text-neutral-700 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 focus:bg-white transition-colors w-[148px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded documents table */}
        {documents.length > 0 ? (
          <div className="bg-background overflow-hidden rounded-md border">
            <Table>
              <TableHeader className="text-xs">
                <TableRow className="bg-white border-b border-neutral-100 hover:bg-white">
                  <TableHead className="h-9 py-2 text-neutral-500 font-medium">Name</TableHead>
                  <TableHead className="h-9 py-2 text-neutral-500 font-medium">Type</TableHead>
                  <TableHead className="h-9 py-2 text-neutral-500 font-medium">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3 opacity-70" />
                      Expiry
                    </span>
                  </TableHead>
                  <TableHead className="h-9 w-0 py-2 text-right text-neutral-500 font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[13px]">
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="max-w-64 py-2.5 font-medium">
                      <span className="flex items-center gap-2">
                        <FileTextIcon className="size-4 opacity-50 shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-2.5">
                      {doc.type
                        .split("_")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </TableCell>
                    <TableCell className="py-2.5">
                      {formatExpiry(doc.expiryDate)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right whitespace-nowrap">
                      {onPreview && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground/80 hover:text-foreground size-8 hover:bg-transparent"
                          aria-label={`Preview ${doc.name}`}
                          onClick={() => onPreview(doc)}
                          title="Preview"
                        >
                          <FileIcon className="size-4" />
                        </Button>
                      )}
                      {onDownload && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground/80 hover:text-foreground size-8 hover:bg-transparent"
                          aria-label={`Download ${doc.name}`}
                          onClick={() => onDownload(doc)}
                          title="Download"
                        >
                          <Download className="size-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive/80 hover:text-destructive size-8 hover:bg-transparent"
                          aria-label={`Delete ${doc.name}`}
                          onClick={() => handleDeleteClick(doc.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          stagedFiles.length === 0 && (
            <p className="text-neutral-400 text-center text-sm py-4">
              {emptyStateMessage}
            </p>
          )
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
