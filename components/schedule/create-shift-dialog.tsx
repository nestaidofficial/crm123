"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, X, FileText, ClipboardList, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (shift: any) => void;
}

export function CreateShiftDialog({ open, onOpenChange, onSave }: CreateShiftDialogProps) {
  const [shiftData, setShiftData] = useState({
    shiftType: "",
    caregiver: "",
    client: "",
    startDate: "",
    startTime: "",
    endTime: "",
    isRecurring: false,
    recurrencePattern: "weekly",
    recurrenceEnd: "never",
    recurrenceEndDate: "",
    recurrenceCount: "",
    isOpenShift: false,
    instructions: "",
    tasks: [] as string[],
    requiredForms: [] as string[],
    payRate: "",
    payType: "hourly",
  });

  const [newTask, setNewTask] = useState("");
  const [newForm, setNewForm] = useState("");

  const shiftTypes = [
    "Personal Care",
    "Companion Care",
    "Respite Care",
    "Medication Management",
    "Meal Preparation",
    "Transportation",
    "Housekeeping",
    "Night Shift",
    "Live-In Care",
    "On Call",
  ];

  const recurrencePatterns = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  const requiredFormsList = [
    "Care Plan",
    "Medication Log",
    "Vital Signs",
    "Incident Report",
    "Progress Notes",
    "Activity Log",
  ];

  const handleAddTask = () => {
    if (newTask.trim()) {
      setShiftData({
        ...shiftData,
        tasks: [...shiftData.tasks, newTask.trim()],
      });
      setNewTask("");
    }
  };

  const handleRemoveTask = (index: number) => {
    setShiftData({
      ...shiftData,
      tasks: shiftData.tasks.filter((_, i) => i !== index),
    });
  };

  const handleAddForm = (form: string) => {
    if (!shiftData.requiredForms.includes(form)) {
      setShiftData({
        ...shiftData,
        requiredForms: [...shiftData.requiredForms, form],
      });
    }
  };

  const handleRemoveForm = (form: string) => {
    setShiftData({
      ...shiftData,
      requiredForms: shiftData.requiredForms.filter((f) => f !== form),
    });
  };

  const handleSave = () => {
    onSave(shiftData);
    onOpenChange(false);
    // Reset form
    setShiftData({
      shiftType: "",
      caregiver: "",
      client: "",
      startDate: "",
      startTime: "",
      endTime: "",
      isRecurring: false,
      recurrencePattern: "weekly",
      recurrenceEnd: "never",
      recurrenceEndDate: "",
      recurrenceCount: "",
      isOpenShift: false,
      instructions: "",
      tasks: [],
      requiredForms: [],
      payRate: "",
      payType: "hourly",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Create Shift</DialogTitle>
          <DialogDescription className="text-xs">
            Create a new shift with instructions, tasks, and required forms
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
            <TabsTrigger value="recurring" className="text-xs">Recurring</TabsTrigger>
            <TabsTrigger value="details" className="text-xs">Instructions & Tasks</TabsTrigger>
            <TabsTrigger value="pay" className="text-xs">Pay Details</TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shiftType" className="text-xs">Shift Type *</Label>
                <Select
                  value={shiftData.shiftType}
                  onValueChange={(value) => setShiftData({ ...shiftData, shiftType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift type" />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client" className="text-xs">Client *</Label>
                <Select
                  value={shiftData.client}
                  onValueChange={(value) => setShiftData({ ...shiftData, client: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Maren</SelectItem>
                    <SelectItem value="2">Sofia</SelectItem>
                    <SelectItem value="3">Austin</SelectItem>
                    <SelectItem value="4">Elizabeth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-xs">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={shiftData.startDate}
                  onChange={(e) => setShiftData({ ...shiftData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Open Shift (Self-Assignment)</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="openShift"
                    checked={shiftData.isOpenShift}
                    onCheckedChange={(checked) =>
                      setShiftData({ ...shiftData, isOpenShift: checked as boolean })
                    }
                  />
                  <Label htmlFor="openShift" className="text-xs font-normal cursor-pointer">
                    Allow caregivers to self-assign this shift
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-xs">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={shiftData.startTime}
                  onChange={(e) => setShiftData({ ...shiftData, startTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-xs">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={shiftData.endTime}
                  onChange={(e) => setShiftData({ ...shiftData, endTime: e.target.value })}
                />
              </div>
            </div>

            {!shiftData.isOpenShift && (
              <div className="space-y-2">
                <Label htmlFor="caregiver" className="text-xs">Caregiver</Label>
                <Select
                  value={shiftData.caregiver}
                  onValueChange={(value) => setShiftData({ ...shiftData, caregiver: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select caregiver (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Haylie Westervelt</SelectItem>
                    <SelectItem value="2">Gretchen Torff</SelectItem>
                    <SelectItem value="3">Marcus Siphron</SelectItem>
                    <SelectItem value="4">Maryanne Torff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          {/* Recurring Options */}
          <TabsContent value="recurring" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={shiftData.isRecurring}
                  onCheckedChange={(checked) =>
                    setShiftData({ ...shiftData, isRecurring: checked as boolean })
                  }
                />
                <Label htmlFor="recurring" className="text-xs font-normal cursor-pointer">
                  Make this a recurring shift
                </Label>
              </div>
            </div>

            {shiftData.isRecurring && (
              <div className="space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="recurrencePattern" className="text-xs">Repeat Pattern</Label>
                  <Select
                    value={shiftData.recurrencePattern}
                    onValueChange={(value) =>
                      setShiftData({ ...shiftData, recurrencePattern: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recurrencePatterns.map((pattern) => (
                        <SelectItem key={pattern.value} value={pattern.value}>
                          {pattern.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrenceEnd" className="text-xs">End Date</Label>
                  <Select
                    value={shiftData.recurrenceEnd}
                    onValueChange={(value) =>
                      setShiftData({ ...shiftData, recurrenceEnd: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="date">On Date</SelectItem>
                      <SelectItem value="count">After X occurrences</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {shiftData.recurrenceEnd === "date" && (
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceEndDate" className="text-xs">End Date</Label>
                    <Input
                      id="recurrenceEndDate"
                      type="date"
                      value={shiftData.recurrenceEndDate}
                      onChange={(e) =>
                        setShiftData({ ...shiftData, recurrenceEndDate: e.target.value })
                      }
                    />
                  </div>
                )}

                {shiftData.recurrenceEnd === "count" && (
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceCount" className="text-xs">Number of Occurrences</Label>
                    <Input
                      id="recurrenceCount"
                      type="number"
                      min="1"
                      value={shiftData.recurrenceCount}
                      onChange={(e) =>
                        setShiftData({ ...shiftData, recurrenceCount: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Instructions & Tasks */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="instructions" className="text-xs font-semibold">
                Shift Instructions
              </Label>
              <Textarea
                id="instructions"
                placeholder="Add specific instructions for this shift..."
                value={shiftData.instructions}
                onChange={(e) => setShiftData({ ...shiftData, instructions: e.target.value })}
                className="min-h-[100px] text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Caregivers will see these instructions before they arrive
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tasks</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a task..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                  className="text-xs"
                />
                <Button type="button" onClick={handleAddTask} size="sm">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {shiftData.tasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{task}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveTask(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Required Forms</Label>
              <p className="text-[10px] text-muted-foreground mb-2">
                Select forms that must be completed during this shift
              </p>
              <div className="grid grid-cols-2 gap-2">
                {requiredFormsList.map((form) => (
                  <div
                    key={form}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{form}</span>
                    </div>
                    {shiftData.requiredForms.includes(form) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleRemoveForm(form)}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleAddForm(form)}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {shiftData.requiredForms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {shiftData.requiredForms.map((form) => (
                    <Badge key={form} variant="secondary" className="text-xs">
                      {form}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Pay Details */}
          <TabsContent value="pay" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payRate" className="text-xs">Pay Rate</Label>
                <Input
                  id="payRate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={shiftData.payRate}
                  onChange={(e) => setShiftData({ ...shiftData, payRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payType" className="text-xs">Pay Type</Label>
                <Select
                  value={shiftData.payType}
                  onValueChange={(value) => setShiftData({ ...shiftData, payType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="flat">Flat Rate</SelectItem>
                    <SelectItem value="per-visit">Per Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Pay details help caregivers understand compensation for this shift
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Create Shift{shiftData.isRecurring ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
