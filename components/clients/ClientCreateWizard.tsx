"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientsStore } from "@/store/useClientsStore";
import {
  clientFormSchema,
  defaultClientFormValues,
  defaultMedicalValues,
  defaultNonMedicalValues,
  type ClientFormValues,
} from "@/lib/clients/schema";
import {
  WIZARD_STEPS,
  FIELDS_BY_STEP,
  FIELDS_STEP_3_NON_MEDICAL,
  FIELDS_STEP_3_MEDICAL,
} from "@/lib/clients/templates";
import { CareTypeToggle } from "./CareTypeToggle";
import { StepperHeader } from "./StepperHeader";
import { DynamicCarePlanSection } from "./DynamicCarePlanSection";
import { ReviewSummary } from "./ReviewSummary";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { ServiceMultiSelect } from "@/components/shared/service-multi-select";
import {
  Type,
  Calendar,
  UserCircle,
  Phone,
  Mail,
  MapPin,
  Contact,
  FileText,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const inputBase =
  "min-h-[28px] py-1 border-0 px-0 bg-transparent shadow-none focus-visible:ring-0 text-[14px] leading-[1.5] placeholder:text-neutral-400 caret-neutral-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 self-center";
const inputTitle = "text-[15px] min-h-[28px] leading-[1.5]";
const selectTriggerClass =
  "h-auto min-h-0 border-0 p-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 text-[14px] flex-1 min-w-0 [&>span]:text-neutral-400 data-[placeholder]:text-neutral-400 [&>svg]:hidden";
const rowClass = "flex items-center gap-3 pb-3 border-b border-neutral-100";
const iconClass = "h-5 w-5 text-neutral-400 shrink-0";
const iconSmall = "h-4 w-4 text-neutral-400 shrink-0";
const errorClass = "text-[11px] text-red-500 -mt-1 pl-8";
const dropdownContent = "rounded-xl border border-neutral-200/80 bg-white shadow-lg max-h-[200px] overflow-y-auto py-1.5";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"] as const;

interface ClientCreateWizardProps {
  onComplete?: () => void;
}

export function ClientCreateWizard({ onComplete }: ClientCreateWizardProps) {
  const router = useRouter();
  const addClient = useClientsStore((state) => state.addClient);
  const saveDraft = useClientsStore((state) => state.saveDraft);
  const clearDraft = useClientsStore((state) => state.clearDraft);
  const getDraft = useClientsStore((state) => state.getDraft);
  const [currentStep, setCurrentStep] = useState(1);
  const [showCareTypeConfirm, setShowCareTypeConfirm] = useState(false);
  const [pendingCareType, setPendingCareType] = useState<"non_medical" | "medical" | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: defaultClientFormValues,
    mode: "onBlur",
  });

  const { watch, setValue, getValues, trigger, reset, formState: { errors } } = form;
  const careType = watch("careType");

  // Hydrate from draft on mount (client-only)
  useEffect(() => {
    const draft = getDraft();
    if (draft && typeof draft === "object" && "careType" in draft) {
      reset(draft as ClientFormValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft on step change
  const persistDraft = useCallback(() => {
    saveDraft(getValues());
  }, [saveDraft, getValues]);

  const handleCareTypeChange = useCallback(
    (newType: "non_medical" | "medical") => {
      if (currentStep >= 3 && newType !== careType) {
        setPendingCareType(newType);
        setShowCareTypeConfirm(true);
      } else {
        setValue("careType", newType, { shouldValidate: false });
        if (newType === "medical") {
          Object.entries(defaultMedicalValues).forEach(([k, v]) => {
            if (["diagnosis", "physicianName", "physicianPhone", "medications", "skilledServices"].includes(k)) {
              setValue(k as keyof ClientFormValues, v as never);
            }
          });
        } else {
          Object.entries(defaultNonMedicalValues).forEach(([k, v]) => {
            if (["adlNeeds", "schedulePreferences"].includes(k)) {
              setValue(k as keyof ClientFormValues, v as never);
            }
          });
        }
      }
    },
    [currentStep, careType, setValue]
  );

  const onConfirmCareTypeSwitch = useCallback(() => {
    if (!pendingCareType) return;
    setValue("careType", pendingCareType);
    if (pendingCareType === "medical") {
      setValue("diagnosis", defaultMedicalValues.diagnosis);
      setValue("physicianName", defaultMedicalValues.physicianName);
      setValue("physicianPhone", defaultMedicalValues.physicianPhone);
      setValue("medications", defaultMedicalValues.medications);
      setValue("skilledServices", defaultMedicalValues.skilledServices);
    } else {
      setValue("adlNeeds", defaultNonMedicalValues.adlNeeds);
      setValue("schedulePreferences", defaultNonMedicalValues.schedulePreferences);
    }
    setPendingCareType(null);
    setShowCareTypeConfirm(false);
  }, [pendingCareType, setValue]);

  const step3Fields = careType === "medical" ? FIELDS_STEP_3_MEDICAL : FIELDS_STEP_3_NON_MEDICAL;
  const fieldsForStep = currentStep === 3 ? step3Fields : FIELDS_BY_STEP[currentStep as 1 | 2] ?? [];

  const handleNext = async () => {
    const valid = await trigger(fieldsForStep as (keyof ClientFormValues)[]);
    if (!valid) return;
    persistDraft();
    if (currentStep < 4) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    persistDraft();
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const values = getValues();
    try {
      const created = await addClient(values);
      
      // If services are selected, update client services
      if (values.serviceIds && values.serviceIds.length > 0) {
        try {
          await fetch(`/api/clients/${created.id}/services`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceIds: values.serviceIds }),
          });
        } catch (serviceError) {
          console.error("Failed to update client services:", serviceError);
          // Don't fail the entire creation for services error
        }
      }
      
      clearDraft();
      toast.success("Client created successfully");
      if (onComplete) {
        onComplete();
      } else {
        router.push(`/clients/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create client");
    }
  };

  const stepsConfig = WIZARD_STEPS.map((s) => ({ title: s.title }));

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <StepperHeader currentStep={currentStep} steps={stepsConfig} className="mb-6" />

        {currentStep === 1 && (
          <Card className="border border-neutral-200/60 shadow-md rounded-[20px] overflow-hidden bg-white">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[15px] font-semibold text-neutral-900">Basics</span>
            </div>
            <CardContent className="px-5 pb-5 pt-2 space-y-4">
              <div className="flex items-center gap-6">
                <Controller
                  name="avatar"
                  control={form.control}
                  render={({ field }) => (
                    <AvatarUpload
                      value={field.value}
                      onChange={field.onChange}
                      size="lg"
                    />
                  )}
                />
                <div className="flex-1">
                  <CareTypeToggle value={careType} onChange={handleCareTypeChange} />
                </div>
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Type className={iconClass} />
                  <Controller
                    name="firstName"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="firstName"
                        {...field}
                        placeholder="First name"
                        className={cn(inputBase, inputTitle)}
                      />
                    )}
                  />
                </div>
                {errors.firstName?.message && (
                  <p className={errorClass}>{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Type className={iconClass} />
                  <Controller
                    name="lastName"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="lastName"
                        {...field}
                        placeholder="Last name"
                        className={cn(inputBase, inputTitle)}
                      />
                    )}
                  />
                </div>
                {errors.lastName?.message && (
                  <p className={errorClass}>{errors.lastName.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Calendar className={iconClass} />
                  <Controller
                    name="dob"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="dob"
                        type="date"
                        {...field}
                        className={cn(inputBase, "text-neutral-700 [color-scheme:light]")}
                      />
                    )}
                  />
                </div>
                {errors.dob?.message && (
                  <p className={errorClass}>{errors.dob.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <UserCircle className={iconClass} />
                  <Controller
                    name="gender"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent className={dropdownContent}>
                          {GENDER_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <ChevronDown className={iconSmall} />
                </div>
                {errors.gender?.message && (
                  <p className={errorClass}>{errors.gender.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Phone className={iconClass} />
                  <Controller
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="phone"
                        type="tel"
                        {...field}
                        placeholder="Phone"
                        className={inputBase}
                      />
                    )}
                  />
                </div>
                {errors.phone?.message && (
                  <p className={errorClass}>{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Mail className={iconClass} />
                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="email"
                        type="email"
                        {...field}
                        placeholder="Email (optional)"
                        className={inputBase}
                      />
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="border border-neutral-200/60 shadow-md rounded-[20px] overflow-hidden bg-white">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[15px] font-semibold text-neutral-900">Contacts & Address</span>
              <p className="text-[13px] text-neutral-500">Address and emergency contacts</p>
            </div>
            <CardContent className="px-5 pb-5 pt-2 space-y-4">
              <div className="space-y-1">
                <div className={rowClass}>
                  <MapPin className={iconClass} />
                  <Controller
                    name="address.street"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="address.street"
                        {...field}
                        placeholder="Street"
                        className={cn(inputBase, "flex-1 min-w-0")}
                      />
                    )}
                  />
                </div>
                {errors.address?.street?.message && (
                  <p className={errorClass}>{errors.address.street.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className={rowClass}>
                    <MapPin className={iconClass} />
                    <Controller
                      name="address.city"
                      control={form.control}
                      render={({ field }) => (
                        <Input id="address.city" {...field} placeholder="City" className={cn(inputBase, "flex-1 min-w-0")} />
                      )}
                    />
                  </div>
                  {errors.address?.city?.message && (
                    <p className={errorClass}>{errors.address.city.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className={rowClass}>
                    <MapPin className={iconClass} />
                    <Controller
                      name="address.state"
                      control={form.control}
                      render={({ field }) => (
                        <Input id="address.state" {...field} placeholder="State" className={cn(inputBase, "flex-1 min-w-0")} />
                      )}
                    />
                  </div>
                  {errors.address?.state?.message && (
                    <p className={errorClass}>{errors.address.state.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className={rowClass}>
                    <MapPin className={iconClass} />
                    <Controller
                      name="address.zip"
                      control={form.control}
                      render={({ field }) => (
                        <Input id="address.zip" {...field} placeholder="ZIP" className={cn(inputBase, "flex-1 min-w-0")} />
                      )}
                    />
                  </div>
                  {errors.address?.zip?.message && (
                    <p className={errorClass}>{errors.address.zip.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Contact className={iconClass} />
                  <Controller
                    name="primaryContact.name"
                    control={form.control}
                    render={({ field }) => (
                      <Input {...field} placeholder="Primary contact name" className={cn(inputBase, "flex-1 min-w-0")} />
                    )}
                  />
                </div>
                {errors.primaryContact?.name?.message && (
                  <p className={errorClass}>{errors.primaryContact.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Contact className={iconClass} />
                  <Controller
                    name="primaryContact.relation"
                    control={form.control}
                    render={({ field }) => (
                      <Input {...field} placeholder="Relation" className={cn(inputBase, "flex-1 min-w-0")} />
                    )}
                  />
                </div>
                {errors.primaryContact?.relation?.message && (
                  <p className={errorClass}>{errors.primaryContact.relation.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Phone className={iconClass} />
                  <Controller
                    name="primaryContact.phone"
                    control={form.control}
                    render={({ field }) => (
                      <Input type="tel" {...field} placeholder="Primary contact phone" className={cn(inputBase, "flex-1 min-w-0")} />
                    )}
                  />
                </div>
                {errors.primaryContact?.phone?.message && (
                  <p className={errorClass}>{errors.primaryContact.phone.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Contact className={iconClass} />
                  <Controller
                    name="emergencyContact.name"
                    control={form.control}
                    render={({ field }) => (
                      <Input {...field} placeholder="Emergency contact name" className={cn(inputBase, "flex-1 min-w-0")} />
                    )}
                  />
                </div>
                {errors.emergencyContact?.name?.message && (
                  <p className={errorClass}>{errors.emergencyContact.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className={rowClass}>
                  <Phone className={iconClass} />
                  <Controller
                    name="emergencyContact.phone"
                    control={form.control}
                    render={({ field }) => (
                      <Input type="tel" {...field} placeholder="Emergency contact phone" className={cn(inputBase, "flex-1 min-w-0")} />
                    )}
                  />
                </div>
                {errors.emergencyContact?.phone?.message && (
                  <p className={errorClass}>{errors.emergencyContact.phone.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-start gap-3 pb-3 border-b border-neutral-100">
                  <FileText className={cn(iconClass, "mt-1")} />
                  <Controller
                    name="notes"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        id="notes"
                        {...field}
                        rows={3}
                        placeholder="Notes (optional)"
                        className="flex-1 min-h-0 border-0 rounded-none p-0 bg-transparent shadow-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[14px] resize-none placeholder:text-neutral-400"
                      />
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="border border-neutral-200/60 shadow-md rounded-[20px] overflow-hidden bg-white">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[15px] font-semibold text-neutral-900">Care Plan</span>
              <p className="text-[13px] text-neutral-500">
                {careType === "medical"
                  ? "Diagnosis, physician, medications, skilled services"
                  : "ADL needs and schedule preferences"}
              </p>
            </div>
            <CardContent className="px-5 pb-5 pt-2 space-y-4">
              <div>
                <CareTypeToggle value={careType} onChange={handleCareTypeChange} />
              </div>
              <DynamicCarePlanSection careType={careType} />
              <div className="space-y-4">
                <h3 className="text-[15px] font-semibold text-neutral-900">Services</h3>
                <Controller
                  name="serviceIds"
                  control={form.control}
                  render={({ field }) => (
                    <ServiceMultiSelect
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select services for this client..."
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="border border-neutral-200/60 shadow-md rounded-[20px] overflow-hidden bg-white">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[15px] font-semibold text-neutral-900">Review & Create</span>
              <p className="text-[13px] text-neutral-500">Confirm details before creating the client.</p>
            </div>
            <CardContent className="px-5 pb-5 pt-2">
              <ReviewSummary values={getValues()} />
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="border-neutral-200 text-[14px]"
          >
            Back
          </Button>
          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="h-11 bg-neutral-900 hover:bg-neutral-800 text-white text-[14px] font-semibold rounded-[14px] px-6"
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              className="h-11 bg-neutral-900 hover:bg-neutral-800 text-white text-[14px] font-semibold rounded-[14px] px-6"
            >
              Create Client
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showCareTypeConfirm} onOpenChange={(open) => !open && setShowCareTypeConfirm(false)}>
        <DialogContent className="max-w-md border-neutral-200">
          <DialogHeader>
            <DialogTitle>Switch care type?</DialogTitle>
            <DialogDescription>
              Switching care type will reset Care Plan fields. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setPendingCareType(null); setShowCareTypeConfirm(false); }}>
              Cancel
            </Button>
            <Button onClick={onConfirmCareTypeSwitch}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
