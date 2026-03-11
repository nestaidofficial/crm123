"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Eye, Download, FileText, MoreHorizontal, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormSubmission {
  id: string;
  submittedBy: {
    name: string;
    id: string;
    role: string;
  };
  relatedTo: {
    type: "Employee" | "Client" | "Shift" | "Incident";
    name: string;
    id: string;
  };
  status: "Submitted" | "Reviewed";
  submittedOn: string;
  formName: string;
}

interface FormSubmissionsProps {
  formId: string;
  formName: string;
  submissions: FormSubmission[];
  onView: (submission: FormSubmission) => void;
  onDownloadPDF: (submission: FormSubmission) => void;
  onAddNote: (submission: FormSubmission) => void;
}

export function FormSubmissions({
  formId,
  formName,
  submissions,
  onView,
  onDownloadPDF,
  onAddNote,
}: FormSubmissionsProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredSubmissions = submissions.filter((submission) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        submission.submittedBy.name.toLowerCase().includes(query) ||
        submission.relatedTo.name.toLowerCase().includes(query) ||
        submission.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Submissions</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""} for {formName}
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-[50px]"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSubmissions.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Submitted By
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Related To
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider border-r">
                      Submitted On
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSubmissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-3 py-2 border-r">
                        <div>
                          <p className="text-xs font-medium">{submission.submittedBy.name}</p>
                          <p className="text-xs text-muted-foreground">{submission.submittedBy.role}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r">
                        <div>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-1">
                            {submission.relatedTo.type}
                          </Badge>
                          <p className="text-xs">{submission.relatedTo.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r">
                        <Badge
                          variant={submission.status === "Reviewed" ? "default" : "secondary"}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5",
                            submission.status === "Reviewed"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : ""
                          )}
                        >
                          {submission.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground border-r whitespace-nowrap">
                        {formatDate(submission.submittedOn)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(submission)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDownloadPDF(submission)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddNote(submission)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Add Note
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No submissions yet</p>
            <p className="text-xs mt-1">
              {searchQuery ? "Try a different search term" : "Submissions will appear here once the form is used"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
