"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { mapSettingsRowToApi, mapSettingsApiToRow } from "@/lib/db/evv.mapper";
import type { EVVSettingsRow, EVVServiceTypeRow, EVVFundingSourceRow } from "@/lib/db/evv.mapper";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

interface EVVSettingsProps {
  onSave: (settings: EVVSettingsData) => void;
}

export interface EVVSettingsData {
  geofenceRadius: number; // meters
  allowEarlyClockIn: boolean;
  earlyClockInMinutes: number;
  gracePeriodMinutes: number;
  requireShiftToExist: boolean;
  manualEditsPermission: "admin" | "manager" | "both";
  alertRules: {
    lateClockIn: boolean;
    noShow: boolean;
    outsideZone: boolean;
    missingSignature: boolean;
    missingNotes: boolean;
  };
  exceptionThresholds: {
    lateArrivalMinutes: number;
    geofenceDistanceMeters: number;
  };
  serviceTypes: string[];
  fundingSources: string[];
  billingExportFormat: "medicaid" | "hcbs" | "regional-center" | "idd" | "custom";
  auditRetentionYears: number;
}

export function EVVSettings({ onSave }: EVVSettingsProps) {
  const [settings, setSettings] = React.useState<EVVSettingsData>({
    geofenceRadius: 200,
    allowEarlyClockIn: true,
    earlyClockInMinutes: 10,
    gracePeriodMinutes: 5,
    requireShiftToExist: true,
    manualEditsPermission: "both",
    alertRules: {
      lateClockIn: true,
      noShow: true,
      outsideZone: true,
      missingSignature: true,
      missingNotes: true,
    },
    exceptionThresholds: {
      lateArrivalMinutes: 15,
      geofenceDistanceMeters: 100,
    },
    serviceTypes: ["Personal Care", "Companion", "Respite Care", "Skilled Nursing", "Medication Management"],
    fundingSources: ["Medicaid", "HCBS", "Private Pay", "Regional Center", "IDD"],
    billingExportFormat: "medicaid",
    auditRetentionYears: 7,
  });

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const supabase = getSupabaseBrowserClient();
  const agencyId = useAuthStore((s) => s.currentAgencyId);

  // Fetch settings from Supabase on mount
  React.useEffect(() => {
    async function fetchSettings() {
      try {
        setIsLoading(true);

        // Fetch main settings for this agency
        let settingsQuery = supabase.from("evv_settings").select("*");
        if (agencyId) {
          settingsQuery = settingsQuery.eq("agency_id", agencyId);
        } else {
          settingsQuery = settingsQuery.eq("id", "00000000-0000-0000-0000-000000000001");
        }
        const { data: settingsData, error: settingsError } = await settingsQuery.single();

        if (settingsError) throw settingsError;

        const [serviceTypesRes, fundingSourcesRes] = await Promise.all([
          supabase.from("evv_service_types").select("*").eq("is_active", true),
          supabase.from("evv_funding_sources").select("*").eq("is_active", true),
        ]);

        if (serviceTypesRes.error) throw serviceTypesRes.error;
        if (fundingSourcesRes.error) throw fundingSourcesRes.error;

        // Map to frontend API shape
        const mappedSettings = mapSettingsRowToApi(
          settingsData as EVVSettingsRow,
          serviceTypesRes.data as EVVServiceTypeRow[],
          fundingSourcesRes.data as EVVFundingSourceRow[]
        );

        setSettings(mappedSettings as any);
      } catch (err) {
        console.error("Failed to fetch EVV settings:", err);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Map API shape to row
      const rowData = mapSettingsApiToRow(settings as any);

      // Update evv_settings for this agency
      let updateQuery = supabase.from("evv_settings").update(rowData);
      if (agencyId) {
        updateQuery = updateQuery.eq("agency_id", agencyId);
      } else {
        updateQuery = updateQuery.eq("id", "00000000-0000-0000-0000-000000000001");
      }
      const { error: updateError } = await updateQuery;

      if (updateError) throw updateError;

      toast.success("Settings saved successfully");
      onSave(settings);
    } catch (err) {
      console.error("Failed to save EVV settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <p className="text-sm text-neutral-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Geofence Settings</CardTitle>
          <CardDescription className="text-xs">
            Configure location verification parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="geofence-radius">Geofence Radius (meters)</Label>
            <Input
              id="geofence-radius"
              type="number"
              min="50"
              max="500"
              value={settings.geofenceRadius}
              onChange={(e) =>
                setSettings({ ...settings, geofenceRadius: parseInt(e.target.value) || 200 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Default: 150-300m. Recommended range: 100-500m
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Clock-In/Out Settings</CardTitle>
          <CardDescription className="text-xs">
            Configure time tracking rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-early">Allow Early Clock-In</Label>
              <p className="text-xs text-muted-foreground">
                Allow caregivers to clock in before scheduled time
              </p>
            </div>
            <Switch
              id="allow-early"
              checked={settings.allowEarlyClockIn}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowEarlyClockIn: checked })
              }
            />
          </div>

          {settings.allowEarlyClockIn && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="early-minutes">Early Clock-In Window (minutes)</Label>
              <Input
                id="early-minutes"
                type="number"
                min="0"
                max="60"
                value={settings.earlyClockInMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, earlyClockInMinutes: parseInt(e.target.value) || 10 })
                }
              />
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="grace-period">Grace Period for Late (minutes)</Label>
            <Input
              id="grace-period"
              type="number"
              min="0"
              max="30"
              value={settings.gracePeriodMinutes}
              onChange={(e) =>
                setSettings({ ...settings, gracePeriodMinutes: parseInt(e.target.value) || 5 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Time window before a clock-in is marked as late
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-shift">Require Shift to Exist</Label>
              <p className="text-xs text-muted-foreground">
                Caregivers can only clock in for scheduled shifts
              </p>
            </div>
            <Switch
              id="require-shift"
              checked={settings.requireShiftToExist}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, requireShiftToExist: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Permissions</CardTitle>
          <CardDescription className="text-xs">
            Configure who can perform manual edits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-edits">Manual Edits Permission</Label>
            <select
              id="manual-edits"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={settings.manualEditsPermission}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  manualEditsPermission: e.target.value as "admin" | "manager" | "both",
                })
              }
            >
              <option value="admin">Admin only</option>
              <option value="manager">Manager only</option>
              <option value="both">Admin & Manager</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Alert Rules</CardTitle>
          <CardDescription className="text-xs">
            Configure automatic alerts for time clock events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alert-late">Late Clock-In Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Send alerts when caregivers clock in late
              </p>
            </div>
            <Switch
              id="alert-late"
              checked={settings.alertRules.lateClockIn}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  alertRules: { ...settings.alertRules, lateClockIn: checked },
                })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alert-noshow">No-Show Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Send alerts when caregivers don&apos;t show up for shifts
              </p>
            </div>
            <Switch
              id="alert-noshow"
              checked={settings.alertRules.noShow}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  alertRules: { ...settings.alertRules, noShow: checked },
                })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alert-outside">Outside Geofence Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Send alerts when clock-in occurs outside approved location
              </p>
            </div>
            <Switch
              id="alert-outside"
              checked={settings.alertRules.outsideZone}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  alertRules: { ...settings.alertRules, outsideZone: checked },
                })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alert-signature">Missing Signature Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Alert when client signature is not captured
              </p>
            </div>
            <Switch
              id="alert-signature"
              checked={settings.alertRules.missingSignature}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  alertRules: { ...settings.alertRules, missingSignature: checked },
                })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alert-notes">Missing Care Notes Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Alert when care notes are not documented
              </p>
            </div>
            <Switch
              id="alert-notes"
              checked={settings.alertRules.missingNotes}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  alertRules: { ...settings.alertRules, missingNotes: checked },
                })
              }
            />
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Exception Thresholds</CardTitle>
          <CardDescription className="text-xs">
            Configure when exceptions are triggered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="late-threshold">Late Arrival Threshold (minutes)</Label>
            <Input
              id="late-threshold"
              type="number"
              min="5"
              max="60"
              value={settings.exceptionThresholds.lateArrivalMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  exceptionThresholds: {
                    ...settings.exceptionThresholds,
                    lateArrivalMinutes: parseInt(e.target.value) || 15,
                  },
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Mark as late after this many minutes past scheduled start
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Service Types</CardTitle>
          <CardDescription className="text-xs">
            Manage available service types for visit tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {settings.serviceTypes.map((type, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs px-3 py-1 bg-neutral-50 text-neutral-700 border-neutral-200"
              >
                {type}
              </Badge>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full">
            Manage Service Types
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Funding Sources</CardTitle>
          <CardDescription className="text-xs">
            Manage available funding sources for billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {settings.fundingSources.map((source, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs px-3 py-1 bg-neutral-50 text-neutral-700 border-neutral-200"
              >
                {source}
              </Badge>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full">
            Manage Funding Sources
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Billing Export</CardTitle>
          <CardDescription className="text-xs">
            Configure billing export format for your state/payor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-format">Export Format</Label>
            <select
              id="export-format"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={settings.billingExportFormat}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  billingExportFormat: e.target.value as EVVSettingsData["billingExportFormat"],
                })
              }
            >
              <option value="medicaid">Medicaid (Standard)</option>
              <option value="hcbs">HCBS Waiver</option>
              <option value="regional-center">Regional Center (California)</option>
              <option value="idd">IDD Billing</option>
              <option value="custom">Custom Format</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Select the format required by your state or payor
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Audit & Compliance</CardTitle>
          <CardDescription className="text-xs">
            Configure audit trail retention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="audit-retention">Audit Retention Period (years)</Label>
            <Input
              id="audit-retention"
              type="number"
              min="1"
              max="10"
              value={settings.auditRetentionYears}
              onChange={(e) =>
                setSettings({ ...settings, auditRetentionYears: parseInt(e.target.value) || 7 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 2-7 years for compliance
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
