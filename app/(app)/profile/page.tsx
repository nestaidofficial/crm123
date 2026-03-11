"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadAdminAvatar } from "@/lib/supabase/storage";
import { apiFetch } from "@/lib/api-fetch";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import PersonalInfo from "@/components/profile/personal-info";
import SubscriptionInfo from "@/components/profile/subscription-info";
import AdminContact from "@/components/profile/admin-contact";

interface ProfileData {
  userId: string;
  email: string;
  agencyId: string;
  agencyName: string;
  agencySlug: string;
  adminName: string;
  phone: string;
  address: string;
  timezone: string;
  avatarUrl: string;
  supportContact: string;
  subscription: {
    plan: "trial" | "basic" | "pro";
    status: "active" | "past_due" | "cancelled";
    renewalDate?: string;
  };
}

export default function ProfilePage() {
  const { user, currentAgencyId, isInitialized } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [formData, setFormData] = useState({
    agencyName: "",
    adminName: "",
    phone: "",
    address: "",
    timezone: "America/New_York",
    avatarUrl: "",
    supportContact: "",
  });

  useEffect(() => {
    async function fetchProfile() {
      // Wait for auth to be initialized
      if (!isInitialized || !currentAgencyId) {
        return;
      }

      try {
        const response = await apiFetch("/api/profile");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Failed to fetch profile (${response.status})`;
          console.error("API Error:", errorData);
          throw new Error(errorMessage);
        }
        const result = await response.json();
        setProfile(result.data);
        setFormData({
          agencyName: result.data.agencyName,
          adminName: result.data.adminName,
          phone: result.data.phone,
          address: result.data.address,
          timezone: result.data.timezone,
          avatarUrl: result.data.avatarUrl,
          supportContact: result.data.supportContact,
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [isInitialized, currentAgencyId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (url: string) => {
    setFormData((prev) => ({ ...prev, avatarUrl: url }));
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center text-neutral-500 mt-8">
        Failed to load profile
      </div>
    );
  }

  const tabs = [
    { name: "General", value: "general" },
    { name: "Preferences", value: "preferences" },
  ];

  return (
    <div className="w-full py-8">
      <div className="mx-auto min-h-screen max-w-7xl px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="h-fit! w-full rounded-none border-b bg-transparent p-0 sm:justify-start">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:border-primary dark:data-[state=active]:border-primary rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none! sm:flex-0 dark:data-[state=active]:bg-transparent"
              >
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="mt-4">
          <section className="py-3">
            <div className="mx-auto max-w-7xl">
              <PersonalInfo
                formData={formData}
                profile={profile}
                userId={user?.id}
                uploadFn={uploadAdminAvatar}
                onFormChange={handleFormChange}
                onAvatarChange={handleAvatarChange}
              />
              <Separator className="my-10" />
              <SubscriptionInfo subscription={profile.subscription} />
              <Separator className="my-10" />
              <AdminContact
                adminName={formData.adminName}
                email={profile.email}
                supportContact={formData.supportContact}
                onSupportContactChange={(value) =>
                  handleFormChange("supportContact", value)
                }
              />
            </div>
          </section>
          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              onClick={handleSave}
              disabled={isSaving}
              className="max-sm:w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
