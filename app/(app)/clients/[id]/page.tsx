"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Users as UsersIcon,
  FileText,
  Heart,
  Stethoscope,
  Activity as ActivityIcon,
  Clock,
  Home,
  UserCheck,
} from "lucide-react";
import { ProfileDetailCard } from "@/components/shared/ProfileDetailCard";
import { DocumentUploader, FileWithMeta } from "@/components/shared/DocumentUploader";
import { DocumentList, DocumentItem } from "@/components/shared/DocumentList";
import { ChecklistSection, ChecklistItem } from "@/components/shared/ChecklistSection";
import { ClientEditSheet } from "@/components/clients/ClientEditSheet";
import { ClientProfileEditCard } from "@/components/clients/ClientProfileEditCard";
import { ClientInsuranceTab } from "@/components/clients/client-insurance-tab";
import { useClientsStore } from "@/store/useClientsStore";
import type { SavedClient } from "@/lib/clients/schema";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface Guardian {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

/** Family member row: either primary contact (from client) or additional guardian */
interface FamilyMember extends Guardian {
  isPrimary?: boolean;
}

export default function ClientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [activeTab, setActiveTab] = useState("family");
  const [guardianDialogOpen, setGuardianDialogOpen] = useState(false);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardiansLoading, setGuardiansLoading] = useState(false);
  const [guardianSaving, setGuardianSaving] = useState(false);
  const [newGuardian, setNewGuardian] = useState<Partial<Guardian>>({});
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);

  const clients = useClientsStore((state) => state.clients);
  const hydrated = useClientsStore((state) => state.hydrated);
  const hydrate = useClientsStore((state) => state.hydrate);
  const loadClient = useClientsStore((state) => state.loadClient);
  const deleteClient = useClientsStore((state) => state.deleteClient);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const [loadingProfile, setLoadingProfile] = useState(false);
  useEffect(() => {
    const list = clients ?? [];
    if (hydrated && !list.find((p) => p.id === clientId)) {
      setLoadingProfile(true);
      loadClient(clientId).finally(() => setLoadingProfile(false));
    }
  }, [hydrated, clientId, clients, loadClient]);

  const client = (clients ?? []).find((p) => p.id === clientId);

  // Fetch guardians from DB when client is available
  useEffect(() => {
    if (!clientId) return;
    setGuardiansLoading(true);
    fetch(`/api/clients/${clientId}/guardians`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        const list = Array.isArray(json?.data) ? json.data : [];
        setGuardians(list.map((g: { id: string; name: string; relationship: string; phone: string; email?: string }) => ({
          id: g.id,
          name: g.name,
          relationship: g.relationship,
          phone: g.phone,
          email: g.email,
        })));
      })
      .catch(() => setGuardians([]))
      .finally(() => setGuardiansLoading(false));
  }, [clientId]);

  const fetchDocuments = useCallback(async () => {
    if (!clientId) return;
    setDocumentsLoading(true);
    try {
      const res = await apiFetch(`/api/clients/${clientId}/documents`);
      if (!res.ok) {
        setDocuments([]);
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setDocuments(
        list.map((d: { id: string; name: string; type: string; size: string; uploadedDate: string; url?: string }) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          size: d.size,
          uploadedDate: d.uploadedDate,
          url: d.url,
        }))
      );
    } catch {
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    fetchDocuments();
  }, [clientId, fetchDocuments]);

  // Family Members & Guardians: all from client_guardians (primary has isPrimary=true from add-client)
  const familyMembers: FamilyMember[] = guardians.map((g) => ({
    ...g,
    isPrimary: g.isPrimary === true,
  }));

  // Mock onboarding checklist
  const onboardingChecklist: ChecklistItem[] = [
    {
      id: "intake",
      name: "Intake Form Completed",
      status: "complete",
      completedDate: new Date().toISOString(),
    },
    {
      id: "careplan",
      name: "Care Plan Signed",
      status: "complete",
      completedDate: new Date().toISOString(),
    },
    {
      id: "insurance",
      name: "Insurance Verification",
      status: "pending",
    },
    {
      id: "emergency",
      name: "Emergency Contacts Verified",
      status: "complete",
      completedDate: new Date().toISOString(),
    },
    {
      id: "safety",
      name: "Home Safety Assessment",
      status: "pending",
    },
    {
      id: "hipaa",
      name: "HIPAA Consent Signed",
      status: "complete",
      completedDate: new Date().toISOString(),
    },
  ];

  if (!client) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16">
          {loadingProfile ? (
            <p className="text-body-m text-neutral-500">Loading client…</p>
          ) : (
            <>
              <h2 className="text-h2 text-neutral-900 mb-2">Client Not Found</h2>
              <p className="text-body-m text-neutral-500 mb-4">
                The client you&apos;re looking for doesn&apos;t exist.
              </p>
            </>
          )}
        </div>
      </>
    );
  }

  const handleUploadDocument = async (files: FileWithMeta[]) => {
    if (!clientId || files.length === 0) return;
    setDocumentsUploading(true);
    try {
      const formData = new FormData();
      formData.set("type", "other");
      files.forEach(({ file }) => formData.append("files", file));
      formData.set(
        "metadata",
        JSON.stringify(files.map(({ name, expiryDate }) => ({ name, expiryDate: expiryDate || undefined })))
      );
      const res = await apiFetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Upload failed");
      }
      await fetchDocuments();
      toast.success(`${files.length} document${files.length > 1 ? "s" : ""} uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload documents");
    } finally {
      setDocumentsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!clientId) return;
    try {
      const res = await apiFetch(`/api/clients/${clientId}/documents/${documentId}`, { method: "DELETE" });
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
    setIsEditSheetOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteClient(clientId);
      toast.success("Client archived successfully");
      router.push("/clients");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete client");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditSheetOpen(false);
    hydrate();
  };

  const handleCall = () => {
    console.log("Call client");
  };

  const handleEmail = () => {
    console.log("Email client");
  };

  const handleSMS = () => {
    console.log("SMS client");
  };

  const handleAddGuardian = async () => {
    if (!newGuardian.name?.trim() || !newGuardian.relationship?.trim() || !newGuardian.phone?.trim() || !clientId) return;
    setGuardianSaving(true);
    try {
      const res = await apiFetch(`/api/clients/${clientId}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGuardian.name.trim(),
          relationship: newGuardian.relationship.trim(),
          phone: newGuardian.phone.trim(),
          email: newGuardian.email?.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Failed to add guardian");
      }
      const json = await res.json();
      const created = (json as { data: Guardian }).data;
      setGuardians((prev) => [...prev, created]);
      setNewGuardian({});
      setGuardianDialogOpen(false);
      toast.success("Guardian added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add guardian");
    } finally {
      setGuardianSaving(false);
    }
  };

  const handleDeleteGuardian = async (guardianId: string) => {
    if (!clientId) return;
    try {
      const res = await apiFetch(`/api/clients/${clientId}/guardians/${guardianId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Failed to remove guardian");
      }
      setGuardians((prev) => prev.filter((g) => g.id !== guardianId));
      toast.success("Guardian removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove guardian");
    }
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
  detailSections.push({
    rows: [
      {
        icon: <User className="h-4 w-4 text-neutral-400" />,
        label: "Gender",
        value: client.gender,
      },
      {
        icon: <Calendar className="h-4 w-4 text-neutral-400" />,
        label: "Date of Birth",
        value: new Date(client.dob).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      },
      {
        icon: <Phone className="h-4 w-4 text-neutral-400" />,
        label: "Phone Number",
        value: client.phone,
      },
      ...(client.email
        ? [
            {
              icon: <Mail className="h-4 w-4 text-neutral-400" />,
              label: "Email",
              value: client.email,
            },
          ]
        : []),
      {
        icon: <Home className="h-4 w-4 text-neutral-400" />,
        label: "Mailing Address",
        value: (
          <div>
            <div>{client.address.street}</div>
            <div>
              {client.address.city}, {client.address.state} {client.address.zip}
            </div>
          </div>
        ),
      },
    ],
  });

  // Primary Contact Section
  detailSections.push({
    rows: [
      {
        icon: <UserCheck className="h-4 w-4 text-neutral-400" />,
        label: "Primary Contact",
        value: (
          <div>
            <div className="font-medium">{client.primaryContact.name}</div>
            <div className="text-body-s text-neutral-500">
              {client.primaryContact.relation}
            </div>
            <div className="text-body-s text-neutral-500">
              {client.primaryContact.phone}
            </div>
          </div>
        ),
      },
    ],
  });

  // Emergency Contact Section
  detailSections.push({
    rows: [
      {
        icon: <ActivityIcon className="h-4 w-4 text-neutral-400" />,
        label: "Emergency Contact",
        value: (
          <div>
            <div className="font-medium">{client.emergencyContact.name}</div>
            {client.emergencyContact.relation && (
              <div className="text-body-s text-neutral-500">
                {client.emergencyContact.relation}
              </div>
            )}
            <div className="text-body-s text-neutral-500">
              {client.emergencyContact.phone}
            </div>
          </div>
        ),
      },
    ],
  });

  // Services Section
  if (client.services && client.services.length > 0) {
    detailSections.push({
      title: "Services",
      rows: [
        {
          icon: <Heart className="h-4 w-4 text-neutral-400" />,
          label: "Services",
          value: (
            <div className="flex flex-wrap gap-1">
              {client.services.map((service) => (
                <Badge key={service.id} variant="secondary" className="text-xs">
                  {service.name}
                </Badge>
              ))}
            </div>
          ),
        },
      ],
    });
  }

  // Care Plan Section (Medical)
  if (client.careType === "medical" && "diagnosis" in client) {
    const carePlanRows: Array<{
      icon: React.ReactNode;
      label: string;
      value: React.ReactNode;
    }> = [
      {
        icon: <Stethoscope className="h-4 w-4 text-neutral-400" />,
        label: "Diagnosis",
        value: client.diagnosis,
      },
      {
        icon: <User className="h-4 w-4 text-neutral-400" />,
        label: "Physician",
        value: (
          <div>
            <div className="font-medium">{client.physicianName}</div>
            <div className="text-body-s text-neutral-500">{client.physicianPhone}</div>
          </div>
        ),
      },
    ];

    if (client.medications && client.medications.length > 0) {
      carePlanRows.push({
        icon: <FileText className="h-4 w-4 text-neutral-400" />,
        label: "Medications",
        value: (
          <div className="space-y-1">
            {client.medications.map((med, idx) => (
              <div key={idx} className="text-body-s">
                <span className="font-medium">{med.name}</span> - {med.dose},{" "}
                {med.frequency}
              </div>
            ))}
          </div>
        ),
      });
    }

    if (client.skilledServices && client.skilledServices.length > 0) {
      carePlanRows.push({
        icon: <Heart className="h-4 w-4 text-neutral-400" />,
        label: "Skilled Services",
        value: (
          <div className="flex flex-wrap gap-1">
            {client.skilledServices.map((service, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {service}
              </Badge>
            ))}
          </div>
        ),
      });
    }

    detailSections.push({
      title: "Medical Care Plan",
      rows: carePlanRows,
    });
  }

  // Care Plan Section (Non-Medical)
  if (client.careType === "non_medical" && "adlNeeds" in client) {
    const carePlanRows: Array<{
      icon: React.ReactNode;
      label: string;
      value: React.ReactNode;
    }> = [];

    if (client.adlNeeds && client.adlNeeds.length > 0) {
      carePlanRows.push({
        icon: <Heart className="h-4 w-4 text-neutral-400" />,
        label: "ADL Needs",
        value: (
          <div className="flex flex-wrap gap-1">
            {client.adlNeeds.map((need, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {need}
              </Badge>
            ))}
          </div>
        ),
      });
    }

    if (client.schedulePreferences) {
      carePlanRows.push({
        icon: <Clock className="h-4 w-4 text-neutral-400" />,
        label: "Schedule",
        value: (
          <div className="text-body-s space-y-1">
            <div>
              <span className="font-medium">Days:</span>{" "}
              {client.schedulePreferences.daysOfWeek.join(", ")}
            </div>
            <div>
              <span className="font-medium">Time:</span>{" "}
              {client.schedulePreferences.timeWindow}
            </div>
            <div>
              <span className="font-medium">Frequency:</span>{" "}
              {client.schedulePreferences.visitFrequency}
            </div>
          </div>
        ),
      });
    }

    if (carePlanRows.length > 0) {
      detailSections.push({
        title: "Non-Medical Care Plan",
        rows: carePlanRows,
      });
    }
  }

  return (
    <>
      <div className="bg-neutral-50 -m-6 p-6 min-h-screen">
        {/* CRM-Style Split Layout */}
        <div className="flex gap-6 items-start">
          {/* Left Panel - Profile Detail Card or Inline Edit */}
          {isEditSheetOpen ? (
            <ClientProfileEditCard
              patient={client} /* TODO: rename prop to client */
              onCancel={() => setIsEditSheetOpen(false)}
              onSuccess={handleEditSuccess}
            />
          ) : (
          <ProfileDetailCard
            avatarUrl={client.avatar}
            avatarFallback={getInitials(client.firstName, client.lastName)}
            name={`${client.firstName} ${client.lastName}`}
            shortId={client.shortId ?? undefined}
            subtitle={`${client.address.city}, ${client.address.state}`}
            badges={[
              {
                label:
                  client.careType === "medical" ? "Medical Care" : "Non-Medical Care",
                variant: "secondary",
              },
            ]}
            statusPill={{
              label: "Active",
              className: "bg-neutral-100 text-neutral-900",
            }}
            metadata={[
              {
                label: "Registered",
                value: new Date(client.dob).toLocaleDateString("en-US", {
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
            onDelete={() => setIsDeleteDialogOpen(true)}
            onPhoneCall={handleCall}
            onEmail={handleEmail}
            onSMS={handleSMS}
            detailSections={detailSections}
            tags={[
              { id: "1", label: client.careType === "medical" ? "Medical" : "Non-Medical" },
              { id: "2", label: `${client.address.city}, ${client.address.state}` },
            ]}
            onAddTag={() => console.log("Add tag")}
          />
          )}

          {/* Right Panel - Tabs */}
          <div className="flex-1 min-w-0 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tab Header with Activity Filters */}
              <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
                <TabsList className="flex w-full justify-start mb-4 h-auto bg-transparent border-b border-neutral-200 rounded-none p-0 gap-6">
                  <TabsTrigger
                    value="family"
                    className="text-body-s bg-transparent border-b-2 border-transparent rounded-none px-0 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-neutral-900"
                  >
                    Family
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="text-body-s bg-transparent border-b-2 border-transparent rounded-none px-0 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-neutral-900"
                  >
                    Documents
                  </TabsTrigger>
                  <TabsTrigger
                    value="onboarding"
                    className="text-body-s bg-transparent border-b-2 border-transparent rounded-none px-0 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-neutral-900"
                  >
                    Onboarding
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="text-body-s bg-transparent border-b-2 border-transparent rounded-none px-0 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-neutral-900"
                  >
                    Notes
                  </TabsTrigger>
                  <TabsTrigger
                    value="insurance"
                    className="text-body-s bg-transparent border-b-2 border-transparent rounded-none px-0 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-neutral-900"
                  >
                    Insurance & Billing
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Family Tab */}
              <TabsContent value="family" className="mt-0">
                <Card className="border-0 bg-white rounded-2xl shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-h2 text-neutral-900">
                        Family Members & Guardians
                      </CardTitle>
                      <p className="text-body-s text-neutral-500 mt-1">
                        Manage authorized contacts and guardians
                      </p>
                    </div>
                    <Button onClick={() => setGuardianDialogOpen(true)} size="sm" className="bg-[#FED96A] hover:bg-[#e8c55a] text-neutral-900">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Guardian
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {guardiansLoading ? (
                      <div className="text-center py-8">
                        <p className="text-body-m text-neutral-500">Loading guardians…</p>
                      </div>
                    ) : familyMembers.length === 0 ? (
                      <div className="text-center py-8 px-4 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200">
                        <p className="text-body-m text-neutral-500 mb-3">
                          No family members added yet
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setGuardianDialogOpen(true)}
                          className="bg-[#FED96A] hover:bg-[#e8c55a] text-neutral-900"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Guardian
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {familyMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl bg-white"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-body-m font-medium text-neutral-900">
                                  {member.name}
                                </p>
                                {member.isPrimary && (
                                  <Badge variant="secondary" className="text-[11px] font-medium">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <p className="text-body-s text-neutral-500">
                                {member.relationship}
                              </p>
                              <p className="text-body-s text-neutral-500">
                                {member.phone}
                              </p>
                              {member.email && (
                                <p className="text-body-s text-neutral-500">
                                  {member.email}
                                </p>
                              )}
                            </div>
                            {!member.isPrimary && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGuardian(member.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-0">
                <Card className="border-0 bg-white rounded-2xl shadow-card">
                  <CardHeader>
                    <CardTitle className="text-h2 text-neutral-900">
                      Upload Documents
                    </CardTitle>
                    <p className="text-body-s text-neutral-500">
                      Upload consents, care plans, insurance, and medical records
                    </p>
                  </CardHeader>
                  <CardContent>
                    <DocumentUploader
                      onUpload={handleUploadDocument}
                      disabled={documentsUploading}
                      uploading={documentsUploading}
                    />
                  </CardContent>
                </Card>

                <Card className="border-0 bg-white rounded-2xl shadow-card">
                  <CardHeader>
                    <CardTitle className="text-h2 text-neutral-900">
                      Document Library
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {documentsLoading ? (
                      <p className="text-body-s text-neutral-500 py-8 text-center">Loading documents…</p>
                    ) : (
                      <DocumentList
                        documents={documents}
                        onDownload={(doc) => doc.url && window.open(doc.url, "_blank")}
                        onDelete={handleDeleteDocument}
                        emptyStateMessage="No documents uploaded yet"
                      />
                    )}
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
                      Track required forms and verifications
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ChecklistSection items={onboardingChecklist} showProgress={true} />
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
                      Add notes about this client (visible to staff only)
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {client.notes ? (
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                        <p className="text-body-m text-neutral-900">{client.notes}</p>
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

              {/* Insurance & Billing Tab */}
              <TabsContent value="insurance" className="mt-0">
                <ClientInsuranceTab clientId={clientId} />
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>

      {/* Add Guardian Dialog */}
      <Dialog open={guardianDialogOpen} onOpenChange={setGuardianDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member / Guardian</DialogTitle>
            <DialogDescription>
              Add contact information for an authorized family member or guardian
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="guardian-name">Name</Label>
              <Input
                id="guardian-name"
                value={newGuardian.name || ""}
                onChange={(e) =>
                  setNewGuardian({ ...newGuardian, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="guardian-relationship">Relationship</Label>
              <Input
                id="guardian-relationship"
                value={newGuardian.relationship || ""}
                onChange={(e) =>
                  setNewGuardian({ ...newGuardian, relationship: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="guardian-phone">Phone</Label>
              <Input
                id="guardian-phone"
                type="tel"
                value={newGuardian.phone || ""}
                onChange={(e) =>
                  setNewGuardian({ ...newGuardian, phone: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="guardian-email">Email (Optional)</Label>
              <Input
                id="guardian-email"
                type="email"
                value={newGuardian.email || ""}
                onChange={(e) =>
                  setNewGuardian({ ...newGuardian, email: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGuardianDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddGuardian} disabled={guardianSaving}>
              {guardianSaving ? "Adding…" : "Add Guardian"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this client? This action will mark the client as archived but won&apos;t permanently delete their data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
