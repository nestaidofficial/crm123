"use client";

import { useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCandidatesStore } from "@/store/useCandidatesStore";
import { toast } from "sonner";
import { Camera, User, Phone, Mail, MapPin, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: (candidateId: string) => void;
}

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
];

const empty = {
  avatarUrl: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
};

type FormErrors = Partial<Record<keyof typeof empty, string>>;

function validate(values: typeof empty): FormErrors {
  const errors: FormErrors = {};
  if (!values.firstName.trim()) errors.firstName = "First name is required";
  if (!values.lastName.trim()) errors.lastName = "Last name is required";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email";
  }
  return errors;
}

export function AddCandidateDialog({
  open,
  onOpenChange,
  onAdded,
}: AddCandidateDialogProps) {
  const addCandidate = useCandidatesStore((s) => s.addCandidate);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<FormErrors>({});
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  function set(field: keyof typeof empty, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      set("avatarUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    const errs = validate(values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const candidate = addCandidate({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: {
        street: values.street.trim(),
        city: values.city.trim(),
        state: values.state,
        zip: values.zip.trim(),
      },
      avatarUrl: values.avatarUrl || null,
      currentPhaseId: null,
      currentStageLabel: "Screening",
      onboardingStatus: "active" as const,
      workflowConfig: null,
      stepStatuses: {},
      documents: [],
      activityLog: [],
    });

    toast.success(`${candidate.firstName} ${candidate.lastName} added as a candidate`);
    onAdded?.(candidate.id);
    handleClose();
  }

  function handleClose() {
    setValues(empty);
    setErrors({});
    setAvatarPreview("");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-neutral-100">
          <SheetTitle className="text-[15px] font-semibold text-neutral-900">
            Add Candidate
          </SheetTitle>
          <SheetDescription className="text-[12px] text-neutral-500">
            Basic information to get started with the onboarding workflow.
          </SheetDescription>
        </SheetHeader>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Avatar */}
          <div className="flex justify-center pb-1">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors group"
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full w-full">
                    <User className="h-8 w-8 text-neutral-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </button>
              <span className="text-[11px] text-neutral-400">Photo (optional)</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* Name row */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
              Name
            </div>
            <div className="flex gap-3">
              {/* First name */}
              <div className="flex-1">
                <div className={cn(
                  "flex items-center gap-3 pb-2 border-b",
                  errors.firstName ? "border-red-300" : "border-neutral-100"
                )}>
                  <Type className="h-4 w-4 text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    value={values.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    placeholder="First name"
                    className="flex-1 border-0 bg-transparent p-0 py-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-[11px] text-red-500 mt-1 pl-7">{errors.firstName}</p>
                )}
              </div>
              {/* Last name */}
              <div className="flex-1">
                <div className={cn(
                  "flex items-center gap-3 pb-2 border-b",
                  errors.lastName ? "border-red-300" : "border-neutral-100"
                )}>
                  <Type className="h-4 w-4 text-neutral-400 shrink-0 opacity-0" />
                  <input
                    type="text"
                    value={values.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    placeholder="Last name"
                    className="flex-1 border-0 bg-transparent p-0 py-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                  />
                </div>
                {errors.lastName && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
              Contact
            </div>

            {/* Email */}
            <div>
              <div className={cn(
                "flex items-center gap-3 pb-2 border-b",
                errors.email ? "border-red-300" : "border-neutral-100"
              )}>
                <Mail className="h-4 w-4 text-neutral-400 shrink-0" />
                <input
                  type="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="Email address"
                  className="flex-1 border-0 bg-transparent p-0 py-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-red-500 mt-1 pl-7">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 pb-2 border-b border-neutral-100">
              <Phone className="h-4 w-4 text-neutral-400 shrink-0" />
              <input
                type="tel"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="Phone number"
                className="flex-1 border-0 bg-transparent p-0 py-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
              Address
            </div>

            {/* Street */}
            <div className="flex items-center gap-3 pb-2 border-b border-neutral-100">
              <MapPin className="h-4 w-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                value={values.street}
                onChange={(e) => set("street", e.target.value)}
                placeholder="Street address"
                className="flex-1 border-0 bg-transparent p-0 py-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
              />
            </div>

            {/* City / State / ZIP */}
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-3 pb-2 border-b border-neutral-100">
                <MapPin className="h-4 w-4 text-neutral-400 shrink-0 opacity-0" />
                <input
                  type="text"
                  value={values.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="City"
                  className="flex-1 border-0 bg-transparent p-0 py-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                />
              </div>
              <div className="w-28 pb-2 border-b border-neutral-100">
                <Select value={values.state} onValueChange={(v) => set("state", v)}>
                  <SelectTrigger className="h-auto min-h-0 border-0 p-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 text-[14px] [&>span]:text-neutral-400 data-[placeholder]:text-neutral-400 py-1">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    {US_STATES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-[13px]">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-20 flex items-center pb-2 border-b border-neutral-100">
                <input
                  type="text"
                  value={values.zip}
                  onChange={(e) => set("zip", e.target.value)}
                  placeholder="ZIP"
                  maxLength={10}
                  className="w-full border-0 bg-transparent p-0 py-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-10 text-[13px] border-neutral-200 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 h-10 bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-semibold rounded-xl"
          >
            Add Candidate
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
