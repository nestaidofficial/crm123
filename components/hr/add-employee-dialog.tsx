"use client";

/**
 * Add Employee / Caregiver wizard form (3 steps)
 * Follows the same pattern as ClientCreateWizard
 */

import { useState, useEffect, useCallback } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepperHeader } from "@/components/clients/StepperHeader";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { uploadEmployeeAvatar } from "@/lib/supabase/storage";
import { useEmployeesStore } from "@/store/useEmployeesStore";
import { CreateEmployeeSchema, type CreateEmployeeInput } from "@/lib/validation/employee.schema";
import {
  Type,
  Calendar,
  Phone,
  Mail,
  MapPin,
  UserCircle,
  Briefcase,
  Banknote,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPLOYEE_STEPS = [
  { title: "Personal" },
  { title: "Employment" },
  { title: "Review" },
];

const STATE_OPTIONS: { value: string; label: string }[] = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
];

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"] as const;

/* Nessa form design – .cursor/rules/nessa-form-design.mdc */
const rowClass = "flex items-center gap-3 pb-3 border-b border-neutral-100";
const iconClass = "h-5 w-5 text-neutral-400 shrink-0";
const iconSmall = "h-4 w-4 text-neutral-400 shrink-0";
const inputBase =
  "min-h-[28px] py-1 border-0 px-0 bg-transparent shadow-none focus-visible:ring-0 text-[14px] leading-[1.5] placeholder:text-neutral-400 caret-neutral-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 min-w-0 self-center";
const inputTitle = "text-[15px] min-h-[28px] leading-[1.5]";
const selectTriggerClass =
  "h-auto min-h-0 border-0 p-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 text-[14px] flex-1 min-w-0 [&>span]:text-neutral-400 data-[placeholder]:text-neutral-400 [&>svg]:hidden";
const dropdownContent = "rounded-xl border border-neutral-200/80 bg-white shadow-lg max-h-[200px] overflow-y-auto py-1.5";
const cardClass = "border border-neutral-200/60 shadow-md rounded-[20px] overflow-hidden bg-white";
const cardHeaderClass = "flex items-center justify-between px-5 py-3";
const cardTitleClass = "text-[15px] font-semibold text-neutral-900";
const cardContentClass = "px-5 pb-5 pt-2 space-y-4";
const errorClass = "text-[11px] text-red-500 -mt-1 pl-8";

// Default form values
const defaultEmployeeValues: Partial<CreateEmployeeInput> = {
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  phone: "",
  dob: "",
  ssn: "",
  gender: undefined,
  avatarUrl: "",
  role: "caregiver",
  status: "active",
  startDate: "",
  department: "",
  supervisor: "",
  address: {
    street: "",
    city: "",
    state: "",
    zip: "",
  },
  emergencyContact: {
    name: "",
    phone: "",
  },
  payRate: 0,
  payType: "hourly",
  payroll: {
    bankAccount: "",
    routingNumber: "",
    bankName: "",
  },
  workAuthorization: "",
  notes: "",
  skills: [],
};

// Fields to validate per step
const STEP_1_FIELDS: (keyof CreateEmployeeInput)[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address",
  "emergencyContact",
];

const STEP_2_FIELDS: (keyof CreateEmployeeInput)[] = [
  "role",
  "startDate",
  "department",
  "supervisor",
  "payRate",
  "payType",
];

