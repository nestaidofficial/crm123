"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Save,
  Copy,
  RotateCcw,
  Settings,
  X,
} from "lucide-react";
import type { Form } from "./form-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSubmissions, FormSubmission } from "./form-submissions";
import { cn } from "@/lib/utils";

export interface FormSection {
  id: string;
  name: string;
  visible: boolean;
  fields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "dropdown" | "checkbox" | "radio" | "date" | "file" | "signature" | "yesno" | "multiselect";
  required: boolean;
  helperText?: string;
  options?: string[];
}

interface FormEditorProps {
  form: Form;
  initialSections?: FormSection[];
  submissions?: FormSubmission[];
  onSave: (formData: FormEditorData) => void;
  onSaveAsNew: (formData: FormEditorData) => void;
  onReset: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onViewSubmission?: (submission: FormSubmission) => void;
  onDownloadPDF?: (submission: FormSubmission) => void;
  onAddNote?: (submission: FormSubmission) => void;
}

export interface FormEditorData {
  name: string;
  category: Form["category"];
  sections: FormSection[];
}

export function FormEditor({
  form,
  initialSections,
  submissions = [],
  onSave,
  onSaveAsNew,
  onReset,
  onPreview,
  onPublish,
  onClose,
  onOpenSettings,
  onViewSubmission,
  onDownloadPDF,
  onAddNote,
}: FormEditorProps) {
  const [formName, setFormName] = React.useState(form.name);
  const [category, setCategory] = React.useState(form.category);
  const defaultSections: FormSection[] = initialSections || [
    {
      id: "section-1",
      name: "Personal Info",
      visible: true,
      fields: [
        {
          id: "field-1",
          label: "Full Name",
          type: "text",
          required: true,
        },
      ],
    },
  ];
  const [sections, setSections] = React.useState<FormSection[]>(defaultSections);
  const [isEditingSystemForm, setIsEditingSystemForm] = React.useState(form.status === "system");
  const [selectedField, setSelectedField] = React.useState<string | null>(null);
  const [selectedSection, setSelectedSection] = React.useState<string | null>(
    defaultSections.length > 0 ? defaultSections[0].id : null
  );

  // Update sections when initialSections change (when form changes)
  React.useEffect(() => {
    if (initialSections && initialSections.length > 0) {
      setSections(initialSections);
      setSelectedSection(initialSections[0].id);
    }
  }, [form.id, initialSections]);

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "dropdown", label: "Dropdown" },
    { value: "checkbox", label: "Checkbox" },
    { value: "radio", label: "Radio" },
    { value: "date", label: "Date" },
    { value: "file", label: "File Upload" },
    { value: "signature", label: "Signature" },
    { value: "yesno", label: "Yes/No" },
    { value: "multiselect", label: "Multi-select" },
  ];

  const addSection = () => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      name: "New Section",
      visible: true,
      fields: [],
    };
    setSections([...sections, newSection]);
    setSelectedSection(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  };

  const deleteSection = (sectionId: string) => {
    if (form.status === "system") {
      // System forms can remove sections but not delete the form
      setSections(sections.filter((s) => s.id !== sectionId));
    } else {
      setSections(sections.filter((s) => s.id !== sectionId));
    }
  };

  const addField = (sectionId: string) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
    };
    setSections(
      sections.map((s) =>
        s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s
      )
    );
  };

  const updateField = (
    sectionId: string,
    fieldId: string,
    updates: Partial<FormField>
  ) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            }
          : s
      )
    );
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s
      )
    );
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
  };

  const renderFieldPreview = (field: FormField) => {
    switch (field.type) {
      case "text":
        return (
          <Input
            placeholder={field.helperText || "Enter text"}
            disabled
            className="bg-muted"
          />
        );
      case "number":
        return (
          <Input
            type="number"
            placeholder={field.helperText || "Enter number"}
            disabled
            className="bg-muted"
          />
        );
      case "dropdown":
        return (
          <Select disabled>
            <SelectTrigger className="bg-muted">
              <SelectValue placeholder={field.helperText || "Select option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt, idx) => (
                <SelectItem key={idx} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox disabled />
            <Label className="text-sm font-normal">{field.label}</Label>
          </div>
        );
      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((opt, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <input type="radio" disabled className="h-4 w-4" />
                <Label className="text-sm font-normal">{opt}</Label>
              </div>
            ))}
          </div>
        );
      case "date":
        return (
          <Input
            type="date"
            disabled
            className="bg-muted"
          />
        );
      case "file":
        return (
          <div className="border-2 border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
            Upload file
          </div>
        );
      case "signature":
        return (
          <div className="border-2 border-dashed rounded-md p-8 text-center text-sm text-muted-foreground">
            Signature pad
          </div>
        );
      case "yesno":
        return (
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <input type="radio" disabled className="h-4 w-4" />
              <Label className="text-sm font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="radio" disabled className="h-4 w-4" />
              <Label className="text-sm font-normal">No</Label>
            </div>
          </div>
        );
      case "multiselect":
        return (
          <div className="space-y-2 border rounded-md p-2 bg-muted">
            {field.options?.map((opt, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox disabled />
                <Label className="text-sm font-normal">{opt}</Label>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const currentSection = sections.find((s) => s.id === selectedSection);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top Bar */}
      <div className="border-b px-6 py-3 flex items-center justify-between relative">
        {isEditingSystemForm && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-1.5 text-xs text-yellow-800 z-10">
            Editing system form - Changes will be saved as a new agency form
          </div>
        )}
        <div className="flex items-center gap-4 flex-1">
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-[200px] font-semibold"
            placeholder="Form name"
          />
          <Select value={category} onValueChange={(v) => setCategory(v as Form["category"])}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Onboarding">Onboarding</SelectItem>
              <SelectItem value="Care">Care</SelectItem>
              <SelectItem value="Compliance">Compliance</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          {form.status === "system" && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Default
            </Button>
          )}
          {isEditingSystemForm ? (
            <Button size="sm" onClick={() => {
              onSaveAsNew({ name: formName, category, sections });
              setIsEditingSystemForm(false);
            }}>
              <Copy className="mr-2 h-4 w-4" />
              Save as Agency Form
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onSaveAsNew({ name: formName, category, sections })}>
                <Copy className="mr-2 h-4 w-4" />
                Save as New
              </Button>
              <Button size="sm" onClick={() => onSave({ name: formName, category, sections })}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="editor" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="submissions">
              Submissions
              {submissions.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                  {submissions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="flex-1 flex overflow-hidden m-0">
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Sections */}
            <div className="w-64 border-r bg-muted/30 overflow-y-auto">
              <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Sections</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={addSection}
                className="h-7 text-xs"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
            {sections.map((section) => (
              <div
                key={section.id}
                className={cn(
                  "border rounded-lg p-2 space-y-2 cursor-pointer transition-colors",
                  selectedSection === section.id && "bg-background border-primary"
                )}
                onClick={() => setSelectedSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={section.name}
                      onChange={(e) =>
                        updateSection(section.id, { name: e.target.value })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-xs flex-1"
                      placeholder="Section name"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSection(section.id, { visible: !section.visible });
                      }}
                    >
                      {section.visible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </Button>
                    {(form.status === "agency" || form.status === "system" || sections.length > 1) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSection(section.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pl-6">
                  {section.fields.length} field{section.fields.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
              </div>
            </div>

            {/* Right Panel - Form Preview */}
            <div className="flex-1 overflow-y-auto p-6">
          {currentSection ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{currentSection.name}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField(currentSection.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                </div>

                {currentSection.fields.map((field) => (
                  <div
                    key={field.id}
                    className={cn(
                      "border rounded-lg p-4 space-y-3 transition-colors",
                      selectedField === field.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedField(field.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">
                            {field.label}
                            {field.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </Label>
                        </div>
                        {renderFieldPreview(field)}
                        {field.helperText && (
                          <p className="text-xs text-muted-foreground">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(currentSection.id, field.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {selectedField === field.id && (
                      <div className="pt-3 border-t space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Field Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                updateField(currentSection.id, field.id, {
                                  label: e.target.value,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Field Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(v) =>
                                updateField(currentSection.id, field.id, {
                                  type: v as FormField["type"],
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Helper Text</Label>
                          <Input
                            value={field.helperText || ""}
                            onChange={(e) =>
                              updateField(currentSection.id, field.id, {
                                helperText: e.target.value,
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Optional helper text"
                            className="h-8 text-xs"
                          />
                        </div>
                        {(field.type === "dropdown" || field.type === "radio" || field.type === "multiselect") && (
                          <div className="space-y-1">
                            <Label className="text-xs">Options (one per line)</Label>
                            <textarea
                              value={field.options?.join("\n") || ""}
                              onChange={(e) =>
                                updateField(currentSection.id, field.id, {
                                  options: e.target.value.split("\n").filter((o) => o.trim()),
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-xs"
                            />
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`required-${field.id}`}
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              updateField(currentSection.id, field.id, {
                                required: checked === true,
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Label
                            htmlFor={`required-${field.id}`}
                            className="text-xs font-normal cursor-pointer"
                          >
                            Required field
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {currentSection.fields.length === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      No fields in this section
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addField(currentSection.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Field
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a section to edit</p>
            </div>
          )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="flex-1 overflow-y-auto m-0 p-6">
          <FormSubmissions
            formId={form.id}
            formName={form.name}
            submissions={submissions}
            onView={onViewSubmission || (() => {})}
            onDownloadPDF={onDownloadPDF || (() => {})}
            onAddNote={onAddNote || (() => {})}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
