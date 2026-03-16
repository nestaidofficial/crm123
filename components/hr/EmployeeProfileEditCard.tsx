"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreateEmployeeSchema,
  type CreateEmployeeInput,
} from "@/lib/validation/employee.schema";
import { useEmployeesStore } from "@/store/useEmployeesStore";
import { uploadEmployeeAvatar, deleteEmployeeAvatar } from "@/lib/supabase/storage";
import { toast } from "sonner";
import {
  Type,
  Calendar,
  Phone,
  Mail,
  MapPin,
  UserCircle,
  Contact,
  FileText,
  Trash2,
  Briefcase,
  DollarSign,
  Shield,
  UserCheck,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/hr/mockEmployees";
import { ServiceMultiSelect } from "@/components/shared/service-multi-select";

const inputBase =
  "min-h-[28px] py-1 border-0 px-0 bg-transparent shadow-none focus-visible:ring-0 text-[14px] leading-[1.5] placeholder:text-neutral-400 caret-neutral-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 self-center";
const rowClass = "flex items-start py-3 border-b border-neutral-100";
const labelCellClass = "flex items-center gap-2 w-40 shrink-0 text-neutral-500";
const iconClass = "h-4 w-4 shrink-0";
const errorClass = "text-[11px] text-red-500 -mt-1 pl-40";

function EditRow({
  icon: Icon,
  label,
  id,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={rowClass}>
      <div className={labelCellClass}>
        <Icon className={iconClass} />
        <Label htmlFor={id} className="text-body-m cursor-pointer font-normal">
          {label}
        </Label>
      </div>
      <div className="flex-1 min-w-0 text-body-m text-neutral-900">{children}</div>
    </div>
  );
}

const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Non-binary",
  "Other",
  "Prefer not to say",
] as const;

const ROLE_OPTIONS = [
  { value: "caregiver", label: "Caregiver" },
  { value: "cna", label: "Certified Nursing Assistant (CNA)" },
  { value: "hha", label: "Home Health Aide (HHA)" },
  { value: "lpn", label: "Licensed Practical Nurse (LPN)" },
  { value: "rn", label: "Registered Nurse (RN)" },
  { value: "admin", label: "Administrative Staff" },
  { value: "coordinator", label: "Care Coordinator" },
  { value: "other", label: "Other" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "onboarding", label: "Onboarding" },
] as const;

const PAY_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "salary", label: "Salary" },
  { value: "per-visit", label: "Per Visit" },
] as const;

