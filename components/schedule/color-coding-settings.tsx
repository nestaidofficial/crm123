"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Palette } from "lucide-react";

interface ColorRule {
  id: string;
  name: string;
  type: "service_code" | "clinician" | "status";
  value: string;
  color: string;
}

const defaultColorRules: ColorRule[] = [
  {
    id: "1",
    name: "Home Care",
    type: "service_code",
    value: "HC001",
    color: "#000000",
  },
  {
    id: "2",
    name: "Assessment",
    type: "service_code",
    value: "ASS001",
    color: "#525252",
  },
  {
    id: "3",
    name: "Follow-up",
    type: "service_code",
    value: "FU001",
    color: "#737373",
  },
  {
    id: "4",
    name: "Urgent",
    type: "status",
    value: "urgent",
    color: "#000000",
  },
];

export function ColorCodingSettings() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Color-Code Appointments</h2>
        <p className="text-sm text-muted-foreground">
          See your availability at a glance. Color-code appointments by service code, clinician, or appointment status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Color Coding Rules</CardTitle>
          <CardDescription>
            Define how appointments are colored on your calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {defaultColorRules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div 
                  className="w-12 h-12 rounded-lg border-2 border-gray-300"
                  style={{ backgroundColor: rule.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="font-medium">{rule.name}</Label>
                    <Badge variant="outline">{rule.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rule.type === "service_code" && `Service Code: ${rule.value}`}
                    {rule.type === "clinician" && `Clinician: ${rule.value}`}
                    {rule.type === "status" && `Status: ${rule.value}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={rule.color}
                    className="w-16 h-10"
                    readOnly
                  />
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Color Rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Colors</CardTitle>
          <CardDescription>
            Set default colors for appointment types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Color by Service Code</Label>
              <Select defaultValue="enabled">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color by Clinician</Label>
              <Select defaultValue="enabled">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color by Appointment Status</Label>
              <Select defaultValue="enabled">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your color coding will appear on the calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {defaultColorRules.map((rule) => (
              <div 
                key={rule.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{ borderLeftColor: rule.color, borderLeftWidth: "4px" }}
              >
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: rule.color }}
                />
                <div className="flex-1">
                  <div className="font-medium">{rule.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Sample appointment - {new Date().toLocaleDateString()} at 10:00 AM
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
