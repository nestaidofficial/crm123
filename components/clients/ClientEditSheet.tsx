"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { clientFormSchema, type ClientFormValues, type SavedClient } from "@/lib/clients/schema";
import { useClientsStore } from "@/store/useClientsStore";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const inputBase =
  "min-h-[28px] py-1 border-0 px-0 bg-transparent shadow-none focus-visible:ring-0 text-[14px] leading-[1.5] placeholder:text-neutral-400 caret-neutral-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 self-center";
const rowClass = "flex items-center gap-3 pb-3 border-b border-neutral-100";
const iconClass = "h-5 w-5 text-neutral-400 shrink-0";
const errorClass = "text-[11px] text-red-500 -mt-1 pl-8";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"] as const;

interface ClientEditSheetProps {
  client: SavedClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ClientEditSheet({
  client,
  open,
  onOpenChange,
  onSuccess,
}: ClientEditSheetProps) {
  const [isSaving, setIsSaving] = useState(false);
  const updateClient = useClientsStore((state) => state.updateClient);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: client,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = form;

  const careType = watch("careType");

  const onSubmit = async (data: ClientFormValues) => {
    setIsSaving(true);
    try {
      await updateClient(client.id, data);
      toast.success("Client updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update client");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="p-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-h1 text-neutral-900">Edit Client</SheetTitle>
            <SheetDescription className="text-body-m text-neutral-500">
              Update client information and care plan
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-[15px] font-semibold text-neutral-900">Basic Information</h3>
              
              <div className={rowClass}>
                <Type className={iconClass} />
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="First Name"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}

              <div className={rowClass}>
                <Type className={iconClass} />
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Last Name"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}

              <div className={rowClass}>
                <Calendar className={iconClass} />
                <Controller
                  name="dob"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.dob && <p className={errorClass}>{errors.dob.message}</p>}

              <div className={rowClass}>
                <UserCircle className={iconClass} />
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="flex-1 h-auto border-0 p-0 bg-transparent shadow-none">
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
              </div>
              {errors.gender && <p className={errorClass}>{errors.gender.message}</p>}

              <div className={rowClass}>
                <Phone className={iconClass} />
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="tel"
                      placeholder="Phone"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}

              <div className={rowClass}>
                <Mail className={iconClass} />
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="email"
                      placeholder="Email (optional)"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>

            {/* Address */}
            <div className="space-y-3">
              <h3 className="text-[15px] font-semibold text-neutral-900">Address</h3>
              
              <div className={rowClass}>
                <MapPin className={iconClass} />
                <Controller
                  name="address.street"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Street"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.address?.street && <p className={errorClass}>{errors.address.street.message}</p>}

              <div className={rowClass}>
                <MapPin className={iconClass} />
                <Controller
                  name="address.city"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="City"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.address?.city && <p className={errorClass}>{errors.address.city.message}</p>}

              <div className={rowClass}>
                <MapPin className={iconClass} />
                <Controller
                  name="address.state"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="State"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.address?.state && <p className={errorClass}>{errors.address.state.message}</p>}

              <div className={rowClass}>
                <MapPin className={iconClass} />
                <Controller
                  name="address.zip"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="ZIP"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.address?.zip && <p className={errorClass}>{errors.address.zip.message}</p>}
            </div>

            {/* Primary Contact */}
            <div className="space-y-3">
              <h3 className="text-[15px] font-semibold text-neutral-900">Primary Contact</h3>
              
              <div className={rowClass}>
                <Contact className={iconClass} />
                <Controller
                  name="primaryContact.name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Name"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.primaryContact?.name && <p className={errorClass}>{errors.primaryContact.name.message}</p>}

              <div className={rowClass}>
                <Contact className={iconClass} />
                <Controller
                  name="primaryContact.relation"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Relation"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.primaryContact?.relation && <p className={errorClass}>{errors.primaryContact.relation.message}</p>}

              <div className={rowClass}>
                <Phone className={iconClass} />
                <Controller
                  name="primaryContact.phone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="tel"
                      placeholder="Phone"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.primaryContact?.phone && <p className={errorClass}>{errors.primaryContact.phone.message}</p>}
            </div>

            {/* Emergency Contact */}
            <div className="space-y-3">
              <h3 className="text-[15px] font-semibold text-neutral-900">Emergency Contact</h3>
              
              <div className={rowClass}>
                <Contact className={iconClass} />
                <Controller
                  name="emergencyContact.name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Name"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.emergencyContact?.name && <p className={errorClass}>{errors.emergencyContact.name.message}</p>}

              <div className={rowClass}>
                <Phone className={iconClass} />
                <Controller
                  name="emergencyContact.phone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="tel"
                      placeholder="Phone"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
              {errors.emergencyContact?.phone && <p className={errorClass}>{errors.emergencyContact.phone.message}</p>}

              <div className={rowClass}>
                <Contact className={iconClass} />
                <Controller
                  name="emergencyContact.relation"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="Relation (optional)"
                      className={cn(inputBase, "flex-1")}
                    />
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <h3 className="text-[15px] font-semibold text-neutral-900">Notes</h3>
              
              <div className={rowClass}>
                <FileText className={iconClass} />
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Additional notes (optional)"
                      className={cn(inputBase, "flex-1 min-h-[80px]")}
                    />
                  )}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
