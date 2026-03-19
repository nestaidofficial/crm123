"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Mail,
  Link2,
  Check,
  FileUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPremadeForms } from "@/components/forms/premade-forms";

interface SendFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stepTitle: string;
  candidateName: string;
  candidateEmail: string;
  onSend: (formData: { type: 'system' | 'pdf'; formId?: string; fileName?: string; file?: File }) => void;
}

export function SendFormDialog({
  isOpen,
  onClose,
  stepTitle,
  candidateName,
  candidateEmail,
  onSend,
}: SendFormDialogProps) {
  const [activeTab, setActiveTab] = useState<"system" | "pdf">("system");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const systemForms = getPremadeForms();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadedFile(file);
    } else {
      toast.error("Please upload a PDF file");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadedFile(file);
    } else {
      toast.error("Please upload a PDF file");
    }
  };

  const handleSendEmail = () => {
    if (activeTab === "system" && !selectedFormId) {
      toast.error("Please select a form");
      return;
    }
    if (activeTab === "pdf" && !uploadedFile) {
      toast.error("Please upload a PDF file");
      return;
    }

    if (activeTab === "system") {
      onSend({ type: 'system', formId: selectedFormId! });
    } else {
      onSend({ type: 'pdf', fileName: uploadedFile!.name, file: uploadedFile! });
    }

    toast.success(`Form sent to ${candidateName} at ${candidateEmail}`);
    handleClose();
  };

  const handleCopyLink = () => {
    if (activeTab === "system" && !selectedFormId) {
      toast.error("Please select a form");
      return;
    }

    const mockLink = `https://nessacrm.com/forms/${selectedFormId || 'upload'}`;
    navigator.clipboard.writeText(mockLink);
    toast.success("Link copied to clipboard");
  };

  const handleClose = () => {
    setSelectedFormId(null);
    setUploadedFile(null);
    setActiveTab("system");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-neutral-900">
            Send Form for {stepTitle}
          </DialogTitle>
          <p className="text-sm text-neutral-500 mt-1">
            Send to {candidateName} ({candidateEmail})
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "system" | "pdf")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="system" className="gap-2">
              <FileText className="h-4 w-4" />
              System Forms
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="mt-4 space-y-3">
            <div className="text-sm text-neutral-600 mb-3">
              Select a form from your system library
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {systemForms.map((form) => (
                <button
                  key={form.id}
                  onClick={() => setSelectedFormId(form.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
                    selectedFormId === form.id
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                      selectedFormId === form.id
                        ? "border-neutral-900 bg-neutral-900"
                        : "border-neutral-300"
                    )}
                  >
                    {selectedFormId === form.id && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-neutral-900">
                        {form.name}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {form.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {form.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pdf" className="mt-4 space-y-4">
            <div className="text-sm text-neutral-600 mb-3">
              Upload a traditional PDF form
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                isDragging
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-white"
              )}
            >
              {uploadedFile ? (
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-neutral-900 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-neutral-900">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-neutral-100 mb-3">
                    <FileUp className="h-6 w-6 text-neutral-500" />
                  </div>
                  <p className="text-sm font-medium text-neutral-900 mb-1">
                    Drop your PDF here, or browse
                  </p>
                  <p className="text-xs text-neutral-500 mb-4">
                    Maximum file size: 10MB
                  </p>
                  <Label htmlFor="pdf-upload">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium cursor-pointer hover:bg-neutral-800 transition-colors">
                      <Upload className="h-4 w-4" />
                      Browse Files
                    </span>
                  </Label>
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="flex-1 gap-2"
            disabled={activeTab === "system" ? !selectedFormId : !uploadedFile}
          >
            <Link2 className="h-4 w-4" />
            Copy Link
          </Button>
          <Button
            onClick={handleSendEmail}
            className="flex-1 gap-2 bg-neutral-900 hover:bg-neutral-800"
            disabled={activeTab === "system" ? !selectedFormId : !uploadedFile}
          >
            <Mail className="h-4 w-4" />
            Send via Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
