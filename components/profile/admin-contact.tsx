"use client";

import { Mail, Phone } from "lucide-react";

interface AdminContactProps {
  adminName: string;
  email: string;
  supportContact: string;
  onSupportContactChange: (value: string) => void;
}

const AdminContact = ({
  adminName,
  email,
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

        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Support Contact</p>
          <div className="space-y-2">
            <a
              href="mailto:rahul@nestaid.us"
              className="flex items-center gap-2 text-[14px] text-foreground hover:text-primary-500 transition-colors"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              rahul@nestaid.us
            </a>
            <a
              href="tel:+14129530622"
              className="flex items-center gap-2 text-[14px] text-foreground hover:text-primary-500 transition-colors"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              +1 (412) 953-0622
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminContact;
