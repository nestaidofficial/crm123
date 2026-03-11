"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  ClipboardList, 
  DollarSign, 
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ShiftDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: any;
}

export function ShiftDetailsDialog({ open, onOpenChange, shift }: ShiftDetailsDialogProps) {
  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-semibold">{shift.shiftType || "Shift Details"}</DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {shift.clientName || "Client"} • {shift.startTime} - {shift.endTime}
              </DialogDescription>
            </div>
            <Badge variant={shift.isOpenShift ? "secondary" : "default"}>
              {shift.isOpenShift ? "Open Shift" : "Assigned"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Shift Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Date</p>
                    <p className="text-xs font-medium">{shift.date || shift.startDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Time</p>
                    <p className="text-xs font-medium">{shift.startTime} - {shift.endTime}</p>
                  </div>
                </div>
              </div>
              {shift.caregiverName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Caregiver</p>
                    <p className="text-xs font-medium">{shift.caregiverName}</p>
                  </div>
                </div>
              )}
              {shift.isOpenShift && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Status</p>
                    <p className="text-xs font-medium">Available for self-assignment</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          {shift.instructions && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Shift Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {shift.instructions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tasks */}
          {shift.tasks && shift.tasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {shift.tasks.map((task: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-2 border rounded-lg">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground" />
                      <span className="text-xs flex-1">{task}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Required Forms */}
          {shift.requiredForms && shift.requiredForms.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Required Forms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {shift.requiredForms.map((form: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {form}
                    </Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  These forms must be completed during this shift
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pay Details */}
          {shift.payRate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pay Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    ${shift.payRate} / {shift.payType || "hour"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {shift.isOpenShift && (
            <div className="flex gap-2">
              <Button className="flex-1">Assign to Me</Button>
              <Button variant="outline">View Details</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
