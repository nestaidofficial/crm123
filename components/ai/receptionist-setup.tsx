"use client";

import { useState, useEffect, useRef } from "react";
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
  RECEPTIONIST_STEPS,
  FIELDS_BY_STEP,
  receptionistSetupSchema,
  defaultReceptionistSetupValues,
  type ReceptionistSetupValues,
} from "@/lib/ai/receptionist-schema";
import { useReceptionistStore } from "@/store/useReceptionistStore";

interface ReceptionistSetupProps {
  onComplete?: () => void;
}

const TIME_OPTIONS = [
  "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
];

const DAYS_OF_WEEK = [
  { key: "hoursMonday" as const, label: "Monday" },
  { key: "hoursTuesday" as const, label: "Tuesday" },
  { key: "hoursWednesday" as const, label: "Wednesday" },
  { key: "hoursThursday" as const, label: "Thursday" },
  { key: "hoursFriday" as const, label: "Friday" },
  { key: "hoursSaturday" as const, label: "Saturday" },
  { key: "hoursSunday" as const, label: "Sunday" },
];

/** Parse "9:00 AM - 5:00 PM" into { start, end } or null if Closed */
function parseDayHours(value: string | undefined): { start: string; end: string } | null {
  if (!value || value === "Closed") return null;
  const parts = value.split(" - ");
  if (parts.length === 2) return { start: parts[0].trim(), end: parts[1].trim() };
  return null;
}

/** Format start/end back to "9:00 AM - 5:00 PM" */
function formatDayHours(start: string, end: string): string {
  return `${start} - ${end}`;
}

/**
 * Deep-merge a possibly-stale persisted config with defaults.
 * Ensures new fields added in schema updates always have valid values.
 */
function mergeWithDefaults(config: ReceptionistSetupValues | null): ReceptionistSetupValues {
  if (!config) return defaultReceptionistSetupValues;
  return {
    ...defaultReceptionistSetupValues,
    ...config,
    phoneSetup: {
      ...defaultReceptionistSetupValues.phoneSetup,
      ...config.phoneSetup,
    },
    caregiverIntake: {
      ...defaultReceptionistSetupValues.caregiverIntake,
      ...config.caregiverIntake,
      requiredFields: {
        ...defaultReceptionistSetupValues.caregiverIntake.requiredFields,
        ...(config.caregiverIntake?.requiredFields ?? {}),
      },
    },
  };
}

