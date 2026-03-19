"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Settings,
  User,
  ChevronDown,
  Bell,
  Zap,
  UserCircle,
  LayoutDashboard,
  Users,
  CalendarDays,
  CheckSquare,
  Receipt,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api-fetch";

interface NavAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  href: string;
  category: string;
}

const navActions: NavAction[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4 text-blue-500" />, description: "Overview & analytics", href: "/dashboard", category: "Pages" },
  { id: "clients", label: "Clients", icon: <Users className="h-4 w-4 text-violet-500" />, description: "Manage client profiles", href: "/clients", category: "Pages" },
  { id: "schedule", label: "Schedule", icon: <CalendarDays className="h-4 w-4 text-emerald-500" />, description: "Appointments & shifts", href: "/schedule", category: "Pages" },
  { id: "tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4 text-orange-500" />, description: "To-dos & assignments", href: "/tasks", category: "Pages" },
  { id: "billing", label: "Billing", icon: <Receipt className="h-4 w-4 text-green-600" />, description: "Invoices & payments", href: "/billing", category: "Pages" },
  { id: "forms", label: "Forms", icon: <FileText className="h-4 w-4 text-sky-500" />, description: "Clinical & intake forms", href: "/forms", category: "Pages" },
];

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
}

const defaultNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "Welcome 🎉",
    description: "Thanks for checking out the notifications component!",
    time: "just now",
  },
  {
    id: "2",
    title: "System Update",
    description: "We've rolled out a new feature for you.",
    time: "1h ago",
  },
  {
    id: "3",
    title: "Reminder",
    description: "Don't forget to finish your profile setup.",
    time: "3h ago",
  },
];

function useDebounce<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const dropdownVariants = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: "auto",
    transition: { height: { duration: 0.35 }, staggerChildren: 0.04 },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { height: { duration: 0.25 }, opacity: { duration: 0.15 } },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

function NavIconButton({
  children,
  className,
  badge,
}: {
  children: React.ReactNode;
  className?: string;
  badge?: boolean;
}) {
  return (
    <button
      className={cn(
        "relative h-9 w-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors",
        className
      )}
    >
      {children}
      {badge && (
        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
      )}
    </button>
  );
}

export function Navbar() {
  const { user, currentRole, memberships, currentAgencyId, signOut, avatarUrl, setAvatarUrl } = useAuthStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 200);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch avatar URL once per agency (cached in auth store)
  useEffect(() => {
    if (!currentAgencyId || avatarUrl) return;

    async function fetchAvatar() {
      try {
        const response = await apiFetch("/api/profile");
        if (response.ok) {
          const result = await response.json();
          setAvatarUrl(result.data.avatarUrl || "");
        }
      } catch (error) {
        console.error("Failed to fetch avatar URL:", error);
      }
    }

    fetchAvatar();
  }, [currentAgencyId, avatarUrl, setAvatarUrl]);

  const filteredActions = isFocused
    ? debouncedQuery.trim()
      ? navActions.filter((a) =>
          a.label.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(debouncedQuery.toLowerCase())
        )
      : navActions
    : [];

  const handleSelect = (href: string) => {
    setIsFocused(false);
    setQuery("");
    router.push(href);
  };
  
  // Get user display info
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
  const userEmail = user?.email || "";
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || "U";
  
  // Get role display name
  const roleDisplay = currentRole 
    ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1)
    : "User";
  
  return (
    <header className="h-14 shrink-0 z-50 w-full border-b border-neutral-200/60 bg-[#F4F4F6]">
      <div className="flex h-14 items-center gap-4 px-4">

        {/* Left: Brand logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12 4.5V9.5L7 12.5L2 9.5V4.5L7 1.5Z" fill="white" strokeWidth="0.5"/>
            </svg>
          </div>
          <span className="text-[14px] font-semibold text-neutral-900 tracking-wide">NESSA</span>
        </div>

        {/* Center: Search bar */}
        <div className="flex flex-1 items-center justify-center">
          <div className="relative w-full max-w-[420px]" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-neutral-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search or type a command"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                className="w-full h-8 pl-9 pr-4 rounded-md text-[13px] bg-white border border-neutral-200/70 text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-300 transition-colors"
              />
            </div>

            <AnimatePresence>
              {isFocused && filteredActions.length > 0 && (
                <motion.div
                  className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-neutral-200 rounded-sm shadow-lg overflow-hidden"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <motion.ul className="py-1.5">
                    {filteredActions.map((action) => (
                      <motion.li
                        key={action.id}
                        variants={itemVariants}
                        layout
                        className="px-2 mx-1 my-0.5 flex items-center justify-between rounded-md hover:bg-neutral-100 cursor-pointer py-2 transition-colors"
                        onMouseDown={() => handleSelect(action.href)}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="shrink-0">{action.icon}</span>
                          <span className="text-[13px] font-medium text-neutral-900">{action.label}</span>
                          <span className="text-[12px] text-neutral-400">{action.description}</span>
                        </div>
                        <span className="text-[11px] text-neutral-400 shrink-0">{action.category}</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Action icons + avatar */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative h-9 w-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors">
                <Bell className="h-[17px] w-[17px]" />
                {defaultNotifications.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-1 text-xs px-1.5 py-0 h-4 min-w-[16px]"
                  >
                    {defaultNotifications.length}
                  </Badge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end" side="bottom">
              <Card className="max-h-80 overflow-y-auto rounded-lg border-none shadow-none">
                {defaultNotifications.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No notifications
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {defaultNotifications.map((item) => (
                      <li key={item.id} className="p-4 hover:bg-muted/50 transition">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-base">{item.title}</span>
                          <span className="text-sm text-muted-foreground">{item.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </PopoverContent>
          </Popover>

          {/* Divider */}
          <div className="mx-2 h-4 w-px bg-neutral-200" />

          {/* Avatar with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 focus-visible:ring-offset-2">
                <Avatar className="h-8 w-8 border border-neutral-200">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="text-[12px] font-semibold bg-gradient-to-br from-neutral-700 to-neutral-900 text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-[12px] font-medium text-neutral-900 leading-none">{userName}</span>
                  <span className="text-[10px] text-neutral-500 leading-none mt-0.5">{roleDisplay}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-lg border border-neutral-200 bg-white shadow-xl p-1.5" align="end" sideOffset={8}>
              <div className="px-2 py-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-neutral-200">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                    <AvatarFallback className="text-[13px] font-semibold bg-gradient-to-br from-neutral-700 to-neutral-900 text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-[14px] font-semibold text-neutral-900 leading-none">{userName}</p>
                    <p className="text-[12px] text-neutral-500 leading-none mt-1.5">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator className="my-1.5 bg-neutral-100" />
              <DropdownMenuItem asChild className="rounded-md px-2 py-2 text-[13px] font-medium cursor-pointer focus:bg-neutral-100">
                <Link href="/profile" className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100">
                    <User className="h-4 w-4 text-neutral-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-900">Profile</span>
                    <span className="text-[11px] text-neutral-500 font-normal">View and edit your profile</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-md px-2 py-2 text-[13px] font-medium cursor-pointer focus:bg-neutral-100">
                <Link href="/settings" className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100">
                    <Settings className="h-4 w-4 text-neutral-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-900">Settings</span>
                    <span className="text-[11px] text-neutral-500 font-normal">Manage your preferences</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5 bg-neutral-100" />
              <DropdownMenuItem 
                className="rounded-md px-2 py-2 text-[13px] font-medium cursor-pointer focus:bg-red-50 text-red-600 focus:text-red-700"
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50">
                    <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span>Log out</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  );
}
