"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarUpload } from "@/components/shared/avatar-upload";

interface PersonalInfoProps {
  formData: {
    agencyName: string;
    adminName: string;
    phone: string;
    address: string;
    timezone: string;
    avatarUrl: string;
    supportContact: string;
  };
  profile: {
    email: string;
  };
  userId?: string;
  uploadFn: (file: File, entityId?: string) => Promise<string>;
  onFormChange: (field: string, value: string) => void;
  onAvatarChange: (url: string) => void;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona Time (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
];

const PersonalInfo = ({
  formData,
  profile,
  userId,
  uploadFn,
  onFormChange,
  onAvatarChange,
}: PersonalInfoProps) => {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Personal Information</h3>
        <p className="text-muted-foreground text-sm">
          Manage your personal information and agency details.
        </p>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <form className="mx-auto">
          <div className="mb-6 w-full space-y-2">
            <Label>Your Avatar</Label>
            <div className="flex items-center gap-4">
              <AvatarUpload
                value={formData.avatarUrl}
                onChange={onAvatarChange}
                entityId={userId}
                uploadFn={uploadFn}
                size="lg"
              />
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">
                  Upload a profile picture for your agency.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="agency-name">Agency Name</Label>
              <Input
                id="agency-name"
                value={formData.agencyName}
                onChange={(e) => onFormChange("agencyName", e.target.value)}
                placeholder="Your Agency Name"
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="admin-name">Admin Name</Label>
              <Input
                id="admin-name"
                value={formData.adminName}
                onChange={(e) => onFormChange("adminName", e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-muted text-muted-foreground"
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => onFormChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => onFormChange("timezone", value)}
              >
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => onFormChange("address", e.target.value)}
                placeholder="123 Main St, City, State 12345"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalInfo;
