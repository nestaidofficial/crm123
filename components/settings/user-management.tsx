"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, MoreHorizontal, UserPlus, MailIcon } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { useAuthStore } from "@/store/useAuthStore";
import type { AppRole } from "@/store/useAuthStore";

interface Member {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: AppRole;
  joinedAt: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  createdAt: string;
  expiresAt: string;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "coordinator", label: "Coordinator" },
  { value: "billing", label: "Billing" },
  { value: "hr", label: "HR" },
  { value: "viewer", label: "Viewer" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function RoleSelect({
  value,
  disabled,
  onChange,
}: {
  value: AppRole;
  disabled?: boolean;
  onChange: (role: AppRole) => void;
}) {
  if (disabled) {
    return (
      <span className="text-sm text-muted-foreground capitalize min-w-[100px] text-right">
        {ROLES.find((r) => r.value === value)?.label ?? value}
      </span>
    );
  }
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AppRole)}>
      <SelectTrigger className="h-8 w-[130px] text-sm border-neutral-200 focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const UserManagement = () => {
  const { user: currentUser } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("viewer");
  const [isInviting, setIsInviting] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await apiFetch("/api/members");
      if (!res.ok) throw new Error("Failed to load members");
      const result = await res.json();
      setMembers(result.data.members);
      setInvitations(result.data.invitations);
    } catch (err) {
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRoleChange = async (userId: string, role: AppRole) => {
    const prev = members.find((m) => m.userId === userId)?.role;
    setMembers((ms) =>
      ms.map((m) => (m.userId === userId ? { ...m, role } : m))
    );
    try {
      const res = await apiFetch(`/api/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      toast.success("Role updated");
    } catch {
      // revert
      setMembers((ms) =>
        ms.map((m) => (m.userId === userId ? { ...m, role: prev! } : m))
      );
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    try {
      const res = await apiFetch(`/api/members/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setMembers((ms) => ms.filter((m) => m.userId !== userId));
      toast.success(`${name} removed from the agency`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleRevokeInvitation = async (id: string, email: string) => {
    try {
      const res = await apiFetch(`/api/members/invitations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setInvitations((inv) => inv.filter((i) => i.id !== id));
      toast.success(`Invitation to ${email} revoked`);
    } catch {
      toast.error("Failed to revoke invitation");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      const res = await apiFetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("viewer");
      setIsInviteOpen(false);
      await fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">Members</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your team members and their permissions.
          </p>
        </div>
        <Popover open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <PopoverTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-80 p-0 overflow-hidden"
          >
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Invite team member</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send an email invitation to add someone to your agency.
              </p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-xs font-medium">
                  Email address
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role" className="text-xs font-medium">
                  Role
                </Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as AppRole)}
                >
                  <SelectTrigger id="invite-role" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r) => r.value !== "owner").map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="px-4 pb-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteEmail("");
                  setInviteRole("viewer");
                }}
                disabled={isInviting}
                className="h-9 text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || isInviting}
                className="h-9 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Members list */}
      <div className="mt-6 space-y-0">
        {members.map((member, index) => {
          const isOwner = member.role === "owner";
          const isSelf = member.userId === currentUser?.id;
          return (
            <div key={member.userId}>
              <div className="flex items-center gap-3 py-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={member.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-neutral-200 text-neutral-600 text-xs font-medium">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.name}
                    {isSelf && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RoleSelect
                    value={member.role}
                    disabled={isOwner}
                    onChange={(role) => handleRoleChange(member.userId, role)}
                  />
                  {!isOwner && !isSelf && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            handleRemoveMember(member.userId, member.name)
                          }
                        >
                          Remove member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {(isOwner || isSelf) && <div className="w-8" />}
                </div>
              </div>
              {index < members.length - 1 && (
                <Separator className="opacity-50" />
              )}
            </div>
          );
        })}
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <>
          <Separator className="my-6" />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              Pending invitations
            </h4>
            <div className="space-y-0">
              {invitations.map((inv, index) => (
                <div key={inv.id}>
                  <div className="flex items-center gap-3 py-3">
                    <div className="h-9 w-9 shrink-0 rounded-full border-2 border-dashed border-neutral-300 flex items-center justify-center">
                      <MailIcon className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invite expires{" "}
                        {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-xs capitalize font-normal"
                      >
                        {ROLES.find((r) => r.value === inv.role)?.label ??
                          inv.role}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              handleRevokeInvitation(inv.id, inv.email)
                            }
                          >
                            Revoke invitation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {index < invitations.length - 1 && (
                    <Separator className="opacity-50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </>
  );
};

export default UserManagement;
