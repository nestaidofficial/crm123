"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CheckIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";
import {
  COORDINATOR_STEPS,
  FIELDS_BY_STEP,
  coordinatorSetupSchema,
  defaultCoordinatorSetupValues,
  type CoordinatorSetupValues,
} from "@/lib/ai/coordinator-schema";
import { useCoordinatorStore } from "@/store/useCoordinatorStore";

interface CoordinatorSetupProps {
  onComplete?: () => void;
  isEditing?: boolean;
}

/**
 * Deep-merge a possibly-stale persisted config with defaults.
 * Ensures new fields added in schema updates always have valid values.
 */
function mergeWithDefaults(config: CoordinatorSetupValues | null): CoordinatorSetupValues {
  if (!config) return defaultCoordinatorSetupValues;
  return {
    ...defaultCoordinatorSetupValues,
    ...config,
    lineRouting: {
      ...defaultCoordinatorSetupValues.lineRouting,
      ...config.lineRouting,
    },
    callTypes: {
      ...defaultCoordinatorSetupValues.callTypes,
      ...config.callTypes,
      alwaysHandled: {
        ...defaultCoordinatorSetupValues.callTypes.alwaysHandled,
        ...(config.callTypes?.alwaysHandled ?? {}),
      },
    },
    callOutIntake: {
      ...defaultCoordinatorSetupValues.callOutIntake,
      ...config.callOutIntake,
      intakeFields: {
        ...defaultCoordinatorSetupValues.callOutIntake.intakeFields,
        ...(config.callOutIntake?.intakeFields ?? {}),
      },
      afterIntake: {
        ...defaultCoordinatorSetupValues.callOutIntake.afterIntake,
        ...(config.callOutIntake?.afterIntake ?? {}),
      },
    },
    coverageWorkflow: {
      ...defaultCoordinatorSetupValues.coverageWorkflow,
      ...config.coverageWorkflow,
      aiCapabilities: {
        ...defaultCoordinatorSetupValues.coverageWorkflow.aiCapabilities,
        ...(config.coverageWorkflow?.aiCapabilities ?? {}),
      },
    },
    escalationsNotifications: {
      ...defaultCoordinatorSetupValues.escalationsNotifications,
      ...config.escalationsNotifications,
      escalateToHuman: {
        ...defaultCoordinatorSetupValues.escalationsNotifications.escalateToHuman,
        ...(config.escalationsNotifications?.escalateToHuman ?? {}),
      },
      sendUpdatesTo: {
        ...defaultCoordinatorSetupValues.escalationsNotifications.sendUpdatesTo,
        ...(config.escalationsNotifications?.sendUpdatesTo ?? {}),
      },
      deliveryMethod: {
        ...defaultCoordinatorSetupValues.escalationsNotifications.deliveryMethod,
        ...(config.escalationsNotifications?.deliveryMethod ?? {}),
      },
    },
  };
}