interface EmployeeProfileEditCardProps {
  employee: Employee;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function EmployeeProfileEditCard({
  employee,
  onCancel,
  onSuccess,
}: EmployeeProfileEditCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const updateEmployee = useEmployeesStore((state) => state.updateEmployee);

  // Map Employee to form values — every field must have a defined fallback
  // to prevent React's uncontrolled→controlled input warning.
  const defaultValues: CreateEmployeeInput = {
    firstName: employee.firstName ?? "",
    lastName: employee.lastName ?? "",
    middleName: employee.middleName ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    dob: employee.dob ?? "",
    ssn: employee.ssn ?? "",
    gender: (employee.gender as any) ?? "",
    avatarUrl: employee.avatar ?? "",
    role: employee.role,
    status: employee.status,
    startDate: employee.startDate ?? "",
    department: employee.department ?? "",
    supervisor: employee.supervisor ?? "",
    address: {
      street: employee.address?.street ?? "",
      city: employee.address?.city ?? "",
      state: employee.address?.state ?? "",
      zip: employee.address?.zip ?? "",
    },
    emergencyContact: {
      name: employee.emergencyContact?.name ?? "",
      phone: employee.emergencyContact?.phone ?? "",
    },
    payRate: employee.payRate ?? 0,
    payType: employee.payType,
    payroll: {
      bankAccount: employee.bankAccount ?? "",
      routingNumber: employee.routingNumber ?? "",
      bankName: employee.bankName ?? "",
    },
    workAuthorization: employee.workAuthorization ?? "",
    notes: employee.notes ?? "",
    skills: employee.skills ?? [],
  };

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues,
  });

  const { control, handleSubmit, watch, formState: { errors } } = form;
  const watchedRole = watch("role");

  const onSubmit = async (data: CreateEmployeeInput) => {
    setIsSaving(true);
    try {
      // Map form data to Employee update format
      const updates: Partial<Employee> = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || undefined,
        email: data.email,
        phone: data.phone,
        dob: data.dob || undefined,
        ssn: data.ssn || undefined,
        gender: data.gender,
        avatar: data.avatarUrl || undefined,
        role: data.role,
        status: data.status,
        startDate: data.startDate,
        department: data.department,
        supervisor: data.supervisor,
        address: data.address,
        emergencyContact: data.emergencyContact,
        payRate: data.payRate,
        payType: data.payType,
        bankAccount: data.payroll?.bankAccount || undefined,
        routingNumber: data.payroll?.routingNumber || undefined,
        bankName: data.payroll?.bankName || undefined,
        workAuthorization: data.workAuthorization || undefined,
        notes: data.notes || undefined,
        skills: data.skills,
      };

      await updateEmployee(employee.id, updates);
      toast.success("Employee updated successfully");
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update employee"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-card overflow-hidden h-fit flex flex-col">
      {/* Header with editable profile picture */}
      <div className="p-6 border-b border-neutral-100">
        <div className="flex items-start gap-4 mb-4">
          <Controller
            name="avatarUrl"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col items-start gap-2">
                <AvatarUpload
                  value={field.value}
                  onChange={field.onChange}
                  entityId={employee.id}
                  uploadFn={uploadEmployeeAvatar}
                  size="lg"
                />
                {field.value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 text-[12px]"
                    onClick={async () => {
                      const currentUrl = field.value;
                      field.onChange("");
                      if (currentUrl && currentUrl.includes("employee_profile_image")) {
                        try {
                          await deleteEmployeeAvatar(currentUrl);
                          toast.success("Profile picture removed");
                        } catch {
                          toast.success("Profile picture removed from profile");
                        }
                      } else {
                        toast.success("Profile picture removed");
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove photo
                  </Button>
                )}
              </div>
            )}
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-body-m font-semibold text-neutral-500 mb-1">Edit Employee</h2>
            <p className="text-body-s text-neutral-500">Update information below and click Save</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-0">
            <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Basic Information</h3>
            <EditRow icon={Type} label="First Name" id="edit-firstName">
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-firstName" placeholder="First Name" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
            <EditRow icon={Type} label="Last Name" id="edit-lastName">
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-lastName" placeholder="Last Name" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
            <EditRow icon={Type} label="Middle Name" id="edit-middleName">
              <Controller
                name="middleName"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-middleName" placeholder="Middle Name (optional)" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.middleName && <p className={errorClass}>{errors.middleName.message}</p>}
            <EditRow icon={Calendar} label="Date of Birth" id="edit-dob">
              <Controller
                name="dob"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-dob" type="date" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.dob && <p className={errorClass}>{errors.dob.message}</p>}
            <EditRow icon={UserCircle} label="Gender" id="edit-gender">
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-gender" className="w-full h-auto border-0 p-0 bg-transparent shadow-none">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </EditRow>
            {errors.gender && <p className={errorClass}>{errors.gender.message}</p>}
            <EditRow icon={Shield} label="SSN" id="edit-ssn">
              <Controller
                name="ssn"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-ssn" placeholder="SSN (optional)" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.ssn && <p className={errorClass}>{errors.ssn.message}</p>}
            <EditRow icon={Phone} label="Phone Number" id="edit-phone">
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-phone" type="tel" placeholder="Phone" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
            <EditRow icon={Mail} label="Email" id="edit-email">
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="edit-email"
                    type="email"
                    placeholder="Email"
                    className={cn(inputBase, "w-full")}
                  />
                )}
              />
            </EditRow>
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            <EditRow icon={UserCheck} label="Work Authorization" id="edit-workAuthorization">
              <Controller
                name="workAuthorization"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-workAuthorization" placeholder="Work Authorization (optional)" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.workAuthorization && <p className={errorClass}>{errors.workAuthorization.message}</p>}
          </div>

          {/* Address */}
          <div className="space-y-0">
            <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Address</h3>
            <EditRow icon={MapPin} label="Street" id="edit-address-street">
              <Controller
                name="address.street"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-address-street" placeholder="Street" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.address?.street && <p className={errorClass}>{errors.address.street.message}</p>}
            <EditRow icon={MapPin} label="City" id="edit-address-city">
              <Controller
                name="address.city"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-address-city" placeholder="City" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.address?.city && <p className={errorClass}>{errors.address.city.message}</p>}
            <EditRow icon={MapPin} label="State" id="edit-address-state">
              <Controller
                name="address.state"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-address-state" placeholder="State" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.address?.state && <p className={errorClass}>{errors.address.state.message}</p>}
            <EditRow icon={MapPin} label="ZIP" id="edit-address-zip">
              <Controller
                name="address.zip"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-address-zip" placeholder="ZIP" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.address?.zip && <p className={errorClass}>{errors.address.zip.message}</p>}
          </div>

          {/* Emergency Contact */}
          <div className="space-y-0">
            <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Emergency Contact</h3>
            <EditRow icon={Contact} label="Name" id="edit-emergencyContact-name">
              <Controller
                name="emergencyContact.name"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-emergencyContact-name" placeholder="Name" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.emergencyContact?.name && (
              <p className={errorClass}>{errors.emergencyContact.name.message}</p>
            )}
            <EditRow icon={Phone} label="Phone" id="edit-emergencyContact-phone">
              <Controller
                name="emergencyContact.phone"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-emergencyContact-phone" type="tel" placeholder="Phone" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.emergencyContact?.phone && (
              <p className={errorClass}>{errors.emergencyContact.phone.message}</p>
            )}
          </div>

          {/* Employment Details */}
          <div className="space-y-0">
            <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Employment Details</h3>
            <EditRow icon={Briefcase} label="Role" id="edit-role">
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-role" className="w-full h-auto border-0 p-0 bg-transparent shadow-none">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </EditRow>
            {errors.role && <p className={errorClass}>{errors.role.message}</p>}
            
            {/* Services - only show for caregivers */}
            {watchedRole === "caregiver" && (
              <div className="space-y-3 py-3 border-b border-neutral-100">
                <div className="flex items-center gap-2 w-40 shrink-0 text-neutral-500">
                  <UserCheck className="h-4 w-4 shrink-0" />
                  <span className="text-[14px]">Services</span>
                </div>
                <ServiceMultiSelect
                  value={employee?.services?.map(s => s.id) || []}
                  onChange={async (serviceIds) => {
                    if (employee?.id) {
                      try {
                        await fetch(`/api/employees/${employee.id}/services`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ serviceIds }),
                        });
                        toast.success("Services updated successfully");
                      } catch (error) {
                        toast.error("Failed to update services");
                      }
                    }
                  }}
                  placeholder="Select services this caregiver provides..."
                  className="border-0"
                />
              </div>
            )}
            
            <EditRow icon={Briefcase} label="Status" id="edit-status">
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-status" className="w-full h-auto border-0 p-0 bg-transparent shadow-none">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </EditRow>
            {errors.status && <p className={errorClass}>{errors.status.message}</p>}
            <EditRow icon={Briefcase} label="Department" id="edit-department">
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-department" placeholder="Department" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.department && <p className={errorClass}>{errors.department.message}</p>}
            <EditRow icon={UserCheck} label="Supervisor" id="edit-supervisor">
              <Controller
                name="supervisor"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-supervisor" placeholder="Supervisor" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.supervisor && <p className={errorClass}>{errors.supervisor.message}</p>}
            <EditRow icon={Calendar} label="Start Date" id="edit-startDate">
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-startDate" type="date" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.startDate && <p className={errorClass}>{errors.startDate.message}</p>}
            <EditRow icon={DollarSign} label="Pay Rate" id="edit-payRate">
              <Controller
                name="payRate"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-payRate" type="number" step="0.01" placeholder="Pay Rate" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.payRate && <p className={errorClass}>{errors.payRate.message}</p>}
            <EditRow icon={DollarSign} label="Pay Type" id="edit-payType">
              <Controller
                name="payType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-payType" className="w-full h-auto border-0 p-0 bg-transparent shadow-none">
                      <SelectValue placeholder="Select pay type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAY_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </EditRow>
            {errors.payType && <p className={errorClass}>{errors.payType.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-0">
            <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Notes</h3>
            <EditRow icon={FileText} label="Notes" id="edit-notes">
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="edit-notes"
                    value={field.value || ""}
                    placeholder="Additional notes (optional)"
                    className={cn(inputBase, "w-full min-h-[80px]")}
                  />
                )}
              />
            </EditRow>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-neutral-100">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-[#FED96A] hover:bg-[#e8c55a] text-neutral-900" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
