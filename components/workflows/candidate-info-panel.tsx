"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Clock,
  FileText,
  Upload,
  Download,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateDocument, ActivityLogEntry } from "@/types/candidate";

interface CandidateInfoPanelProps {
  missingItems: string[];
  activityLog: ActivityLogEntry[];
  documents: CandidateDocument[];
  onUploadDocument?: () => void;
  onViewHistory?: () => void;
}

export function CandidateInfoPanel({
  missingItems = [],
  activityLog = [],
  documents = [],
  onUploadDocument,
  onViewHistory,
}: CandidateInfoPanelProps) {
  // Show only recent 5 activity items
  const recentActivity = activityLog.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Missing Items Card */}
      <Card className="border-neutral-200/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-sm font-semibold text-neutral-900">
              Missing Items
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {missingItems.length === 0 ? (
            <p className="text-xs text-neutral-500 italic py-2">
              All items completed
            </p>
          ) : (
            missingItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs text-neutral-700 py-1"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span>{item}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Activity Log Card */}
      <Card className="border-neutral-200/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-neutral-500" />
              <CardTitle className="text-sm font-semibold text-neutral-900">
                Activity Log
              </CardTitle>
            </div>
            {onViewHistory && activityLog.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewHistory}
                className="h-7 px-2 text-xs text-neutral-500 hover:text-neutral-900"
              >
                <History className="h-3 w-3 mr-1" />
                History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-xs text-neutral-500 italic py-2">
              No activity yet
            </p>
          ) : (
            recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-900 font-medium">
                    {entry.action}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {entry.description}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    {new Date(entry.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Document Vault Card */}
      <Card className="border-neutral-200/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-neutral-500" />
              <CardTitle className="text-sm font-semibold text-neutral-900">
                Document Vault
              </CardTitle>
            </div>
            {onUploadDocument && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onUploadDocument}
                className="h-7 px-2 text-xs text-neutral-500 hover:text-neutral-900"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-neutral-100 mb-2">
                <FileText className="h-5 w-5 text-neutral-400" />
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                No documents uploaded yet
              </p>
              {onUploadDocument && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUploadDocument}
                  className="h-8 text-xs"
                >
                  <Upload className="h-3 w-3 mr-1.5" />
                  Upload Document
                </Button>
              )}
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-900 truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-neutral-500">
                      {doc.size}
                    </p>
                    <span className="text-neutral-300">•</span>
                    <p className="text-[10px] text-neutral-500">
                      {new Date(doc.uploadedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                {doc.status && (
                  <Badge
                    variant={
                      doc.status === 'verified'
                        ? 'positive'
                        : doc.status === 'rejected'
                        ? 'negative'
                        : 'secondary'
                    }
                    className="text-[10px] shrink-0"
                  >
                    {doc.status}
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
