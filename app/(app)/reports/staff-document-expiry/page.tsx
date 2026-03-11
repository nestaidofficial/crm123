"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Download,
  Eye,
  Upload,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReportRow {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    role: string;
  };
  document: {
    id: string;
    name: string;
    type: string;
    expiryDate?: string;
    uploadedAt: string;
    url?: string;
  };
}

function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    caregiver: "Caregiver",
    cna: "CNA",
    hha: "HHA",
    lpn: "LPN",
    rn: "RN",
    admin: "Admin",
    coordinator: "Coordinator",
    other: "Other",
  };
  return roleLabels[role] || role;
}

function getDocumentTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    id: "ID",
    contract: "Contract",
    certification: "Certification",
    training: "Training",
    reference: "Reference",
    other: "Other",
  };
  return typeLabels[type] || type;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateDaysLeft(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getDaysLeftBadge(daysLeft: number | null) {
  if (daysLeft === null) {
    return (
      <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200">
        —
      </Badge>
    );
  }
  if (daysLeft < 0) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200">
        {daysLeft} days
      </Badge>
    );
  }
  if (daysLeft <= 30) {
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200">
        {daysLeft} days
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-700 border-green-200">
      {daysLeft} days
    </Badge>
  );
}

export default function StaffDocumentExpiryPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [expiryStatus, setExpiryStatus] = useState("all");
  const [role, setRole] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type !== "all") params.set("type", type);
      if (expiryStatus !== "all") params.set("expiryStatus", expiryStatus);
      if (role !== "all") params.set("role", role);

      const res = await fetch(`/api/reports/staff-document-expiry?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Failed to fetch report");
      }
      const json = await res.json();
      setData(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load report");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [search, type, expiryStatus, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDocument = (url?: string) => {
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("Document URL not available");
    }
  };

  const handleDownloadDocument = (url?: string, name?: string) => {
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "document";
      a.click();
    } else {
      toast.error("Document URL not available");
    }
  };

  const handleRequestNewUpload = (employeeId: string) => {
    router.push(`/hr/employees/${employeeId}#documents`);
    toast.info("Navigate to employee's Documents tab to request new upload");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/reports")}
          className="h-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>
      </div>

      <div>
        <h1 className="text-[16px] font-semibold text-neutral-900">
          Staff Document Expiry Report
        </h1>
        <p className="text-[12px] text-neutral-500 font-normal mt-0.5">
          Track staff documents that are expiring or have expired
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-neutral-700">
              Search Staff
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-neutral-700">
              Document Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All</option>
              <option value="id">ID</option>
              <option value="contract">Contract</option>
              <option value="certification">Certification</option>
              <option value="training">Training</option>
              <option value="reference">Reference</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Expiry Status */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-neutral-700">
              Expiry Status
            </label>
            <select
              value={expiryStatus}
              onChange={(e) => setExpiryStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All</option>
              <option value="overdue">Overdue</option>
              <option value="7">Expiring in 7 days</option>
              <option value="30">Expiring in 30 days</option>
              <option value="60">Expiring in 60 days</option>
            </select>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-neutral-700">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All</option>
              <option value="caregiver">Caregiver</option>
              <option value="cna">CNA</option>
              <option value="hha">HHA</option>
              <option value="lpn">LPN</option>
              <option value="rn">RN</option>
              <option value="admin">Admin</option>
              <option value="coordinator">Coordinator</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-[14px] text-neutral-500">
              No documents match the current filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-black/5 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Document Name
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Days Left
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Uploaded On
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const daysLeft = calculateDaysLeft(row.document.expiryDate);
                  return (
                    <tr
                      key={`${row.employee.id}-${row.document.id}`}
                      className={cn(
                        "border-b border-neutral-100 hover:bg-neutral-50 transition-colors",
                        idx === data.length - 1 && "border-b-0"
                      )}
                    >
                      {/* Staff */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={row.employee.avatarUrl} />
                            <AvatarFallback className="text-[10px] bg-neutral-200 text-neutral-700">
                              {getInitials(row.employee.firstName, row.employee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[13px] font-medium text-neutral-900">
                              {row.employee.firstName} {row.employee.lastName}
                            </p>
                            <p className="text-[11px] text-neutral-500">
                              {getRoleLabel(row.employee.role)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Document Type */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-neutral-700">
                          {getDocumentTypeLabel(row.document.type)}
                        </span>
                      </td>

                      {/* Document Name */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleViewDocument(row.document.url)}
                          className="text-[13px] text-blue-600 hover:text-blue-700 hover:underline text-left"
                        >
                          {row.document.name}
                        </button>
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-neutral-700">
                          {row.document.expiryDate
                            ? formatDate(row.document.expiryDate)
                            : "No expiry"}
                        </span>
                      </td>

                      {/* Days Left */}
                      <td className="px-4 py-3">{getDaysLeftBadge(daysLeft)}</td>

                      {/* Uploaded On */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-neutral-700">
                          {formatDate(row.document.uploadedAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(row.document.url)}
                            title="View"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDownloadDocument(row.document.url, row.document.name)
                            }
                            title="Download"
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequestNewUpload(row.employee.id)}
                            title="Request new upload"
                            className="h-8 w-8 p-0"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
