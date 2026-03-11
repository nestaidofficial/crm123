"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PartyPopper,
  CheckCircle2,
  UserPlus,
  Sparkles,
  Shield,
  Award,
} from "lucide-react";

interface CelebrationScreenProps {
  caregiverName: string;
  completedSteps: number;
  totalSteps: number;
  onAssign: () => void;
  className?: string;
}

export function CelebrationScreen({
  caregiverName,
  completedSteps,
  totalSteps,
  onAssign,
  className,
}: CelebrationScreenProps) {
  return (
    <Card
      className={cn(
        "border-0 shadow-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden relative",
        className
      )}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-green-200 rounded-full filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-200 rounded-full filter blur-3xl opacity-30 animate-pulse delay-500" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-teal-200 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000" />
      </div>

      {/* Top gradient bar */}
      <div className="h-2 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />

      <CardContent className="relative p-8 text-center">
        {/* Celebration icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6 shadow-xl shadow-green-500/30 animate-bounce">
          <PartyPopper className="h-12 w-12 text-white" />
        </div>

        {/* Main message */}
        <h2 className="text-3xl font-bold text-green-800 mb-2">
          Congratulations!
        </h2>
        <h3 className="text-xl font-semibold text-green-700 mb-4">
          {caregiverName} is Fully Cleared
        </h3>

        {/* Completion stats */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{completedSteps}</div>
            <div className="text-xs text-green-700">Steps Completed</div>
          </div>
          <div className="h-12 w-px bg-green-200" />
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">100%</div>
            <div className="text-xs text-green-700">Compliance</div>
          </div>
          <div className="h-12 w-px bg-green-200" />
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-xs text-green-700">All Gates Passed</div>
          </div>
        </div>

        {/* Compliance badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            CORI Cleared
          </Badge>
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            SORI Cleared
          </Badge>
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Training Passed
          </Badge>
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            I-9 Complete
          </Badge>
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Payroll Ready
          </Badge>
        </div>

        {/* Message */}
        <p className="text-green-700 mb-8 max-w-md mx-auto">
          All compliance requirements have been verified. This caregiver is now
          ready to be assigned to clients according to Massachusetts EOEA regulations.
        </p>

        {/* Action button */}
        <Button
          size="lg"
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg px-12 h-14 shadow-xl shadow-green-500/30"
          onClick={onAssign}
        >
          <UserPlus className="h-6 w-6 mr-2" />
          Assign to Client
          <Sparkles className="h-5 w-5 ml-2" />
        </Button>

        {/* Award badge */}
        <div className="mt-8 flex items-center justify-center gap-2 text-green-600">
          <Award className="h-5 w-5" />
          <span className="text-sm font-medium">Ready for First Assignment</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact inline celebration indicator
interface CompactCelebrationProps {
  isComplete: boolean;
  className?: string;
}

export function CompactCelebration({
  isComplete,
  className,
}: CompactCelebrationProps) {
  if (!isComplete) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 border border-green-200",
        className
      )}
    >
      <PartyPopper className="h-4 w-4 text-green-600" />
      <span className="text-xs font-semibold text-green-700">
        Fully Compliant - Ready to Assign
      </span>
    </div>
  );
}
