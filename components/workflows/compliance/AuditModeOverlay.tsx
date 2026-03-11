"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  X,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Printer,
  Calendar,
  User,
  Building2,
  AlertTriangle,
} from "lucide-react";
import type { CaregiverInfo, CompliancePhase, ComplianceGateStatus } from "./types";
import { AuditTimeline, generateAuditTimelineEvents } from "./AuditTimeline";
import { COMPLIANCE_GATES } from "./constants";

interface AuditModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  caregiver: CaregiverInfo;
  phases: CompliancePhase[];
  gateStatus: ComplianceGateStatus[];
}

export function AuditModeOverlay({
  isOpen,
  onClose,
  caregiver,
  phases,
  gateStatus,
}: AuditModeOverlayProps) {
  if (!isOpen) return null;

  const timelineEvents = generateAuditTimelineEvents(phases);
  const passingGates = gateStatus.filter((g) => g.passed);
  const failingGates = gateStatus.filter((g) => !g.passed);

  // Calculate stats
  const totalSteps = phases.flatMap((p) => p.steps).length;
  const completedSteps = phases
    .flatMap((p) => p.steps)
    .filter((s) => s.status === "verified").length;
  const totalDocs = phases
    .flatMap((p) => p.steps)
    .flatMap((s) => s.documents).length;
  const verifiedDocs = phases
    .flatMap((p) => p.steps)
    .flatMap((s) => s.documents)
    .filter((d) => d.status === "verified").length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">EOEA Audit View</h2>
              <p className="text-xs text-white/70">
                Compliance documentation for Massachusetts Executive Office of Elder Affairs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-white/30 text-white hover:bg-white/10"
            >
              <Printer className="h-3 w-3 mr-1" />
              Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-white/30 text-white hover:bg-white/10"
            >
              <Download className="h-3 w-3 mr-1" />
              Export PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Caregiver Summary */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Caregiver Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Full Name
                  </p>
                  <p className="text-sm font-semibold">{caregiver.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Employee ID
                  </p>
                  <p className="text-sm font-semibold">
                    {caregiver.caregiverId || `CG-${caregiver.id.slice(0, 4).toUpperCase()}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Position
                  </p>
                  <p className="text-sm font-semibold">{caregiver.title}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Department
                  </p>
                  <p className="text-sm font-semibold">{caregiver.department}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Location
                  </p>
                  <p className="text-sm font-semibold">{caregiver.location}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Start Date
                  </p>
                  <p className="text-sm font-semibold">{caregiver.startDate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Email
                  </p>
                  <p className="text-sm font-semibold">{caregiver.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Overall Status
                  </p>
                  <Badge
                    className={cn(
                      "mt-1 text-[10px]",
                      failingGates.length === 0
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    )}
                  >
                    {failingGates.length === 0
                      ? "Ready to Assign"
                      : `${failingGates.length} Gates Pending`}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Gates */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Compliance Gate Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {gateStatus.map((gate) => (
                  <div
                    key={gate.rule.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      gate.passed
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {gate.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <p className="text-xs font-semibold">{gate.rule.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {gate.rule.description}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "text-[10px]",
                        gate.passed
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {gate.passed ? "PASSED" : "REQUIRED"}
                    </Badge>
                  </div>
                ))}

                {/* Summary */}
                <Separator className="my-3" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Gates Passed: {passingGates.length}/{gateStatus.length}
                  </span>
                  {failingGates.length > 0 && (
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {failingGates.length} gate(s) blocking assignment
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documentation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-50 border">
                    <p className="text-2xl font-bold text-slate-900">
                      {completedSteps}/{totalSteps}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Steps Completed
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border">
                    <p className="text-2xl font-bold text-slate-900">
                      {verifiedDocs}/{totalDocs}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Documents Verified
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border">
                    <p className="text-2xl font-bold text-slate-900">
                      {phases.filter((p) => p.status === "complete").length}/{phases.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Phases Complete
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border">
                    <p className="text-2xl font-bold text-slate-900">
                      {Math.round((completedSteps / totalSteps) * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Overall Progress
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hiring Timeline */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Hiring Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline events={timelineEvents} />
            </CardContent>
          </Card>

          {/* Missing Items Alert */}
          {failingGates.length > 0 && (
            <Card className="border-2 border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  Missing Compliance Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {failingGates.map((gate) => (
                    <li
                      key={gate.rule.id}
                      className="flex items-center gap-2 text-sm text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">{gate.rule.name}:</span>
                      <span>{gate.rule.errorMessage}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>
              Generated on {new Date().toLocaleDateString()} at{" "}
              {new Date().toLocaleTimeString()}
            </span>
            <span>
              NestAid Compliance System • EOEA Audit Report
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
