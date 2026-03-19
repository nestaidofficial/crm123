"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Mail,
  Phone,
  Edit,
  StickyNote,
  MoveRight,
  CheckCircle2,
  Clock,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/types/candidate";
import type { CompliancePhase } from "@/components/workflows/compliance/types";

interface CandidateOnboardingPanelProps {
  candidate: Candidate;
  phases: CompliancePhase[];
  activePhaseId: string | null;
  onPhaseSelect: (phaseId: string) => void;
  onEditProfile?: () => void;
  onAddNote?: () => void;
  onMoveStage?: () => void;
  children?: React.ReactNode;
}

export function CandidateOnboardingPanel({
  candidate,
  phases,
  activePhaseId,
  onPhaseSelect,
  onEditProfile,
  onAddNote,
  onMoveStage,
  children,
}: CandidateOnboardingPanelProps) {
  const initials = `${candidate.firstName[0]}${candidate.lastName[0]}`.toUpperCase();
  const fullName = `${candidate.firstName} ${candidate.lastName}`;

  // Calculate overall progress
  const totalSteps = phases.reduce((sum, phase) => sum + phase.steps.length, 0);
  const completedSteps = phases.reduce(
    (sum, phase) => sum + phase.steps.filter((s) => s.status === "verified").length,
    0
  );
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Calculate days in current stage
  const daysInStage = Math.floor(
    (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'positive';
      case 'withdrawn':
        return 'negative';
      default:
        return 'warning';
    }
  };

  return (
    <div className="space-y-5">
      {/* Candidate Header Card */}
      <Card className="border-neutral-200/70 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-neutral-200">
                {candidate.avatarUrl ? (
                  <AvatarImage src={candidate.avatarUrl} alt={fullName} />
                ) : (
                  <AvatarFallback className="bg-neutral-900 text-white text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                  {fullName}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={getStatusVariant(candidate.onboardingStatus)}
                    className="text-xs"
                  >
                    {candidate.currentStageLabel || candidate.onboardingStatus}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEditProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditProfile}
                  className="h-9 gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
              {onAddNote && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddNote}
                  className="h-9 gap-2"
                >
                  <StickyNote className="h-4 w-4" />
                  Add Note
                </Button>
              )}
              {onMoveStage && (
                <Button
                  size="sm"
                  onClick={onMoveStage}
                  className="h-9 gap-2 bg-neutral-900 hover:bg-neutral-800"
                >
                  <MoveRight className="h-4 w-4" />
                  Move Stage
                </Button>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-6 text-sm text-neutral-600">
            {candidate.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-400" />
                <span>{candidate.email}</span>
              </div>
            )}
            {candidate.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-neutral-400" />
                <span>{candidate.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Onboarding Progress
            </span>
            <span className="text-lg font-bold text-neutral-900">
              {progressPercentage}%
            </span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-neutral-200">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">
                  Days in Stage
                </p>
                <p className="text-xl font-bold text-neutral-900">
                  {daysInStage < 10 ? `0${daysInStage}` : daysInStage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-neutral-200">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">
                  Compliance Docs
                </p>
                <p className="text-xl font-bold text-neutral-900">
                  {completedSteps}
                  <span className="text-sm text-neutral-400 font-normal">
                    /{totalSteps}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Phase Timeline - render children (step cards) */}
      {children}
    </div>
  );
}