export function ReceptionistSetup({ onComplete }: ReceptionistSetupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const config = useReceptionistStore((state) => state.config);
  const saving = useReceptionistStore((state) => state.saving);
  const loading = useReceptionistStore((state) => state.loading);
  const fetchConfig = useReceptionistStore((state) => state.fetchConfig);
  const saveConfig = useReceptionistStore((state) => state.saveConfig);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<ReceptionistSetupValues>({
    resolver: zodResolver(receptionistSetupSchema),
    defaultValues: mergeWithDefaults(config),
    mode: "onChange",
  });

  const { watch, trigger, handleSubmit, reset, setValue, getValues } = form;
  const businessHours = watch("phoneSetup.businessHours");

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
    if (currentStep < RECEPTIONIST_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit(onActivate)();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const onActivate = async (data: ReceptionistSetupValues) => {
    const success = await saveConfig(data);
    if (success) {
      toast.success("Receptionist settings saved");
      onComplete?.();
    } else {
      toast.error("Failed to save configuration");
    }
  };

  const progress = ((currentStep + 1) / RECEPTIONIST_STEPS.length) * 100;

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
            AI Receptionist
          </h2>
        </div>

        {/* Step list */}
        <nav className="flex flex-col">
          {RECEPTIONIST_STEPS.map((step, index) => (
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

              {/* Vertical connector line, centered under the circle */}
              {index < RECEPTIONIST_STEPS.length - 1 && (
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
            {currentStep + 1} of {RECEPTIONIST_STEPS.length}
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
              {RECEPTIONIST_STEPS[currentStep].label}
            </h1>
          </div>

          {/* Step body */}
          <div
            key={`body-${currentStep}`}
            className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700"
          >

            {/* ── Step 1: Phone & Setup ─────────────────────────────────────── */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agencyName">Agency Name</Label>
                  <Controller
                    name="phoneSetup.agencyName"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="agencyName"
                        placeholder="Your agency name"
                        className="h-14 text-base transition-all duration-500 border-border/50 focus:border-foreground/20 bg-background/50"
                        autoFocus
                      />
                    )}
                  />
                  {form.formState.errors.phoneSetup?.agencyName && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.phoneSetup.agencyName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receptionLine">Reception Line / Extension</Label>
                  <Controller
                    name="phoneSetup.receptionLine"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="receptionLine"
                        placeholder="+1 (555) 000-0000"
                        className="h-14 text-base transition-all duration-500 border-border/50 focus:border-foreground/20 bg-background/50"
                      />
                    )}
                  />
                  {form.formState.errors.phoneSetup?.receptionLine && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.phoneSetup.receptionLine.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="escalationNumber">Human Escalation Number</Label>
                  <Controller
                    name="phoneSetup.escalationNumber"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="escalationNumber"
                        placeholder="+1 (555) 000-0000"
                        className="h-14 text-base transition-all duration-500 border-border/50 focus:border-foreground/20 bg-background/50"
                      />
                    )}
                  />
                  {form.formState.errors.phoneSetup?.escalationNumber && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.phoneSetup.escalationNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greetingScript">Greeting Script</Label>
                  <Controller
                    name="phoneSetup.greetingScript"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="greetingScript"
                        placeholder="Thank you for calling [Agency Name], how can I help you today?"
                        className="min-h-[100px] text-base transition-all duration-500 border-border/50 focus:border-foreground/20 bg-background/50"
                      />
                    )}
                  />
                  {form.formState.errors.phoneSetup?.greetingScript && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.phoneSetup.greetingScript.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="servicesSummary">Services Summary</Label>
                  <p className="text-xs text-muted-foreground">
                    Describe your agency&apos;s services. This will be included in the AI&apos;s knowledge. Leave blank to use a default home care services description.
                  </p>
                  <Controller
                    name="phoneSetup.servicesSummary"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        id="servicesSummary"
                        placeholder="e.g. We provide personal care, companion care, skilled nursing, memory care, respite care, and 24-hour live-in care."
                        className="min-h-[80px] text-base transition-all duration-500 border-border/50 focus:border-foreground/20 bg-background/50"
                      />
                    )}
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Business Hours</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {businessHours === "24/7" ? "24/7" : "Custom"}
                      </span>
                      <Controller
                        name="phoneSetup.businessHours"
                        control={form.control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value === "24/7"}
                            onCheckedChange={(checked) =>
                              field.onChange(checked ? "24/7" : "custom")
                            }
                          />
                        )}
                      />
                    </div>
                  </div>

                  {businessHours === "custom" && (
                    <div className="space-y-3 rounded-lg border border-border/50 p-4 bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-2">
                        Set hours for each day. Toggle off to mark a day as Closed.
                      </p>
                      {DAYS_OF_WEEK.map((day) => {
                        const currentValue = watch(`phoneSetup.${day.key}`);
                        const parsed = parseDayHours(currentValue);
                        const isClosed = !parsed;

                        return (
                          <div key={day.key} className="flex items-center gap-3">
                            <span className="w-24 text-sm font-medium shrink-0">{day.label}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground w-12">
                                {isClosed ? "Closed" : "Open"}
                              </span>
                              <Switch
                                checked={!isClosed}
                                onCheckedChange={(open) => {
                                  if (open) {
                                    setValue(
                                      `phoneSetup.${day.key}`,
                                      "9:00 AM - 5:00 PM"
                                    );
                                  } else {
                                    setValue(`phoneSetup.${day.key}`, "Closed");
                                  }
                                }}
                              />
                            </div>
                            {!isClosed && parsed && (
                              <div className="flex items-center gap-2 flex-1">
                                <Select
                                  value={parsed.start}
                                  onValueChange={(v) =>
                                    setValue(
                                      `phoneSetup.${day.key}`,
                                      formatDayHours(v, parsed.end)
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-9 text-sm flex-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIME_OPTIONS.map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-xs text-muted-foreground">to</span>
                                <Select
                                  value={parsed.end}
                                  onValueChange={(v) =>
                                    setValue(
                                      `phoneSetup.${day.key}`,
                                      formatDayHours(parsed.start, v)
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-9 text-sm flex-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIME_OPTIONS.map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="space-y-2 pt-3 border-t border-border/30">
                        <Label htmlFor="businessHoursLabel" className="text-sm">
                          Hours Summary Label
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Optional short label, e.g. &quot;Mon-Fri 9-5, Closed weekends&quot;
                        </p>
                        <Controller
                          name="phoneSetup.businessHoursLabel"
                          control={form.control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              id="businessHoursLabel"
                              placeholder="Mon-Fri 9 AM - 5 PM, Closed weekends"
                              className="h-10 text-sm"
                            />
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2: Call Routing ──────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {[
                  {
                    dot: "bg-amber-500",
                    heading: "Route to Coverage Coordinator",
                    prefix: "callRouting.routeToCoordinator",
                    items: [
                      { key: "caregiverCallOut", label: "Caregiver Call-Out" },
                      { key: "scheduleChange", label: "Schedule Change" },
                      { key: "rescheduleRequest", label: "Reschedule Request" },
                      { key: "missedVisit", label: "Missed Visit / Late Caregiver" },
                      { key: "missedClocking", label: "Missed Clocking In/Out" },
                      { key: "shiftCoverageIssue", label: "Shift Coverage Issue" },
                      { key: "availabilityUpdate", label: "Availability Update" },
                      { key: "openShiftQuestion", label: "Open Shift Question" },
                    ],
                  },
                  {
                    dot: "bg-red-500",
                    heading: "Escalate to Human",
                    prefix: "callRouting.escalateToHuman",
                    items: [
                      { key: "billingQuestion", label: "Billing Question" },
                      { key: "billingDispute", label: "Billing Dispute" },
                      { key: "complaintEscalation", label: "Complaint Escalation" },
                      { key: "urgentIssue", label: "Any issue marked urgent by caller" },
                    ],
                  },
                ].map(({ dot, heading, prefix, items }) => (
                  <div key={heading} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", dot)} />
                      <h3 className="font-medium text-sm">{heading}</h3>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                      {items.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between px-4 py-3">
                          <Label className="text-sm font-normal">{label}</Label>
                          <Controller
                            name={`${prefix}.${key}` as any}
                            control={form.control}
                            render={({ field }) => (
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Step 3: Client Intake ─────────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Fields the AI will collect from new potential clients.
                </p>
                <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                  {[
                    { key: "clientName", label: "Client Name", locked: true },
                    { key: "phoneNumber", label: "Phone Number", locked: true },
                    { key: "email", label: "Email" },
                    { key: "address", label: "Address" },
                    { key: "typeOfCare", label: "Type of care needed" },
                    { key: "preferredDaysHours", label: "Preferred days / hours" },
                    { key: "estimatedHoursPerWeek", label: "Estimated hours per week" },
                    { key: "preferredStartDate", label: "Preferred start date" },
                    { key: "notes", label: "Notes / special requests" },
                  ].map(({ key, label, locked }) => (
                    <div key={key} className="flex items-center justify-between px-4 py-3">
                      <Label className={cn("text-sm font-normal", locked && "text-muted-foreground")}>
                        {label}
                        {locked && <span className="ml-1.5 text-[10px] text-muted-foreground/60">required</span>}
                      </Label>
                      <Controller
                        name={`clientIntake.fields.${key}` as any}
                        control={form.control}
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={locked} />
                        )}
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border/50 p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Auto-schedule consultation?</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Book and notify coordinator automatically
                      </p>
                    </div>
                    <Controller
                      name="clientIntake.autoScheduleConsultation"
                      control={form.control}
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Caregiver Intake ──────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Fields the AI will collect from caregiver applicants. Mark fields as required to ensure the AI always collects them.
                </p>
                <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                  {/* Header row */}
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Field</span>
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16 text-center">Required</span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16 text-center">Enabled</span>
                    </div>
                  </div>
                  {[
                    { key: "fullName", label: "Full Name" },
                    { key: "phoneNumber", label: "Phone Number" },
                    { key: "email", label: "Email" },
                    { key: "location", label: "Location" },
                    { key: "experience", label: "Experience" },
                    { key: "certifications", label: "Certifications" },
                    { key: "availability", label: "Availability" },
                    { key: "transportation", label: "Transportation" },
                    { key: "notes", label: "Notes" },
                  ].map(({ key, label }) => {
                    const isEnabled = watch(`caregiverIntake.fields.${key}` as any);
                    const isRequired = watch(`caregiverIntake.requiredFields.${key}` as any);

                    return (
                      <div key={key} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-normal">{label}</Label>
                          {isEnabled && isRequired && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Required
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="w-16 flex justify-center">
                            <Controller
                              name={`caregiverIntake.requiredFields.${key}` as any}
                              control={form.control}
                              render={({ field }) => (
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    // If marking as required, also enable the field
                                    if (checked) {
                                      setValue(`caregiverIntake.fields.${key}` as any, true);
                                    }
                                  }}
                                  disabled={!isEnabled}
                                />
                              )}
                            />
                          </div>
                          <div className="w-16 flex justify-center">
                            <Controller
                              name={`caregiverIntake.fields.${key}` as any}
                              control={form.control}
                              render={({ field }) => (
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    // If disabling, also unset required
                                    if (!checked) {
                                      setValue(`caregiverIntake.requiredFields.${key}` as any, false);
                                    }
                                  }}
                                />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 5: Notifications ─────────────────────────────────────── */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Send call summaries to</h3>
                  <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                    {[{ key: "sms", label: "SMS" }, { key: "email", label: "Email" }].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between px-4 py-3">
                        <Label className="text-sm font-normal">{label}</Label>
                        <Controller
                          name={`notifications.sendSummariesTo.${key}` as any}
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
                  <h3 className="font-medium text-sm">Notify on new intake</h3>
                  <div className="rounded-lg border border-border/50 bg-background/50 divide-y divide-border/30">
                    {[
                      { key: "coordinator", label: "Coordinator" },
                      { key: "scheduler", label: "Scheduler" },
                      { key: "admin", label: "Admin" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between px-4 py-3">
                        <Label className="text-sm font-normal">{label}</Label>
                        <Controller
                          name={`notifications.notifyOnIntake.${key}` as any}
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
                      <span>Agency</span>
                      <span className="font-medium text-foreground">
                        {watch("phoneSetup.agencyName") || "\u2014"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reception Line</span>
                      <span className="font-medium text-foreground">
                        {watch("phoneSetup.receptionLine") || "\u2014"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Business Hours</span>
                      <span className="font-medium text-foreground">
                        {watch("phoneSetup.businessHours") === "24/7" ? "24/7" : "Custom"}
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
                    {currentStep === RECEPTIONIST_STEPS.length - 1 ? "Save Receptionist" : "Continue"}
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
