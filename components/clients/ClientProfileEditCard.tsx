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
  clientFormSchema,
  type ClientFormValues,
  type SavedClient,
} from "@/lib/clients/schema";
import { useClientsStore } from "@/store/useClientsStore";
import { deleteClientAvatar } from "@/lib/supabase/storage";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import {
  Calendar,
  Phone,
  Mail,
  MapPin,
  UserCircle,
  Contact,
  FileText,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ServiceMultiSelect } from "@/components/shared/service-multi-select";

const inputBase =
  "min-h-[28px] py-1 border-0 px-0 bg-transparent shadow-none focus-visible:ring-0 text-[14px] leading-[1.5] placeholder:text-neutral-400 caret-neutral-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 self-center";
const rowClass = "flex items-start py-3 border-b border-neutral-100";
const labelCellClass = "flex items-center gap-2 w-40 shrink-0 text-neutral-500";
const iconClass = "h-4 w-4 shrink-0";
const errorClass = "text-[11px] text-red-500 -mt-1 pl-40";

function EditRow({
  label,
  id,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={rowClass}>
      <div className={labelCellClass}>
        <span className="text-body-m">{label}</span>
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

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface ClientProfileEditCardProps {
  patient: SavedClient;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function ClientProfileEditCard({
  patient,
  onCancel,
  onSuccess,
}: ClientProfileEditCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    () => patient?.services?.map((s) => s.id) ?? []
  );
  const updateClient = useClientsStore((state) => state.updateClient);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: patient,
  });

  const { control, handleSubmit, formState: { errors } } = form;

  const onSubmit = async (data: ClientFormValues) => {
    setIsSaving(true);
    try {
      await updateClient(patient.id, data);
      toast.success("Client updated successfully");
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update client"
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
            name="avatar"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col items-start gap-2">
                <AvatarUpload
                  value={field.value}
                  onChange={field.onChange}
                  clientId={patient.id}
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
                      if (currentUrl && (currentUrl.includes("client_profile_image") || currentUrl.includes("patient_profile_image"))) {
                        try {
                          await deleteClientAvatar(currentUrl);
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
            <h2 className="text-body-m font-semibold text-neutral-500 mb-1">Edit Client</h2>
            <p className="text-body-s text-neutral-500">Update information below and click Save</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-0">
            <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Basic Information</h3>
            <EditRow label="First Name" id="edit-firstName">
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-firstName" placeholder="First Name" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
            <EditRow label="Last Name" id="edit-lastName">
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-lastName" placeholder="Last Name" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
            <EditRow label="Date of Birth" id="edit-dob">
              <Controller
                name="dob"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-3 w-full">
                    <Calendar className="h-4 w-4 text-neutral-400 shrink-0" />
                    <Input {...field} id="edit-dob" type="date" className={cn(inputBase, "flex-1")} />
                  </div>
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
                    <SelectTrigger id="edit-gender" className={cn(inputBase, "w-full focus:ring-0 focus:ring-offset-0")}>
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
                    placeholder="Email (optional)"
                    className={cn(inputBase, "w-full")}
                  />
                )}
              />
            </EditRow>
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
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

          {/* Primary Contact */}
          <div className="space-y-0">
            <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Primary Contact</h3>
            <EditRow icon={Contact} label="Name" id="edit-primaryContact-name">
              <Controller
                name="primaryContact.name"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-primaryContact-name" placeholder="Name" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.primaryContact?.name && (
              <p className={errorClass}>{errors.primaryContact.name.message}</p>
            )}
            <EditRow icon={Contact} label="Relation" id="edit-primaryContact-relation">
              <Controller
                name="primaryContact.relation"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-primaryContact-relation" placeholder="Relation" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.primaryContact?.relation && (
              <p className={errorClass}>{errors.primaryContact.relation.message}</p>
            )}
            <EditRow icon={Phone} label="Phone" id="edit-primaryContact-phone">
              <Controller
                name="primaryContact.phone"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="edit-primaryContact-phone" type="tel" placeholder="Phone" className={cn(inputBase, "w-full")} />
                )}
              />
            </EditRow>
            {errors.primaryContact?.phone && (
              <p className={errorClass}>{errors.primaryContact.phone.message}</p>
            )}
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
            <EditRow icon={Contact} label="Relation" id="edit-emergencyContact-relation">
              <Controller
                name="emergencyContact.relation"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="edit-emergencyContact-relation"
                    value={field.value || ""}
                    placeholder="Relation (optional)"
                    className={cn(inputBase, "w-full")}
                  />
                )}
              />
            </EditRow>
          </div>

          {/* Notes */}
          {/* Services */}
          <div className="space-y-0">
            <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Services</h3>
            <ServiceMultiSelect
              value={selectedServiceIds}
              onChange={async (serviceIds) => {
                setSelectedServiceIds(serviceIds);
                if (patient?.id) {
                  try {
                    await apiFetch(`/api/clients/${patient.id}/services`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ serviceIds }),
                    });
                  } catch {
                    toast.error("Failed to update services");
                    setSelectedServiceIds(patient?.services?.map((s) => s.id) ?? []);
                  }
                }
              }}
              placeholder="Select services for this client..."
            />
          </div>

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

