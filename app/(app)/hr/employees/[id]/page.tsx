"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Home,
  Briefcase,
  DollarSign,
  UserCheck,
  Activity as ActivityIcon,
  Plus,
  X,
  Upload,
} from "lucide-react";
import { ProfileDetailCard } from "@/components/shared/ProfileDetailCard";
import { EmployeeProfileEditCard } from "@/components/hr/EmployeeProfileEditCard";
import { DocumentList, DocumentItem } from "@/components/shared/DocumentList";
import { ChecklistSection, ChecklistItem } from "@/components/shared/ChecklistSection";
import { useEmployeesStore } from "@/store/useEmployeesStore";
import type { Employee } from "@/lib/hr/mockEmployees";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";

function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    caregiver: "Caregiver",
    cna: "Certified Nursing Assistant (CNA)",
    hha: "Home Health Aide (HHA)",
    lpn: "Licensed Practical Nurse (LPN)",
    rn: "Registered Nurse (RN)",
    admin: "Administrative Staff",
    coordinator: "Care Coordinator",
  };
  return roleLabels[role] || role;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function EmployeeProfilePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  const [activeTab, setActiveTab] = useState("documents");
  const [isEditMode, setIsEditMode] = useState(false);

  const getEmployeeById = useEmployeesStore((state) => state.getEmployeeById);
  const hydrate = useEmployeesStore((state) => state.hydrate);
  const updateEmployee = useEmployeesStore((state) => state.updateEmployee);

  const [newSkillValue, setNewSkillValue] = useState("");
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentExpiry, setDocumentExpiry] = useState("");
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const employee = getEmployeeById(employeeId);

  const fetchDocuments = useCallback(async () => {
    if (!employeeId) return;
    setDocumentsLoading(true);
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/documents`);
      if (!res.ok) {
        setDocuments([]);
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setDocuments(
        list.map(
          (d: {
            id: string;
            name: string;
            type: string;
            size: string;
            uploadedDate: string;
            expiryDate?: string;
            complianceStepId?: string;
            url?: string;
          }) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            size: d.size,
            uploadedDate: d.uploadedDate,
            expiryDate: d.expiryDate,
            complianceStepId: d.complianceStepId,
            url: d.url,
          })
        )
      );
    } catch {
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    fetchDocuments();
  }, [employeeId, fetchDocuments]);

  if (!employee) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-h2 text-neutral-900 mb-2">Employee Not Found</h2>
          <p className="text-body-m text-neutral-500 mb-4">
            The employee you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => router.push("/hr")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to HR
          </Button>
        </div>
      </>
    );
  }

  const handleUploadDocument = async (name: string, expiry: string, files: File[]) => {
    if (!employeeId || files.length === 0 || !name.trim()) return;
    setDocumentsUploading(true);
    try {
      const formData = new FormData();
      formData.set("type", "other");
      formData.set("name", name.trim());
      if (expiry.trim()) formData.set("expiry", expiry.trim());
      files.forEach((f) => formData.append("files", f));
      const res = await apiFetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Upload failed");
      }
      setDocumentName("");
      setDocumentExpiry("");
      setSelectedDocumentFile(null);
      await fetchDocuments();
      toast.success("Document uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload documents");
    } finally {
      setDocumentsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!employeeId) return;
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/documents?documentId=${documentId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Delete failed");
      }
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      toast.success("Document deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete document");
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleEditSuccess = () => {
    setIsEditMode(false);
    toast.success("Employee updated successfully");
  };

  const handleCall = () => {
    console.log("Call employee");
  };

  const handleEmail = () => {
    console.log("Email employee");
  };

  const handleSMS = () => {
    console.log("SMS employee");
  };

  // Build detail sections for ProfileDetailCard
  const detailSections: Array<{
    title?: string;
    rows: Array<{
      icon: React.ReactNode;
      label: string;
      value: React.ReactNode;
    }>;
  }> = [];

  // Personal Information Section
  const personalRows: Array<{
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
  }> = [
    {
      icon: <User className="h-4 w-4 text-neutral-400" />,
      label: "Full Name",
      value: `${employee.firstName} ${employee.lastName}`,
    },
  ];

  if (employee.dob) {
    personalRows.push({
      icon: <Calendar className="h-4 w-4 text-neutral-400" />,
      label: "Date of Birth",
      value: new Date(employee.dob).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    });
  }

  if (employee.ssn) {
    personalRows.push({
      icon: <User className="h-4 w-4 text-neutral-400" />,
      label: "SSN",
      value: employee.ssn,
    });
  }

  personalRows.push(
    {
      icon: <Phone className="h-4 w-4 text-neutral-400" />,
      label: "Phone Number",
      value: employee.phone,
    },
    {
      icon: <Mail className="h-4 w-4 text-neutral-400" />,
      label: "Email",
      value: employee.email,
    }
  );

  if (employee.workAuthorization) {
    personalRows.push({
      icon: <User className="h-4 w-4 text-neutral-400" />,
      label: "Work Authorization",
      value: employee.workAuthorization,
    });
  }

  personalRows.push({
    icon: <Home className="h-4 w-4 text-neutral-400" />,
    label: "Mailing Address",
    value: (
      <div>
        <div>{employee.address.street}</div>
        <div>
          {employee.address.city}, {employee.address.state} {employee.address.zip}
        </div>
      </div>
    ),
  });

  detailSections.push({
    rows: personalRows,
  });

  // Emergency Contact Section
  detailSections.push({
    rows: [
      {
        icon: <ActivityIcon className="h-4 w-4 text-neutral-400" />,
        label: "Emergency Contact",
        value: (
          <div>
            <div className="font-medium">{employee.emergencyContact.name}</div>
            <div className="text-body-s text-neutral-500">
              {employee.emergencyContact.phone}
            </div>
          </div>
        ),
      },
    ],
  });

  // Employment Details Section
  const employmentRows = [
    {
      icon: <Briefcase className="h-4 w-4 text-neutral-400" />,
      label: "Role",
      value: getRoleLabel(employee.role),
    },
  ];

  // Add services row only for caregivers
  if (employee.role === "caregiver" && employee.services && employee.services.length > 0) {
    employmentRows.push({
      icon: <UserCheck className="h-4 w-4 text-neutral-400" />,
      label: "Services",
      value: (
        <div className="flex flex-wrap gap-1">
          {employee.services.map((service) => (
            <Badge key={service.id} variant="secondary" className="text-xs">
              {service.name}
            </Badge>
          ))}
        </div>
      ),
    });
  }

  employmentRows.push(
    {
      icon: <Briefcase className="h-4 w-4 text-neutral-400" />,
      label: "Department",
      value: employee.department,
    },
    {
      icon: <UserCheck className="h-4 w-4 text-neutral-400" />,
      label: "Supervisor",
      value: employee.supervisor,
    },
    {
      icon: <Calendar className="h-4 w-4 text-neutral-400" />,
      label: "Start Date",
      value: new Date(employee.startDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
    {
      icon: <DollarSign className="h-4 w-4 text-neutral-400" />,
      label: "Pay Rate",
      value:
        employee.payType === "salary"
          ? `$${employee.payRate.toLocaleString()}/year`
          : `$${employee.payRate}/hour`,
    },
    {
      icon: <DollarSign className="h-4 w-4 text-neutral-400" />,
      label: "Pay Type",
      value: employee.payType.charAt(0).toUpperCase() + employee.payType.slice(1),
    }
  );

  detailSections.push({
    title: "Employment Details",
    rows: employmentRows,
  });

  return (
    <>
      <div className="bg-neutral-50 -m-6 p-6 min-h-screen">
        {/* CRM-Style Split Layout */}
        <div className="flex gap-6 items-start">
          {/* Left Panel - Profile Detail Card or Inline Edit */}
          {isEditMode ? (
            <EmployeeProfileEditCard
              employee={employee}
              onCancel={() => setIsEditMode(false)}
              onSuccess={handleEditSuccess}
            />
          ) : (
          <ProfileDetailCard
            avatarUrl={employee.avatar}
            avatarFallback={getInitials(employee.firstName, employee.lastName)}
            name={`${employee.firstName} ${employee.lastName}`}
            shortId={employee.shortId ?? undefined}
            subtitle={`${getRoleLabel(employee.role)} • ${employee.department}`}
            badges={[
              {
                label: employee.status.charAt(0).toUpperCase() + employee.status.slice(1),
                variant:
                  employee.status === "active"
                    ? "default"
                    : employee.status === "onboarding"
                    ? "secondary"
                    : "outline",
              },
            ]}
            statusPill={{
              label:
                employee.status === "active"
                  ? "Active"
                  : employee.status === "onboarding"
                  ? "Onboarding"
                  : "Inactive",
              className:
                employee.status === "active"
                  ? "bg-neutral-100 text-neutral-900"
                  : employee.status === "onboarding"
                  ? "bg-neutral-100 text-neutral-700"
                  : "bg-neutral-200 text-neutral-900",
            }}
            metadata={[
              {
                label: "Registered",
                value: new Date(employee.startDate).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
              },
              {
                label: "Last Active",
                value: "1 month ago",
              },
            ]}
            onEdit={handleEdit}
            onPhoneCall={handleCall}
            onEmail={handleEmail}
            onSMS={handleSMS}
            detailSections={detailSections}
          />
          )}

          {/* Right Panel - Tabs */}
          <div className="flex-1 min-w-0 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tab Header with Activity Filters */}
              <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
                <TabsList className="flex w-full justify-start mb-4 h-auto bg-transparent border-b border-neutral-200 rounded-none p-0 gap-6">
                  <TabsTrigger
                    value="documents"
                    className="text-body-s bg-transparent border-b-2 border-transparent rounded-none px-0 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-neutral-900"
                  >
                    Documents
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="text-body-s bg-transparent border-b-2 border-transparent rounded-none px-0 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-neutral-900"
                  >
                    Notes
                  </TabsTrigger>
                  <TabsTrigger
                    value="skills"
                    className="text-body-s bg-transparent border-b-2 border-transparent rounded-none px-0 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-neutral-900"
                  >
                    Skills
                  </TabsTrigger>
                  <TabsTrigger
                    value="onboarding"
                    className="text-body-s bg-transparent border-b-2 border-transparent rounded-none px-0 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-neutral-900"
                  >
                    Onboarding
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-0">
                <Card className="border-0 bg-white rounded-2xl shadow-card">
                  <CardHeader>
                    <CardTitle className="text-h2 text-neutral-900">
                      Upload Documents
                    </CardTitle>
                    <p className="text-body-s text-neutral-500">
                      Upload ID, contracts, certifications, and training documents
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="doc-name" className="text-body-s font-medium text-neutral-700">
                        Document name
                      </label>
                      <Input
                        id="doc-name"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        placeholder="e.g. CNA Certification, Driver License"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="doc-expiry" className="text-body-s font-medium text-neutral-700">
                        Expiry date <span className="text-neutral-400 font-normal">(optional)</span>
                      </label>
                      <Input
                        id="doc-expiry"
                        type="date"
                        value={documentExpiry}
                        onChange={(e) => setDocumentExpiry(e.target.value)}
                        className="max-w-xs text-neutral-700 [color-scheme:light]"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-body-s font-medium text-neutral-700">File</span>
                      <div
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingDoc(true);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDraggingDoc(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingDoc(false);
                          const f = e.dataTransfer.files[0];
                          if (f) setSelectedDocumentFile(f);
                        }}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors max-w-md ${
                          isDraggingDoc ? "border-primary-500 bg-primary-500/5" : "border-neutral-200 bg-neutral-50"
                        }`}
                      >
                        <p className="text-body-s text-neutral-600 mb-2">
                          {selectedDocumentFile
                            ? selectedDocumentFile.name
                            : "Drop a file here or click to choose"}
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,.txt,.csv"
                          className="hidden"
                          id="employee-doc-file"
                          onChange={(e) => setSelectedDocumentFile(e.target.files?.[0] ?? null)}
                        />
                        <label htmlFor="employee-doc-file">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>Choose File</span>
                          </Button>
                        </label>
                      </div>
                    </div>
                    <Button
                      disabled={!documentName.trim() || !selectedDocumentFile || documentsUploading}
                      onClick={() =>
                        selectedDocumentFile &&
                        handleUploadDocument(documentName, documentExpiry, [selectedDocumentFile])
                      }
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {documentsUploading ? "Uploading…" : "Upload Document"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-white rounded-2xl shadow-card">
                  <CardHeader>
                    <CardTitle className="text-h2 text-neutral-900">
                      Document Library
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentList
                      documents={documents}
                      onDelete={handleDeleteDocument}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="mt-0">
                <Card className="border-0 bg-white rounded-2xl shadow-card">
                  <CardHeader>
                    <CardTitle className="text-h2 text-neutral-900">
                      Skills
                    </CardTitle>
                    <p className="text-body-s text-neutral-500">
                      Add and manage skills for this employee
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      {(employee.skills ?? []).map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="rounded-full px-3 py-1.5 text-body-s font-normal bg-neutral-100 text-neutral-800 hover:bg-neutral-200 gap-1 pr-1.5"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => {
                              const next = (employee.skills ?? []).filter((s) => s !== skill);
                              updateEmployee(employeeId, { skills: next });
                            }}
                            className="rounded-full p-0.5 hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                            aria-label={`Remove ${skill}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {showAddSkill ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newSkillValue}
                            onChange={(e) => setNewSkillValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const trimmed = newSkillValue.trim();
                                if (trimmed && !(employee.skills ?? []).includes(trimmed)) {
                                  updateEmployee(employeeId, {
                                    skills: [...(employee.skills ?? []), trimmed],
                                  });
                                  setNewSkillValue("");
                                  setShowAddSkill(false);
                                }
                              }
                              if (e.key === "Escape") {
                                setShowAddSkill(false);
                                setNewSkillValue("");
                              }
                            }}
                            placeholder="Add skill..."
                            className="w-36 h-8 text-body-s"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const trimmed = newSkillValue.trim();
                              if (trimmed && !(employee.skills ?? []).includes(trimmed)) {
                                updateEmployee(employeeId, {
                                  skills: [...(employee.skills ?? []), trimmed],
                                });
                                setNewSkillValue("");
                                setShowAddSkill(false);
                              }
                            }}
                          >
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowAddSkill(false);
                              setNewSkillValue("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full h-8 w-8 p-0 border-dashed border-neutral-300"
                          onClick={() => setShowAddSkill(true)}
                          aria-label="Add skill"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!(employee.skills ?? []).length && !showAddSkill && (
                      <p className="text-body-s text-neutral-500">
                        No skills added yet. Click the + button to add one.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="mt-0">
                <Card className="border-0 bg-white rounded-2xl shadow-card">
                  <CardHeader>
                    <CardTitle className="text-h2 text-neutral-900">
                      Internal Notes
                    </CardTitle>
                    <p className="text-body-s text-neutral-500">
                      Add notes about this employee (visible to admins only)
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {employee.notes ? (
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                        <p className="text-body-m text-neutral-900">{employee.notes}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 px-4 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200">
                        <p className="text-body-m text-neutral-500">No notes yet</p>
                      </div>
                    )}
                    <div>
                      <Textarea
                        placeholder="Add a note..."
                        className="min-h-[120px]"
                      />
                      <Button className="mt-2">Save Note</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Onboarding Tab */}
              <TabsContent value="onboarding" className="mt-0">
                <Card className="border-0 bg-white rounded-2xl shadow-card">
                  <CardHeader>
                    <CardTitle className="text-h2 text-neutral-900">
                      Onboarding Checklist
                    </CardTitle>
                    <p className="text-body-s text-neutral-500">
                      Track required forms and verification
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ChecklistSection items={[
                      {
                        id: "application",
                        name: "Employment Application",
                        status: employee.status === "active" || employee.status === "onboarding" ? "complete" : "pending",
                        completedDate: employee.status === "active" || employee.status === "onboarding" ? employee.startDate : undefined,
                      },
                      {
                        id: "i9",
                        name: "I-9 Verification",
                        status: employee.status === "active" ? "complete" : "pending",
                        completedDate: employee.status === "active" ? employee.startDate : undefined,
                      },
                      {
                        id: "w4",
                        name: "W-4 Tax Form",
                        status: employee.status === "active" ? "complete" : "pending",
                        completedDate: employee.status === "active" ? employee.startDate : undefined,
                      },
                      {
                        id: "background",
                        name: "Background Check",
                        status: employee.status === "active" ? "complete" : "pending",
                      },
                      {
                        id: "training",
                        name: "Training Completion",
                        status: employee.status === "active" ? "complete" : "pending",
                      },
                      {
                        id: "direct_deposit",
                        name: "Direct Deposit Setup",
                        status: employee.bankAccount ? "complete" : "pending",
                      },
                      {
                        id: "emergency_contact",
                        name: "Emergency Contact Verified",
                        status: employee.emergencyContact?.name ? "complete" : "pending",
                        completedDate: employee.emergencyContact?.name ? employee.startDate : undefined,
                      },
                    ]} showProgress={true} />
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
