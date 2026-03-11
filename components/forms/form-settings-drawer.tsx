"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

interface FormSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  formId: string;
  formName: string;
  settings: FormSettings;
  onSettingsChange: (settings: FormSettings) => void;
}

export interface FormSettings {
  visibility: {
    onboarding: boolean;
    employeeProfile: boolean;
    clientProfile: boolean;
    shiftCompletion: boolean;
    incidentReporting: boolean;
  };
  assignment: {
    required: boolean;
    roleBased: {
      caregiver: boolean;
      admin: boolean;
    };
  };
  submissionRules: {
    oneTime: boolean;
    perShift: boolean;
    perIncident: boolean;
  };
  signatureRequired: boolean;
  autoPdfGeneration: boolean;
}

export function FormSettingsDrawer({
  open,
  onClose,
  formId,
  formName,
  settings,
  onSettingsChange,
}: FormSettingsDrawerProps) {
  const [localSettings, setLocalSettings] = React.useState<FormSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const updateSettings = (updates: Partial<FormSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Settings: {formName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form Visibility */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Form Visibility</h3>
              <p className="text-xs text-muted-foreground">
                Where this form can be accessed and used
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="onboarding" className="text-sm">
                    Onboarding
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Available during employee onboarding
                  </p>
                </div>
                <Switch
                  id="onboarding"
                  checked={localSettings.visibility.onboarding}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      visibility: {
                        ...localSettings.visibility,
                        onboarding: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="employee-profile" className="text-sm">
                    Employee Profile
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Available in employee profile pages
                  </p>
                </div>
                <Switch
                  id="employee-profile"
                  checked={localSettings.visibility.employeeProfile}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      visibility: {
                        ...localSettings.visibility,
                        employeeProfile: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="client-profile" className="text-sm">
                    Client Profile
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Available in client profile pages
                  </p>
                </div>
                <Switch
                  id="client-profile"
                  checked={localSettings.visibility.clientProfile}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      visibility: {
                        ...localSettings.visibility,
                        clientProfile: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="shift-completion" className="text-sm">
                    Shift Completion
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Available when completing shifts
                  </p>
                </div>
                <Switch
                  id="shift-completion"
                  checked={localSettings.visibility.shiftCompletion}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      visibility: {
                        ...localSettings.visibility,
                        shiftCompletion: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="incident-reporting" className="text-sm">
                    Incident Reporting
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Available for incident reports
                  </p>
                </div>
                <Switch
                  id="incident-reporting"
                  checked={localSettings.visibility.incidentReporting}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      visibility: {
                        ...localSettings.visibility,
                        incidentReporting: checked,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Assignment */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Assignment</h3>
              <p className="text-xs text-muted-foreground">
                How this form is assigned and required
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="required"
                  checked={localSettings.assignment.required}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      assignment: {
                        ...localSettings.assignment,
                        required: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="required" className="text-sm font-normal cursor-pointer">
                  Required form (must be completed)
                </Label>
              </div>
              <div className="pl-6 space-y-2">
                <Label className="text-xs text-muted-foreground">Role-based access:</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="caregiver"
                      checked={localSettings.assignment.roleBased.caregiver}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          assignment: {
                            ...localSettings.assignment,
                            roleBased: {
                              ...localSettings.assignment.roleBased,
                              caregiver: checked === true,
                            },
                          },
                        })
                      }
                    />
                    <Label htmlFor="caregiver" className="text-sm font-normal cursor-pointer">
                      Caregiver
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="admin"
                      checked={localSettings.assignment.roleBased.admin}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          assignment: {
                            ...localSettings.assignment,
                            roleBased: {
                              ...localSettings.assignment.roleBased,
                              admin: checked === true,
                            },
                          },
                        })
                      }
                    />
                    <Label htmlFor="admin" className="text-sm font-normal cursor-pointer">
                      Admin
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Submission Rules */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Submission Rules</h3>
              <p className="text-xs text-muted-foreground">
                When this form can be submitted
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="one-time"
                  checked={localSettings.submissionRules.oneTime}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      submissionRules: {
                        ...localSettings.submissionRules,
                        oneTime: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="one-time" className="text-sm font-normal cursor-pointer">
                  One-time submission
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="per-shift"
                  checked={localSettings.submissionRules.perShift}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      submissionRules: {
                        ...localSettings.submissionRules,
                        perShift: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="per-shift" className="text-sm font-normal cursor-pointer">
                  Per shift
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="per-incident"
                  checked={localSettings.submissionRules.perIncident}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      submissionRules: {
                        ...localSettings.submissionRules,
                        perIncident: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="per-incident" className="text-sm font-normal cursor-pointer">
                  Per incident
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Options */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Additional Options</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="signature-required" className="text-sm">
                    Signature Required
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Require digital signature before submission
                  </p>
                </div>
                <Switch
                  id="signature-required"
                  checked={localSettings.signatureRequired}
                  onCheckedChange={(checked) =>
                    updateSettings({ signatureRequired: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-pdf" className="text-sm">
                    Auto-PDF Generation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically generate PDF after submission
                  </p>
                </div>
                <Switch
                  id="auto-pdf"
                  checked={localSettings.autoPdfGeneration}
                  onCheckedChange={(checked) =>
                    updateSettings({ autoPdfGeneration: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
