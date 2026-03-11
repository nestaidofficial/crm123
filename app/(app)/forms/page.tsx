"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { FormsHeader } from "@/components/forms/forms-header";
import { FormsGrid } from "@/components/forms/forms-grid";
import { FormsEmptyState } from "@/components/forms/forms-empty-state";
import type { Form } from "@/components/forms/form-card";
import type { FormEditorData } from "@/components/forms/form-editor";
import { FormSettingsDrawer, FormSettings } from "@/components/forms/form-settings-drawer";
import { FormSubmissions } from "@/components/forms/form-submissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPremadeForms, getPremadeFormSections } from "@/components/forms/premade-forms";

const FormEditor = dynamic(
  () => import("@/components/forms/form-editor").then(m => ({ default: m.FormEditor })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    )
  }
);

export default function FormsPage() {
  const [selectedForm, setSelectedForm] = React.useState<Form | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"editor" | "submissions">("editor");

  // Load premade forms and any agency forms
  const [forms, setForms] = React.useState<Form[]>(() => {
    const premadeForms = getPremadeForms();
    // In real app, agency forms would come from API
    const agencyForms: Form[] = [
      {
        id: "form-6",
        name: "Custom Medication Log",
        category: "Care",
        status: "agency",
        usedIn: ["Shifts"],
        description: "Agency-specific medication tracking form",
      },
    ];
    return [...premadeForms, ...agencyForms];
  });

  // Mock submissions data
  const mockSubmissions = [
    {
      id: "sub-1",
      submittedBy: {
        name: "John Doe",
        id: "user-1",
        role: "Caregiver",
      },
      relatedTo: {
        type: "Employee" as const,
        name: "John Doe",
        id: "emp-1",
      },
      status: "Submitted" as const,
      submittedOn: "2024-01-15T10:30:00Z",
      formName: "Caregiver Application Form",
    },
    {
      id: "sub-2",
      submittedBy: {
        name: "Jane Smith",
        id: "user-2",
        role: "Admin",
      },
      relatedTo: {
        type: "Client" as const,
        name: "Mary Johnson",
        id: "client-1",
      },
      status: "Reviewed" as const,
      submittedOn: "2024-01-14T14:20:00Z",
      formName: "Client Intake & Care Needs Form",
    },
  ];

  const defaultSettings: FormSettings = {
    visibility: {
      onboarding: false,
      employeeProfile: false,
      clientProfile: false,
      shiftCompletion: false,
      incidentReporting: false,
    },
    assignment: {
      required: false,
      roleBased: {
        caregiver: false,
        admin: false,
      },
    },
    submissionRules: {
      oneTime: true,
      perShift: false,
      perIncident: false,
    },
    signatureRequired: false,
    autoPdfGeneration: false,
  };

  const [formSettings, setFormSettings] = React.useState<FormSettings>(defaultSettings);

  const handleOpenForm = (form: Form) => {
    setSelectedForm(form);
    setIsEditorOpen(true);
    setActiveTab("editor");
  };

  const handleEditForm = (form: Form) => {
    if (form.status === "agency") {
      handleOpenForm(form);
    }
  };

  const handleDuplicateForm = (form: Form) => {
    const duplicatedForm: Form = {
      ...form,
      id: `form-${Date.now()}`,
      name: `${form.name} (Copy)`,
      status: "agency",
    };
    setForms([...forms, duplicatedForm]);
  };

  const handleArchiveForm = (form: Form) => {
    setForms(forms.filter((f) => f.id !== form.id));
  };

  const handleSaveForm = (formData: FormEditorData) => {
    if (selectedForm) {
      setForms(
        forms.map((f) =>
          f.id === selectedForm.id
            ? { ...f, name: formData.name, category: formData.category }
            : f
        )
      );
    }
    // In real app, this would save to API
    console.log("Saving form:", formData);
  };

  const handleSaveAsNew = (formData: FormEditorData) => {
    const newForm: Form = {
      id: `form-${Date.now()}`,
      name: formData.name,
      category: formData.category,
      status: "agency",
      usedIn: selectedForm?.usedIn || [],
      description: selectedForm?.description || "",
    };
    setForms([...forms, newForm]);
    setSelectedForm(newForm);
    // In real app, this would save to API
    console.log("Saving as new form:", formData);
  };

  const handleCreateForm = () => {
    const newForm: Form = {
      id: `form-${Date.now()}`,
      name: "New Form",
      category: "Onboarding",
      status: "agency",
      usedIn: [],
      description: "",
    };
    setForms([...forms, newForm]);
    setSelectedForm(newForm);
    setIsEditorOpen(true);
    setActiveTab("editor");
  };

  if (isEditorOpen && selectedForm) {
    const formSubmissions = mockSubmissions.filter(
      (s) => s.formName === selectedForm.name
    );
    
    // Load sections for premade forms
    const initialSections = selectedForm.status === "system" 
      ? getPremadeFormSections(selectedForm.id)
      : undefined;

    return (
      <FormEditor
        form={selectedForm}
        initialSections={initialSections}
        submissions={formSubmissions}
        onSave={handleSaveForm}
        onSaveAsNew={handleSaveAsNew}
        onReset={() => {
          // Reset to system default
          console.log("Resetting to default");
        }}
        onPreview={() => {
          // Open preview mode
          console.log("Preview mode");
        }}
        onPublish={() => {
          // Publish form
          console.log("Publishing form");
        }}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedForm(null);
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
        }}
        onViewSubmission={(submission) => {
          console.log("View submission:", submission);
        }}
        onDownloadPDF={(submission) => {
          console.log("Download PDF:", submission);
        }}
        onAddNote={(submission) => {
          console.log("Add note:", submission);
        }}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        <FormsHeader
          onCreateForm={handleCreateForm}
          onDuplicateForm={() => {
            if (selectedForm) {
              handleDuplicateForm(selectedForm);
            }
          }}
          onImportForm={() => {
            console.log("Import form");
          }}
        />

        {forms.length === 0 ? (
          <FormsEmptyState onCreateForm={handleCreateForm} />
        ) : (
          <FormsGrid
            forms={forms}
            onOpen={handleOpenForm}
            onEdit={handleEditForm}
            onDuplicate={handleDuplicateForm}
            onArchive={handleArchiveForm}
          />
        )}

        {selectedForm && (
          <>
            <FormSettingsDrawer
              open={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              formId={selectedForm.id}
              formName={selectedForm.name}
              settings={formSettings}
              onSettingsChange={setFormSettings}
            />
          </>
        )}
      </div>
    </>
  );
}
