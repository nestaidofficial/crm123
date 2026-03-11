"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PartyPopper,
  Lock,
} from "lucide-react";
import type { ComplianceGateStatus } from "./types";

interface AssignmentGateProps {
  gateStatus: ComplianceGateStatus[];
  canAssign: boolean;
  isFullyComplete: boolean;
  onAssign: () => void;
  className?: string;
}

export function AssignmentGate({
  gateStatus,
  canAssign,
  isFullyComplete,
  onAssign,
  className,
}: AssignmentGateProps) {
  const passingGates = gateStatus.filter((g) => g.passed);
  const failingGates = gateStatus.filter((g) => !g.passed && g.rule.blocksAssignment);

  // Fully ready to assign — one card, pastel interior, no neon
  if (canAssign && isFullyComplete) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-black/5 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden",
          className
        )}
      >
        <div className="p-4 text-center bg-neutral-50/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 mb-3">
            <PartyPopper className="h-6 w-6 text-neutral-800" />
          </div>
          <h3 className="text-lg font-bold text-green-800 mb-1.5">
            Caregiver Fully Cleared
          </h3>
          <p className="text-xs text-neutral-800 mb-3">
            All compliance requirements complete. Ready for client assignment.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            {passingGates.map((gate) => (
              <Badge
                key={gate.rule.id}
                className="bg-neutral-100 text-neutral-900 border-0 text-xs"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {gate.rule.name}
              </Badge>
            ))}
          </div>
          <Button
            size="lg"
            className="bg-black hover:bg-neutral-800 text-white text-sm px-6 h-10"
            onClick={onAssign}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign to Client
          </Button>
        </div>
      </div>
    );
  }

  // Blocked — one card, white + shadow, pastel for message
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-neutral-100">
            <Lock className="h-5 w-5 text-neutral-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-700 mb-1">
              Assignment Locked
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Complete the following compliance requirements to enable client assignment.
            </p>

            {/* Gate checklist */}
            <div className="space-y-1.5 mb-3">
              {gateStatus.map((gate) => (
                <div
                  key={gate.rule.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-xs",
                    gate.passed
                      ? "bg-neutral-100 text-neutral-800"
                      : "bg-neutral-50 text-neutral-600"
                  )}
                >
                  {gate.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-black" />
                  ) : (
                    <XCircle className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="font-medium">{gate.rule.name}</span>
                  {!gate.passed && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      Required
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Blocked button */}
            <Button
              size="lg"
              disabled
              className="w-full bg-slate-300 text-slate-500 cursor-not-allowed h-10 text-sm"
            >
              <Shield className="h-4 w-4 mr-2" />
              Assign Caregiver
              <span className="ml-2 text-xs opacity-70">
                ({failingGates.length} requirement{failingGates.length !== 1 ? "s" : ""} missing)
              </span>
            </Button>

            {/* Warning note */}
            <div className="mt-2 flex items-start gap-2 text-[10px] text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500" />
              <span>
                Per Massachusetts EOEA regulations, caregivers cannot be assigned to clients until all compliance gates are verified.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact inline version for header
interface CompactAssignmentGateProps {
  canAssign: boolean;
  failingCount: number;
  onAssign: () => void;
  className?: string;
}

export function CompactAssignmentGate({
  canAssign,
  failingCount,
  onAssign,
  className,
}: CompactAssignmentGateProps) {
  if (canAssign) {
    return (
      <Button
        className={cn("bg-black hover:bg-neutral-800 text-white", className)}
        onClick={onAssign}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Assign to Client
      </Button>
    );
  }

  return (
    <Button
      disabled
      className={cn("bg-slate-300 text-slate-500 cursor-not-allowed", className)}
    >
      <Lock className="h-4 w-4 mr-2" />
      Assign Caregiver
      <Badge className="ml-2 bg-slate-400 text-white text-[10px]">
        {failingCount} missing
      </Badge>
    </Button>
  );
}
