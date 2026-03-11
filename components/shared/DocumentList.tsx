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
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface DocumentListProps {
  documents: DocumentItem[];
  onPreview?: (document: DocumentItem) => void;
  onDownload?: (document: DocumentItem) => void;
  onDelete?: (documentId: string) => void;
  onUpload?: () => void;
  emptyStateMessage?: string;
  className?: string;
}

export function DocumentList({
  documents,
  onPreview,
  onDownload,
  onDelete,
  onUpload,
  emptyStateMessage = "No documents uploaded yet",
  className,
}: DocumentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

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

  const getTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      id: "bg-neutral-100 text-neutral-700",
      contract: "bg-neutral-100 text-neutral-800",
      certification: "bg-neutral-100 text-neutral-900",
      training: "bg-neutral-100 text-neutral-700",
      reference: "bg-neutral-100 text-neutral-600",
      other: "bg-neutral-100 text-neutral-700",
    };
    return typeColors[type] || typeColors.other;
  };

  const formatType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (documents.length === 0) {
    return (
      <div
        className={cn(
          "text-center py-12 px-4 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200",
          className
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
            <FileText className="h-6 w-6 text-neutral-400" />
          </div>
          <div>
            <h3 className="text-body-m font-medium text-neutral-700 mb-1">
              {emptyStateMessage}
            </h3>
            <p className="text-body-s text-neutral-500">
              Upload documents to get started
            </p>
          </div>
          {onUpload && (
            <Button size="sm" onClick={onUpload} className="mt-2">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-2", className)}>
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <FileText className="h-5 w-5 text-neutral-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-body-m font-medium text-neutral-900 truncate">
                  {doc.name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge
                    className={cn("text-[10px] font-medium", getTypeColor(doc.type))}
                  >
                    {formatType(doc.type)}
                  </Badge>
                  <span className="text-body-s text-neutral-500">
                    {doc.size} • {new Date(doc.uploadedDate).toLocaleDateString()}
                  </span>
                  {doc.expiryDate && (
                    <span className="text-body-s text-neutral-500">
                      • Expires {new Date(doc.expiryDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreview(doc)}
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(doc)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(doc.id)}
                  title="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
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
