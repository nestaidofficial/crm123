"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminContactProps {
  adminName: string;
  email: string;
  supportContact: string;
  onSupportContactChange: (value: string) => void;
}

const AdminContact = ({
  adminName,
  email,
  supportContact,
  onSupportContactChange,
}: AdminContactProps) => {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Agency Admin</h3>
        <p className="text-muted-foreground text-sm">
          Primary administrator and support contact information.
        </p>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Primary Administrator</p>
          <div className="space-y-0.5">
            <p className="text-[14px] font-medium text-foreground">
              {adminName || "Not set"}
            </p>
            <p className="text-[13px] text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="support-contact" className="gap-1">
            Support Contact{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="support-contact"
            value={supportContact}
            onChange={(e) => onSupportContactChange(e.target.value)}
            placeholder="support@agency.com"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminContact;