export function CoordinatorSetup({ onComplete, isEditing = false }: CoordinatorSetupProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const config = useCoordinatorStore((state) => state.config);
  const saving = useCoordinatorStore((state) => state.saving);
  const loading = useCoordinatorStore((state) => state.loading);
  const syncStatus = useCoordinatorStore((state) => state.syncStatus);
  const fetchConfig = useCoordinatorStore((state) => state.fetchConfig);
  const saveConfig = useCoordinatorStore((state) => state.saveConfig);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<CoordinatorSetupValues>({
    resolver: zodResolver(coordinatorSetupSchema),
    defaultValues: mergeWithDefaults(config),
    mode: "onChange",
  });

  const { watch, trigger, handleSubmit, reset } = form;
  const autoFillShifts = watch("coverageWorkflow.autoFillShifts");

  // Fetch config from API on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) reset(mergeWithDefaults(config));
  }, [config, reset]);

  // Scroll to top when step changes
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const handleNext = async () => {
    const stepNumber = currentStep + 1;
    const fieldsToValidate = FIELDS_BY_STEP[stepNumber] || [];
    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate as any);
      if (!valid) return;
    }
    if (currentStep < COORDINATOR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit(onActivate)();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const onActivate = async (data: CoordinatorSetupValues) => {
    const success = await saveConfig(data);
    if (success) {
      toast.success("Coverage Coordinator settings saved");
      setIsComplete(true);
    } else {
      toast.error("Failed to save configuration");
    }
  };

  const progress = ((currentStep + 1) / COORDINATOR_STEPS.length) * 100;

  // ── Completion screen ──────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 p-12 backdrop-blur">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent_50%)]" />
            <div className="relative flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground/10 bg-foreground/5">
                <CheckIcon
                  className="h-8 w-8 text-foreground animate-in zoom-in duration-500 delay-200"
                  strokeWidth={2.5}
                />
              </div>
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-medium tracking-tight">
                  Your Coverage Coordinator is ready
                </h2>
                <p className="text-sm text-muted-foreground/80">
                  {form.getValues("lineRouting.coverageLine")}
                </p>
                {syncStatus && (
                  <Badge
                    variant={syncStatus === "synced" ? "default" : syncStatus === "error" ? "destructive" : "secondary"}
                    className="mt-2"
                  >
                    {syncStatus === "synced" ? "Synced to Retell" : syncStatus === "error" ? "Sync Error" : "Sync Pending"}
                  </Badge>
                )}
              </div>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsComplete(false);
                    setCurrentStep(0);
                  }}
                  className="flex-1 h-10"
                >
                  Review Configuration
                </Button>
                <Button
                  onClick={() => {
                    router.push("/ai/coordinator");
                    onComplete?.();
                  }}
                  className="flex-1 h-10"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main wizard layout ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT: Fixed vertical stepper ───────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex flex-col py-12 px-7 border-r border-neutral-100">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-1">
            Setup
          </p>
          <h2 className="text-sm font-semibold text-foreground leading-tight">
            24/7 Coordinator
          </h2>
        </div>

        {/* Step list */}
        <nav className="flex flex-col">
          {COORDINATOR_STEPS.map((step, index) => (
            <div key={step.id}>
              {/* Circle + label row */}
              <button
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                className="flex items-center gap-3 w-full text-left disabled:cursor-not-allowed"
              >
                <div
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-700 ease-out",
                    index < currentStep && "bg-foreground/10 text-foreground/60",
                    index === currentStep &&
                      "bg-foreground text-background shadow-[0_0_20px_-5px_rgba(0,0,0,0.3)]",
                    index > currentStep && "bg-muted/50 text-muted-foreground/40"
                  )}
                >
                  {index < currentStep ? (
                    <CheckIcon
                      className="h-3.5 w-3.5 animate-in zoom-in duration-500"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <span className="text-xs font-medium tabular-nums">{step.id}</span>
                  )}
                  {index === currentStep && (
                    <div className="absolute inset-0 rounded-full bg-foreground/20 blur-md animate-pulse" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[13px] transition-colors duration-300",
                    index === currentStep && "font-medium text-foreground",
                    index < currentStep && "text-foreground/40",
                    index > currentStep && "text-muted-foreground/30"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Vertical connector line */}
              {index < COORDINATOR_STEPS.length - 1 && (
                <div className="ml-[15px] relative w-[1.5px] h-7 my-1 overflow-hidden">
                  <div className="absolute inset-0 bg-[rgba(207,207,207,0.4)]" />
                  <div
                    className="absolute inset-0 bg-foreground/30 transition-all duration-700 ease-out origin-top"
                    style={{ transform: `scaleY(${index < currentStep ? 1 : 0})` }}
                  />
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Progress at bottom */}
        <div className="mt-auto pt-8">
          <div className="text-[11px] text-muted-foreground/50 mb-2 tabular-nums">
            {currentStep + 1} of {COORDINATOR_STEPS.length}
          </div>
          <div className="overflow-hidden rounded-full bg-muted/30 h-[2px]">
            <div
              className="h-full bg-gradient-to-r from-foreground/60 to-foreground transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </aside>

      {/* ── RIGHT: Scrollable form content ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-3xl mx-auto py-12 px-10">

          {/* Step heading */}
          <div
            key={`heading-${currentStep}`}
            className="mb-8 animate-in fade-in slide-in-from-bottom-1 duration-500"
          >
            <h1 className="text-xl font-medium tracking-tight text-foreground">
              {COORDINATOR_STEPS[currentStep].label}
            </h1>
          </div>

          {/* Step body */}
          <div
            key={`body-${currentStep}`}
            className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700"
          >

            {/* ── Step 1: Line & Routing ────────────────────────────────────── */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coverageLine">Coverage Line / Extension</Label>
                  <Controller
                    name="lineRouting.coverageLine"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="coverageLine"
                        placeholder="+1 (555) 000-0000"
                        className="h-14 text-base transition-all duration-500 border-border/50 focus:border-foreground/20 bg-background/50"
                        autoFocus
                      />
                    )}
                  />
                  {form.formState.errors.lineRouting?.coverageLine && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.lineRouting.coverageLine.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="humanBackupNumber">Human Backup Number</Label>
                  <Controller
                    name="lineRouting.humanBackupNumber"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="humanBackupNumber"
                        placeholder="+1 (555) 000-0000"
                        className="h-14 text-base transition-all duration-500 border-border/50 focus:border-foreground/20 bg-background/50"
                      />
                    )}
                  />
                  {form.formState.errors.lineRouting?.humanBackupNumber && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.lineRouting.humanBackupNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="introScript">Intro Script</Label>
                  <Controller
                    name="lineRouting.introScript"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="introScript"
                        placeholder="You've reached the scheduling line for [Agency Name]. How can I help you today?"
                        className="min-h-[100px] text-base transition-all duration-500 border-border/50 focus:border-foreground/20 bg-background/50"
                      />
                    )}
                  />
                  {form.formState.errors.lineRouting?.introScript && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.lineRouting.introScript.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operatingMode">Operating Mode</Label>
                  <Controller
                    name="lineRouting.operatingMode"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-14 text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24/7">24/7</SelectItem>
                          <SelectItem value="business-hours">Business Hours Only</SelectItem>
                          <SelectItem value="after-hours">After-Hours Only</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Agency Timezone</Label>
                  <Controller
                    name="lineRouting.timezone"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-14 text-base">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                          <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
                          <SelectItem value="Pacific/Honolulu">Hawaii (HT)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.lineRouting?.timezone && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.lineRouting.timezone.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2: Call Types ────────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Always handled */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <h3 className="font-medium text-sm">Always handled by Coverage Coordinator</h3>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                    {[
                      { key: "caregiverCallOut", label: "Caregiver Call-Out" },
                      { key: "scheduleChange", label: "Schedule Change" },
                      { key: "rescheduleRequest", label: "Reschedule Request" },
                      { key: "missedVisit", label: "Missed Visit / Late Caregiver" },
                      { key: "shiftCoverageIssue", label: "Shift Coverage Issue" },
                      { key: "availabilityUpdate", label: "Availability Update" },
                      { key: "openShiftQuestion", label: "Open Shift Question" },
                      { key: "sameDayCoverageRequest", label: "Same-day coverage request" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between px-4 py-3">
                        <Label className="text-sm font-normal">{label}</Label>
                        <Controller
                          name={`callTypes.alwaysHandled.${key}` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Call-Out Intake ───────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  When a caregiver calls out, the Coverage Coordinator should collect:
                </p>
                <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                  {[
                    { key: "caregiverName", label: "Caregiver Name", locked: true },
                    { key: "caregiverId", label: "Caregiver ID", locked: true },
                    { key: "clientName", label: "Client Name", locked: true },
                    { key: "shiftDate", label: "Shift Date" },
                    { key: "shiftTime", label: "Shift Time" },
                    { key: "reasonForCallOut", label: "Reason for call-out" },
                    { key: "urgencyLevel", label: "Urgency level" },
                    { key: "isSameDayShift", label: "Is this a same-day shift?" },
                    { key: "notes", label: "Notes" },
                  ].map(({ key, label, locked }) => (
                    <div key={key} className="flex items-center justify-between px-4 py-3">
                      <Label className={cn("text-sm font-normal", locked && "text-muted-foreground")}>
                        {label}
                        {locked && <span className="ml-1.5 text-[10px] text-muted-foreground/60">required</span>}
                      </Label>
                      <Controller
                        name={`callOutIntake.intakeFields.${key}` as any}
                        control={form.control}
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={locked} />
                        )}
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border/50 p-4 bg-muted/20">
                  <h3 className="font-medium text-sm mb-3">After intake, the system should:</h3>
                  <div className="space-y-3">
                    {[
                      { key: "notifyScheduler", label: "Notify scheduler or coordinator" },
                      { key: "createCoverageTask", label: "Create a coverage task" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm font-normal">{label}</Label>
                        <Controller
                          name={`callOutIntake.afterIntake.${key}` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Coverage Workflow ─────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="rounded-lg border border-border/50 p-4 bg-background/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Should AI help fill open shifts automatically?</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Enable AI to find and contact available caregivers
                      </p>
                    </div>
                    <Controller
                      name="coverageWorkflow.autoFillShifts"
                      control={form.control}
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </div>

                {autoFillShifts ? (
                  <>
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm">AI should be able to:</h3>
                      <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                        {[
                          { key: "reviewAvailableCaregivers", label: "Review available caregivers" },
                          { key: "findBestMatch", label: "Find best-match caregivers" },
                          { key: "contactAutomatically", label: "Contact them automatically" },
                          { key: "collectConfirmation", label: "Collect interest or confirmation" },
                          { key: "rankMatches", label: "Rank matches" },
                          { key: "notifyScheduler", label: "Notify scheduler" },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex items-center justify-between px-4 py-3">
                            <Label className="text-sm font-normal">{label}</Label>
                            <Controller
                              name={`coverageWorkflow.aiCapabilities.${key}` as any}
                              control={form.control}
                              render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assignmentMode">Assignment mode</Label>
                      <Controller
                        name="coverageWorkflow.assignmentMode"
                        control={form.control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-14 text-base">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="suggest">Suggest best match only</SelectItem>
                              <SelectItem value="approval">Notify human for approval</SelectItem>
                              <SelectItem value="auto-assign">Auto-assign if rules are met</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-border/50 p-6 bg-muted/20 text-center">
                    <p className="text-sm text-muted-foreground">
                      AI will only collect call-out information. Manual coverage coordination required.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 5: Notifications ─────────────────────────────────────── */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <h3 className="font-medium text-sm">Escalate to human for</h3>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                    {[
                      { key: "medicalEmergency", label: "Medical emergency" },
                      { key: "abuseReport", label: "Abuse report" },
                      { key: "billingDispute", label: "Billing dispute" },
                      { key: "complaintEscalation", label: "Complaint escalation" },
                      { key: "highRiskIssue", label: "Any high-risk issue" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between px-4 py-3">
                        <Label className="text-sm font-normal">{label}</Label>
                        <Controller
                          name={`escalationsNotifications.escalateToHuman.${key}` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Send scheduling updates to</h3>
                  <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                    {[
                      { key: "scheduler", label: "Scheduler" },
                      { key: "coordinator", label: "Coordinator" },
                      { key: "admin", label: "Admin" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between px-4 py-3">
                        <Label className="text-sm font-normal">{label}</Label>
                        <Controller
                          name={`escalationsNotifications.sendUpdatesTo.${key}` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Delivery method</h3>
                  <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                    {[
                      { key: "sms", label: "SMS" },
                      { key: "email", label: "Email" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between px-4 py-3">
                        <Label className="text-sm font-normal">{label}</Label>
                        <Controller
                          name={`escalationsNotifications.deliveryMethod.${key}` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 p-4 bg-gradient-to-br from-background via-background to-muted/20">
                  <h3 className="font-medium text-sm mb-3">Configuration Summary</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Coverage Line</span>
                      <span className="font-medium text-foreground">
                        {watch("lineRouting.coverageLine") || "\u2014"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operating Mode</span>
                      <span className="font-medium text-foreground">
                        {watch("lineRouting.operatingMode") === "24/7" ? "24/7" :
                         watch("lineRouting.operatingMode") === "business-hours" ? "Business Hours" : "After-Hours"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto-fill Shifts</span>
                      <span className="font-medium text-foreground">
                        {watch("coverageWorkflow.autoFillShifts") ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Navigation ─────────────────────────────────────────────────── */}
          <div className="mt-10 space-y-4">
            <Button
              onClick={handleNext}
              disabled={saving}
              className="w-full h-12 group relative transition-all duration-300 hover:shadow-lg hover:shadow-foreground/5"
            >
              <span className="flex items-center justify-center gap-2 font-medium">
                {saving ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {currentStep === COORDINATOR_STEPS.length - 1
                      ? isEditing ? "Save" : "Save Coordinator"
                      : "Continue"}
                    <ArrowRightIcon
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5 duration-300"
                      strokeWidth={2}
                    />
                  </>
                )}
              </span>
            </Button>

            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="w-full text-center text-sm text-muted-foreground/60 hover:text-foreground/80 transition-all duration-300"
              >
                Go back
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