export function AddEmployeeDialog({ open, onOpenChange }: AddEmployeeDialogProps) {
  const addEmployee = useEmployeesStore((state) => state.addEmployee);
  const loading = useEmployeesStore((state) => state.loading);
  const saveDraft = useEmployeesStore((state) => state.saveDraft);
  const clearDraft = useEmployeesStore((state) => state.clearDraft);
  const getDraft = useEmployeesStore((state) => state.getDraft);
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues: defaultEmployeeValues as CreateEmployeeInput,
    mode: "onBlur",
  });

  const { watch, setValue, getValues, trigger, reset, formState: { errors } } = form;

  // Hydrate from draft on mount (client-only)
  useEffect(() => {
    if (open) {
      const draft = getDraft();
      if (draft && typeof draft === "object") {
        reset(draft as CreateEmployeeInput);
      }
    }
  }, [open, getDraft, reset]);

  // Persist draft on step change
  const persistDraft = useCallback(() => {
    saveDraft(getValues());
  }, [saveDraft, getValues]);

  const handleNext = async () => {
    const fieldsForStep = currentStep === 1 ? STEP_1_FIELDS : STEP_2_FIELDS;
    const valid = await trigger(fieldsForStep);
    if (!valid) return;
    persistDraft();
    if (currentStep < 3) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    persistDraft();
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const values = getValues();
    try {
      const newEmployee = await addEmployee({
        ...values,
        avatar: values.avatarUrl || undefined,
      } as Parameters<typeof addEmployee>[0]);
      if (newEmployee) {
        clearDraft();
        toast.success("Employee created successfully");
        onOpenChange(false);
        // Reset form for next use
        reset(defaultEmployeeValues as CreateEmployeeInput);
        setCurrentStep(1);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create employee");
    }
  };

  const stepsConfig = EMPLOYEE_STEPS.map((s) => ({ title: s.title }));
  const formValues = watch();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl overflow-y-auto p-0"
      >
        <div className="p-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-h1 text-neutral-900">
              Add Employee / Caregiver
            </SheetTitle>
            <SheetDescription className="text-body-m text-neutral-500">
              Add information to onboard a new caregiver.
            </SheetDescription>
          </SheetHeader>

          <FormProvider {...form}>
            <div className="space-y-6">
              <StepperHeader currentStep={currentStep} steps={stepsConfig} className="mb-6" />

              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <Card className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span className={cardTitleClass}>Personal Information</span>
                  </div>
                  <CardContent className={cardContentClass}>
                    <div className="flex justify-center pb-4">
                      <Controller
                        name="avatarUrl"
                        control={form.control}
                        render={({ field }) => (
                          <AvatarUpload
                            value={field.value}
                            onChange={field.onChange}
                            uploadFn={uploadEmployeeAvatar}
                            size="lg"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <div className={rowClass}>
                        <Type className={iconClass} />
                        <Input
                          placeholder="First name"
                          className={cn(inputBase, inputTitle)}
                          {...form.register("firstName")}
                        />
                      </div>
                      {errors.firstName && (
                        <p className={errorClass}>{errors.firstName.message}</p>
                      )}
                    </div>
                    <div>
                      <div className={rowClass}>
                        <Type className={iconClass} />
                        <Input
                          placeholder="Last name"
                          className={cn(inputBase, inputTitle)}
                          {...form.register("lastName")}
                        />
                      </div>
                      {errors.lastName && (
                        <p className={errorClass}>{errors.lastName.message}</p>
                      )}
                    </div>
                    <div className={rowClass}>
                      <Type className={iconClass} />
                      <Input
                        placeholder="Middle name"
                        className={inputBase}
                        {...form.register("middleName")}
                      />
                    </div>
                    <div className={rowClass}>
                      <Calendar className={iconClass} />
                      <Input
                        type="date"
                        className={cn(inputBase, "text-neutral-700 [color-scheme:light]")}
                        {...form.register("dob")}
                      />
                    </div>
                    <div className={rowClass}>
                      <Type className={iconClass} />
                      <Input
                        placeholder="SSN (XXX-XX-XXXX)"
                        className={inputBase}
                        {...form.register("ssn")}
                      />
                    </div>
                    <div>
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
                                {GENDER_OPTIONS.map((gender) => (
                                  <SelectItem key={gender} value={gender}>
                                    {gender}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <ChevronDown className={iconSmall} />
                      </div>
                    </div>
                    <div>
                      <div className={rowClass}>
                        <Phone className={iconClass} />
                        <Input
                          type="tel"
                          placeholder="Phone"
                          className={inputBase}
                          {...form.register("phone")}
                        />
                      </div>
                      {errors.phone && (
                        <p className={errorClass}>{errors.phone.message}</p>
                      )}
                    </div>
                    <div>
                      <div className={rowClass}>
                        <Mail className={iconClass} />
                        <Input
                          type="email"
                          placeholder="Email"
                          className={inputBase}
                          {...form.register("email")}
                        />
                      </div>
                      {errors.email && (
                        <p className={errorClass}>{errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <div className={rowClass}>
                        <MapPin className={iconClass} />
                        <Input
                          placeholder="Street address"
                          className={inputBase}
                          {...form.register("address.street")}
                        />
                      </div>
                      {errors.address?.street && (
                        <p className={errorClass}>{errors.address.street.message}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className={rowClass}>
                          <MapPin className={iconClass} />
                          <Input
                            placeholder="City"
                            className={inputBase}
                            {...form.register("address.city")}
                          />
                        </div>
                        {errors.address?.city && (
                          <p className={errorClass}>{errors.address.city.message}</p>
                        )}
                      </div>
                      <div>
                        <div className={rowClass}>
                          <MapPin className={iconClass} />
                          <Controller
                            name="address.state"
                            control={form.control}
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className={selectTriggerClass}>
                                  <SelectValue placeholder="State" />
                                </SelectTrigger>
                                <SelectContent className={dropdownContent}>
                                  {STATE_OPTIONS.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <ChevronDown className={iconSmall} />
                        </div>
                        {errors.address?.state && (
                          <p className={errorClass}>{errors.address.state.message}</p>
                        )}
                      </div>
                      <div>
                        <div className={rowClass}>
                          <MapPin className={iconClass} />
                          <Input
                            placeholder="ZIP"
                            className={inputBase}
                            {...form.register("address.zip")}
                          />
                        </div>
                        {errors.address?.zip && (
                          <p className={errorClass}>{errors.address.zip.message}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className={rowClass}>
                        <UserCircle className={iconClass} />
                        <Input
                          placeholder="Emergency contact name"
                          className={inputBase}
                          {...form.register("emergencyContact.name")}
                        />
                      </div>
                      {errors.emergencyContact?.name && (
                        <p className={errorClass}>{errors.emergencyContact.name.message}</p>
                      )}
                    </div>
                    <div>
                      <div className={rowClass}>
                        <Phone className={iconClass} />
                        <Input
                          type="tel"
                          placeholder="Emergency contact phone"
                          className={inputBase}
                          {...form.register("emergencyContact.phone")}
                        />
                      </div>
                      {errors.emergencyContact?.phone && (
                        <p className={errorClass}>{errors.emergencyContact.phone.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Employment Information */}
              {currentStep === 2 && (
                <Card className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span className={cardTitleClass}>Employment Information</span>
                  </div>
                  <CardContent className={cardContentClass}>
                    <div>
                      <div className={rowClass}>
                        <Briefcase className={iconClass} />
                        <Controller
                          name="role"
                          control={form.control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="Employee type" />
                              </SelectTrigger>
                              <SelectContent className={dropdownContent}>
                                <SelectItem value="caregiver">Caregiver</SelectItem>
                                <SelectItem value="cna">CNA</SelectItem>
                                <SelectItem value="hha">HHA</SelectItem>
                                <SelectItem value="lpn">LPN</SelectItem>
                                <SelectItem value="rn">RN</SelectItem>
                                <SelectItem value="admin">Administrative Staff</SelectItem>
                                <SelectItem value="coordinator">Care Coordinator</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <ChevronDown className={iconSmall} />
                      </div>
                      {errors.role && (
                        <p className={errorClass}>{errors.role.message}</p>
                      )}
                    </div>
                    <div>
                      <div className={rowClass}>
                        <Calendar className={iconClass} />
                        <Input
                          type="date"
                          className={cn(inputBase, "text-neutral-700 [color-scheme:light]")}
                          {...form.register("startDate")}
                        />
                      </div>
                      {errors.startDate && (
                        <p className={errorClass}>{errors.startDate.message}</p>
                      )}
                    </div>
                    <div>
                      <div className={rowClass}>
                        <Briefcase className={iconClass} />
                        <Controller
                          name="department"
                          control={form.control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="Department" />
                              </SelectTrigger>
                              <SelectContent className={dropdownContent}>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="Care Service">Care Service</SelectItem>
                                <SelectItem value="HR">HR</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <ChevronDown className={iconSmall} />
                      </div>
                      {errors.department && (
                        <p className={errorClass}>{errors.department.message}</p>
                      )}
                    </div>
                    <div>
                      <div className={rowClass}>
                        <UserCircle className={iconClass} />
                        <Input
                          placeholder="Supervisor"
                          className={inputBase}
                          {...form.register("supervisor")}
                        />
                      </div>
                      {errors.supervisor && (
                        <p className={errorClass}>{errors.supervisor.message}</p>
                      )}
                    </div>
                    <p className="text-[13px] text-neutral-700 pt-1">Payroll</p>
                    <div>
                      <div className={rowClass}>
                        <Banknote className={iconClass} />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Pay rate"
                          className={inputBase}
                          {...form.register("payRate")}
                        />
                      </div>
                      {errors.payRate && (
                        <p className={errorClass}>{errors.payRate.message}</p>
                      )}
                    </div>
                    <div>
                      <div className={rowClass}>
                        <Banknote className={iconClass} />
                        <Controller
                          name="payType"
                          control={form.control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="Pay type" />
                              </SelectTrigger>
                              <SelectContent className={dropdownContent}>
                                <SelectItem value="hourly">Hourly</SelectItem>
                                <SelectItem value="salary">Salary</SelectItem>
                                <SelectItem value="per-visit">Per Visit</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <ChevronDown className={iconSmall} />
                      </div>
                      {errors.payType && (
                        <p className={errorClass}>{errors.payType.message}</p>
                      )}
                    </div>
                    <div className={rowClass}>
                      <Banknote className={iconClass} />
                      <Input
                        placeholder="Bank account (direct deposit)"
                        className={inputBase}
                        {...form.register("payroll.bankAccount")}
                      />
                    </div>
                    <div className={rowClass}>
                      <Banknote className={iconClass} />
                      <Input
                        placeholder="Routing number"
                        className={inputBase}
                        {...form.register("payroll.routingNumber")}
                      />
                    </div>
                    <div className={rowClass}>
                      <Banknote className={iconClass} />
                      <Input
                        placeholder="Bank name"
                        className={inputBase}
                        {...form.register("payroll.bankName")}
                      />
                    </div>
                    <p className="text-[13px] text-neutral-700 pt-1">Work authorization</p>
                    <div className={rowClass}>
                      <Briefcase className={iconClass} />
                      <Input
                        placeholder="Authorization status (e.g., U.S. Citizen, Work Visa)"
                        className={inputBase}
                        {...form.register("workAuthorization")}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Review & Create */}
              {currentStep === 3 && (
                <Card className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span className={cardTitleClass}>Review & Create</span>
                    <p className="text-[13px] text-neutral-500">Confirm details before creating the employee.</p>
                  </div>
                  <CardContent className={cardContentClass}>
                    <div className="space-y-6">
                      {/* Personal Information Summary */}
                      <div>
                        <h4 className="text-[14px] font-semibold text-neutral-900 mb-3">Personal Information</h4>
                        <div className="space-y-2 text-[13px]">
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Name:</span>
                            <span className="text-neutral-900 font-medium">
                              {formValues.firstName} {formValues.middleName} {formValues.lastName}
                            </span>
                          </div>
                          {formValues.dob && (
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Date of Birth:</span>
                              <span className="text-neutral-900">{formValues.dob}</span>
                            </div>
                          )}
                          {formValues.gender && (
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Gender:</span>
                              <span className="text-neutral-900">{formValues.gender}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Email:</span>
                            <span className="text-neutral-900">{formValues.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Phone:</span>
                            <span className="text-neutral-900">{formValues.phone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Address:</span>
                            <span className="text-neutral-900 text-right">
                              {formValues.address.street}, {formValues.address.city}, {formValues.address.state} {formValues.address.zip}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Emergency Contact:</span>
                            <span className="text-neutral-900 text-right">
                              {formValues.emergencyContact.name} - {formValues.emergencyContact.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Employment Information Summary */}
                      <div>
                        <h4 className="text-[14px] font-semibold text-neutral-900 mb-3">Employment Information</h4>
                        <div className="space-y-2 text-[13px]">
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Role:</span>
                            <span className="text-neutral-900 capitalize">{formValues.role}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Start Date:</span>
                            <span className="text-neutral-900">{formValues.startDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Department:</span>
                            <span className="text-neutral-900">{formValues.department}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Supervisor:</span>
                            <span className="text-neutral-900">{formValues.supervisor}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Pay Rate:</span>
                            <span className="text-neutral-900">
                              ${formValues.payRate}/{formValues.payType === "hourly" ? "hr" : formValues.payType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-neutral-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="border-neutral-200 text-[14px]"
                >
                  Back
                </Button>
                {currentStep < 3 ? (
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
                    disabled={loading}
                    className="h-11 bg-neutral-900 hover:bg-neutral-800 text-white text-[14px] font-semibold rounded-[14px] px-6"
                  >
                    {loading ? "Creating..." : "Create Employee"}
                  </Button>
                )}
              </div>
            </div>
          </FormProvider>
        </div>
      </SheetContent>
    </Sheet>
  );
}
