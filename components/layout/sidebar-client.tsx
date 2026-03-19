"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  CreditCard,
  UserCog,
  Workflow,
  Sparkles,
  BarChart3,
  FileText,
  ClipboardList,
  ChevronRight,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/useSidebarStore";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Tasks", href: "/tasks", icon: ClipboardList, badge: 1 },
      { title: "Clients", href: "/clients", icon: Users, badge: 124 },
      { title: "Schedule", href: "/schedule", icon: Calendar },
      { title: "EVV", href: "/evv", icon: CheckSquare, badge: 8 },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Billing", href: "/billing", icon: CreditCard },
      { title: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "HR", href: "/hr", icon: UserCog },
      { title: "Workflows", href: "/workflows", icon: Workflow },
      { title: "Forms", href: "/forms", icon: FileText },
      { title: "Nessa AI", href: "/ai", icon: Sparkles },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Help & Support", href: "/help", icon: HelpCircle, badge: 8 },
];

export function SidebarClient() {
  const pathname = usePathname();
  const { openWorkflowsPanel, scheduleCloseWorkflowsPanel } = useSidebarStore();

  return (
    <>
      <nav className="flex flex-1 min-h-0 flex-col w-full py-4 overflow-y-auto">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className={cn(sectionIdx > 0 && "mt-5")}>
            {section.label && (
              <p className="px-4 pb-1.5 text-[10px] font-semibold tracking-widest uppercase text-neutral-400 select-none">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname?.startsWith(item.href + "/");
                const isWorkflows = item.href === "/workflows";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onMouseEnter={isWorkflows ? openWorkflowsPanel : undefined}
                    onMouseLeave={isWorkflows ? scheduleCloseWorkflowsPanel : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 mx-2 rounded-lg transition-colors duration-100 group",
                      isActive
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[19px] w-[19px] shrink-0 transition-colors",
                        isActive
                          ? "text-neutral-800"
                          : "text-neutral-400 group-hover:text-neutral-600"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[14px] leading-none transition-colors",
                        isActive ? "font-semibold text-neutral-900" : "font-medium"
                      )}
                    >
                      {item.title}
                    </span>
                    {item.badge && (
                      <span className="ml-auto flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-neutral-200 px-1 text-[10px] font-semibold text-neutral-600">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                    {isWorkflows && !item.badge && (
                      <ChevronRight
                        className={cn(
                          "ml-auto h-3.5 w-3.5 shrink-0 transition-colors",
                          isActive ? "text-neutral-400" : "text-neutral-300 group-hover:text-neutral-400"
                        )}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="w-full pb-4 space-y-0.5">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex items-center gap-3 px-4 py-2 mx-2 rounded-lg transition-colors duration-100 group",
                isActive
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
              )}
            >
              <Icon
                className={cn(
                  "h-[19px] w-[19px] shrink-0 transition-colors",
                  isActive
                    ? "text-neutral-800"
                    : "text-neutral-400 group-hover:text-neutral-600"
                )}
              />
              <span
                className={cn(
                  "text-[14px] leading-none transition-colors",
                  isActive ? "font-semibold text-neutral-900" : "font-medium"
                )}
              >
                {item.title}
              </span>
              {item.badge && (
                <span className="ml-auto flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
