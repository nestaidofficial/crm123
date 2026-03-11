"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Calendar,
  CheckSquare,
  CreditCard,
  BarChart3,
  UserCog,
  Workflow,
  FileText,
  Sparkles,
  GitBranch,
  UserCircle,
  Building2,
  MessageSquare,
  LogOut,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

type PrimaryItem =
  | "Dashboard"
  | "Tasks"
  | "Clients"
  | "Schedule"
  | "EVV"
  | "Billing"
  | "Reports"
  | "HR"
  | "Workflows"
  | "Forms"
  | "Nessa AI";

type WorkflowItem =
  | "Onboarding"
  | "Communication"
  | "Discharge"
  | "Service Changes"
  | "Incident";

type OnboardingSub = "Employee" | "Client" | "Partner" | null;

// ─── Route mapping ────────────────────────────────────────────────────────────

const ROUTE_MAP: Record<PrimaryItem, string> = {
  Dashboard:  "/dashboard",
  Tasks:      "/tasks",
  Clients:    "/clients",
  Schedule:   "/schedule",
  EVV:        "/evv",
  Billing:    "/billing",
  Reports:    "/reports",
  HR:         "/hr",
  Workflows:  "/workflows",
  Forms:      "/forms",
  "Nessa AI": "/ai",
};

const WORKFLOW_SECTION_MAP: Record<NonNullable<OnboardingSub> | Exclude<WorkflowItem, "Onboarding">, string> = {
  Employee:          "onboarding",
  Client:            "client",
  Partner:           "partner",
  Communication:     "client-communication",
  Discharge:         "discharge",
  "Service Changes": "service-changes",
  Incident:          "incident",
};

function pathToItem(pathname: string): PrimaryItem {
  if (pathname.startsWith("/dashboard"))  return "Dashboard";
  if (pathname.startsWith("/tasks"))      return "Tasks";
  if (pathname.startsWith("/clients"))    return "Clients";
  if (pathname.startsWith("/schedule"))   return "Schedule";
  if (pathname.startsWith("/evv"))        return "EVV";
  if (pathname.startsWith("/billing"))    return "Billing";
  if (pathname.startsWith("/reports"))    return "Reports";
  if (pathname.startsWith("/hr"))         return "HR";
  if (pathname.startsWith("/workflows"))  return "Workflows";
  if (pathname.startsWith("/forms"))      return "Forms";
  if (pathname.startsWith("/ai"))         return "Nessa AI";
  return "Dashboard";
}

// ─── SidebarItem ──────────────────────────────────────────────────────────────

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  hasChevron?: boolean;
  expanded?: boolean;
  sub?: boolean;
}

function SidebarItem({
  icon: Icon,
  label,
  badge,
  active,
  onClick,
  href,
  hasChevron,
  expanded,
  sub = false,
}: SidebarItemProps) {
  const classes = cn(
    "w-full flex items-center text-left rounded-lg transition-all duration-150 group",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-1",
    sub ? "gap-2 px-3 py-[5px]" : "gap-2.5 px-3 py-[6px]",
    active
      ? "bg-neutral-100 text-neutral-900"
      : "text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-800"
  );

  const content = (
    <>
      <Icon
        className={cn(
          "shrink-0 transition-colors",
          sub ? "h-3 w-3" : "h-[17px] w-[17px]",
          active
            ? sub ? "text-neutral-700" : "text-neutral-700"
            : sub
              ? "text-neutral-300 group-hover:text-neutral-500"
              : "text-neutral-400 group-hover:text-neutral-600"
        )}
      />
      <span
        className={cn(
          "leading-none flex-1 transition-colors",
          sub ? "text-[12px]" : "text-[12.5px]",
          active ? "font-semibold text-neutral-900" : "font-medium"
        )}
      >
        {label}
      </span>
      {badge !== undefined && (
        <span className="ml-auto flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-neutral-200/80 px-1.5 text-[10px] font-semibold text-neutral-500 leading-none">
          {badge}
        </span>
      )}
      {hasChevron && badge === undefined && (
        <ChevronRight
          className={cn(
            "ml-auto h-3 w-3 shrink-0 transition-all duration-200",
            active ? "text-neutral-400" : "text-neutral-300 group-hover:text-neutral-400",
            expanded && "rotate-90"
          )}
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch={true}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-expanded={hasChevron ? expanded : undefined}
      className={classes}
    >
      {content}
    </button>
  );
}

// ─── Icon Rail (only shown when primary sidebar is collapsed) ─────────────────

const RAIL_ICONS: { id: PrimaryItem; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "Dashboard",  icon: LayoutDashboard },
  { id: "Tasks",      icon: ClipboardList },
  { id: "Clients",    icon: Users },
  { id: "Schedule",   icon: Calendar },
  { id: "EVV",        icon: CheckSquare },
  { id: "Billing",    icon: CreditCard },
  { id: "Reports",    icon: BarChart3 },
  { id: "HR",         icon: UserCog },
  { id: "Workflows",  icon: Workflow },
  { id: "Forms",      icon: FileText },
  { id: "Nessa AI",   icon: Sparkles },
];

const RAIL_DIVIDER_BEFORE = new Set<PrimaryItem>(["Billing", "HR"]);

function IconRail({
  activePrimary,
  onActivate,
  onWorkflowsClick,
  onWorkflowsMouseEnter,
  onWorkflowsMouseLeave,
}: {
  activePrimary: PrimaryItem;
  onActivate: (item: PrimaryItem) => void;
  onWorkflowsClick?: () => void;
  onWorkflowsMouseEnter?: () => void;
  onWorkflowsMouseLeave?: () => void;
}) {
  return (
    <aside className="w-14 h-full flex flex-col items-center pt-2.5 pb-3 gap-0.5 overflow-y-auto">
      {RAIL_ICONS.map(({ id, icon: Icon }) => {
        const isActive = activePrimary === id;
        const isWorkflows = id === "Workflows";
        const classes = cn(
          "h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
          isActive
            ? "bg-neutral-100 text-neutral-700"
            : "text-neutral-400 hover:bg-neutral-100/70 hover:text-neutral-600"
        );
        return (
          <React.Fragment key={id}>
            {RAIL_DIVIDER_BEFORE.has(id) && (
              <div className="my-1 w-5 border-t border-neutral-200/60" />
            )}
            {isWorkflows ? (
              <button
                title={id}
                onClick={() => onWorkflowsClick ? onWorkflowsClick() : onActivate(id)}
                onMouseEnter={onWorkflowsMouseEnter}
                onMouseLeave={onWorkflowsMouseLeave}
                className={classes}
              >
                <Icon className="h-[17px] w-[17px]" />
              </button>
            ) : (
              <Link
                href={ROUTE_MAP[id]}
                prefetch={true}
                title={id}
                onClick={() => onActivate(id)}
                className={classes}
              >
                <Icon className="h-[17px] w-[17px]" />
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </aside>
  );
}

// ─── Primary Sidebar ──────────────────────────────────────────────────────────

const PRIMARY_SECTIONS: {
  label?: string;
  items: {
    id: PrimaryItem;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    hasChevron?: boolean;
  }[];
}[] = [
  {
    items: [
      { id: "Dashboard", icon: LayoutDashboard },
      { id: "Tasks",     icon: ClipboardList,   badge: "1" },
      { id: "Clients",   icon: Users,           badge: "99+" },
      { id: "Schedule",  icon: Calendar },
      { id: "EVV",       icon: CheckSquare,     badge: "8" },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { id: "Billing",  icon: CreditCard },
      { id: "Reports",  icon: BarChart3 },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { id: "HR",        icon: UserCog },
      { id: "Workflows", icon: Workflow, hasChevron: true },
      { id: "Forms",     icon: FileText },
      { id: "Nessa AI",  icon: Sparkles },
    ],
  },
];

function PrimarySidebar({
  activePrimary,
  onActivate,
  workflowsOpen,
  onWorkflowsMouseEnter,
  onWorkflowsMouseLeave,
}: {
  activePrimary: PrimaryItem;
  onActivate: (item: PrimaryItem) => void;
  workflowsOpen: boolean;
  onWorkflowsMouseEnter?: () => void;
  onWorkflowsMouseLeave?: () => void;
}) {
  const pathname = usePathname();
  
  return (
    <aside
      className="w-[200px] h-full flex flex-col"
      data-component="AppLayout-PrimarySidebar"
    >
      <nav
        aria-label="Primary navigation"
        className="flex flex-1 min-h-0 flex-col pt-5 pb-4 overflow-y-auto"
      >
        {PRIMARY_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className={cn(sIdx > 0 && "mt-3")}>
            {section.label && (
              <p className="px-4 pb-0.5 text-[9px] font-semibold tracking-widest uppercase text-neutral-400 select-none">
                {section.label}
              </p>
            )}
            <div className="px-2 space-y-0.5">
              {section.items.map((item) => {
                const isWorkflows = item.id === "Workflows";
                return (
                  <div
                    key={item.id}
                    onMouseEnter={isWorkflows ? onWorkflowsMouseEnter : undefined}
                    onMouseLeave={isWorkflows ? onWorkflowsMouseLeave : undefined}
                  >
                    <SidebarItem
                      icon={item.icon}
                      label={item.id}
                      badge={item.badge}
                      active={activePrimary === item.id}
                      hasChevron={item.hasChevron}
                      expanded={isWorkflows ? workflowsOpen : undefined}
                      href={ROUTE_MAP[item.id]}
                      onClick={() => onActivate(item.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom navigation items */}
      <div className="shrink-0 mx-3 border-t border-neutral-200/70 mb-1" />
      <div className="w-full px-2 pb-3 pt-1 space-y-0.5 shrink-0">
        <SidebarItem
          icon={Settings}
          label="Settings"
          active={pathname === "/settings" || pathname?.startsWith("/settings/")}
          href="/settings"
        />
        <SidebarItem
          icon={HelpCircle}
          label="Help & Support"
          badge="8"
          active={pathname === "/help" || pathname?.startsWith("/help/")}
          href="/help"
        />
      </div>
    </aside>
  );
}

// ─── Secondary Sidebar ────────────────────────────────────────────────────────

const ONBOARDING_CHILDREN: {
  id: NonNullable<OnboardingSub>;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "Employee", icon: UserCog },
  { id: "Client",   icon: UserCircle },
  { id: "Partner",  icon: Building2 },
];

const FLAT_WORKFLOW_ITEMS: {
  id: Exclude<WorkflowItem, "Onboarding">;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "Communication",   icon: MessageSquare },
  { id: "Discharge",       icon: LogOut },
  { id: "Service Changes", icon: RefreshCw },
  { id: "Incident",        icon: AlertTriangle },
];

function SecondarySidebar({
  isOpen,
  activeWorkflow,
  onActivateWorkflow,
  activeOnboardingSub,
  onActivateOnboardingSub,
  onMouseEnter,
  onMouseLeave,
}: {
  isOpen: boolean;
  activeWorkflow: WorkflowItem;
  onActivateWorkflow: (item: WorkflowItem) => void;
  activeOnboardingSub: OnboardingSub;
  onActivateOnboardingSub: (sub: OnboardingSub) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const onboardingCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [onboardingExpanded, setOnboardingExpanded] = useState(false);

  const clearOnboardingTimer = useCallback(() => {
    if (onboardingCloseTimerRef.current) {
      clearTimeout(onboardingCloseTimerRef.current);
      onboardingCloseTimerRef.current = null;
    }
  }, []);

  const handleOnboardingMouseEnter = useCallback(() => {
    clearOnboardingTimer();
    setOnboardingExpanded(true);
  }, [clearOnboardingTimer]);

  const handleOnboardingMouseLeave = useCallback(() => {
    onboardingCloseTimerRef.current = setTimeout(() => {
      setOnboardingExpanded(false);
      onboardingCloseTimerRef.current = null;
    }, 180);
  }, []);

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "shrink-0 border-r border-neutral-200/60 bg-white flex flex-col overflow-hidden",
        "transition-[width,opacity] duration-200 ease-in-out",
        isOpen ? "w-[190px] opacity-100" : "w-0 opacity-0 pointer-events-none"
      )}
    >
      {/* Fixed-width inner prevents content wrapping during animation */}
      <div className="w-[190px] flex flex-col flex-1 min-h-0 overflow-y-auto">
        <nav
          aria-label="Workflows navigation"
          className="flex-1 px-2 pt-[35px] pb-3 space-y-0.5"
        >
          {/* Onboarding expandable group — expands only on hover */}
          <div>
            <button
              onClick={() => {
                onActivateWorkflow("Onboarding");
                onActivateOnboardingSub(null);
              }}
              onMouseEnter={handleOnboardingMouseEnter}
              onMouseLeave={handleOnboardingMouseLeave}
              aria-expanded={onboardingExpanded}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-left transition-all duration-150 group",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-1",
                activeWorkflow === "Onboarding"
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-800"
              )}
            >
              <GitBranch
                className={cn(
                  "h-[17px] w-[17px] shrink-0 transition-colors",
                  activeWorkflow === "Onboarding"
                    ? "text-neutral-700"
                    : "text-neutral-400 group-hover:text-neutral-600"
                )}
              />
              <span
                className={cn(
                  "flex-1 text-[13px] leading-none",
                  activeWorkflow === "Onboarding" ? "font-semibold text-neutral-900" : "font-medium"
                )}
              >
                Onboarding
              </span>
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 text-neutral-300 transition-transform duration-200",
                  onboardingExpanded && "rotate-90"
                )}
              />
            </button>

            {/* Sub-items — only visible on hover over Onboarding button or this area */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                onboardingExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              )}
              onMouseEnter={handleOnboardingMouseEnter}
              onMouseLeave={handleOnboardingMouseLeave}
            >
              <div className="pl-3 pt-0.5 pb-1 space-y-0.5">
                {ONBOARDING_CHILDREN.map(({ id, icon }) => (
                  <SidebarItem
                    key={id}
                    icon={icon}
                    label={id}
                    active={activeOnboardingSub === id}
                    sub
                    onClick={() => {
                      onActivateWorkflow("Onboarding");
                      onActivateOnboardingSub(id);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Flat workflow items */}
          {FLAT_WORKFLOW_ITEMS.map(({ id, icon }) => (
            <SidebarItem
              key={id}
              icon={icon}
              label={id}
              active={activeWorkflow === id}
              onClick={() => {
                onActivateWorkflow(id);
                onActivateOnboardingSub(null);
              }}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

// ─── Memoized content wrapper (prevents sidebar state re-rendering children) ─

const MemoizedContent = React.memo(function MemoizedContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 min-w-0 overflow-y-auto bg-white pl-6 pt-4">
      {children}
    </main>
  );
});

// ─── AppLayout (root export) ──────────────────────────────────────────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const closePanelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const sidebarHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activePrimary, setActivePrimary] = useState<PrimaryItem>(
    () => pathToItem(pathname)
  );
  const [workflowsPanelHoverOpen, setWorkflowsPanelHoverOpen] = useState(false);
  const [workflowsPanelPinned, setWorkflowsPanelPinned] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowItem>("Onboarding");
  const [activeOnboardingSub, setActiveOnboardingSub] = useState<OnboardingSub>("Employee");

  // Sync sidebar highlight with actual pathname (e.g. on browser back/forward)
  useEffect(() => {
    const current = pathToItem(pathname);
    if (current !== activePrimary) {
      setActivePrimary(current);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch all sidebar routes on mount so navigation is instant
  useEffect(() => {
    Object.values(ROUTE_MAP).forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  const clearCloseTimer = useCallback(() => {
    if (closePanelTimerRef.current) {
      clearTimeout(closePanelTimerRef.current);
      closePanelTimerRef.current = null;
    }
  }, []);

  const clearSidebarHoverTimer = useCallback(() => {
    if (sidebarHoverTimerRef.current) {
      clearTimeout(sidebarHoverTimerRef.current);
      sidebarHoverTimerRef.current = null;
    }
  }, []);

  const handleSidebarMouseEnter = useCallback(() => {
    clearSidebarHoverTimer();
    setSidebarCollapsed(false);
  }, [clearSidebarHoverTimer]);

  const handleSidebarMouseLeave = useCallback(() => {
    clearSidebarHoverTimer();
    sidebarHoverTimerRef.current = setTimeout(() => {
      setSidebarCollapsed(true);
      sidebarHoverTimerRef.current = null;
    }, 200);
  }, [clearSidebarHoverTimer]);

  const handleWorkflowsMouseEnter = useCallback(() => {
    clearCloseTimer();
    setWorkflowsPanelHoverOpen(true);
  }, [clearCloseTimer]);

  const handleWorkflowsMouseLeave = useCallback(() => {
    closePanelTimerRef.current = setTimeout(() => {
      setWorkflowsPanelHoverOpen(false);
      closePanelTimerRef.current = null;
    }, 180);
  }, []);

  const handleSecondaryMouseEnter = useCallback(() => {
    clearCloseTimer();
    setWorkflowsPanelHoverOpen(true);
    // Keep the primary sidebar expanded while hovering the secondary panel
    clearSidebarHoverTimer();
    setSidebarCollapsed(false);
  }, [clearCloseTimer, clearSidebarHoverTimer]);

  const handleSecondaryMouseLeave = useCallback(() => {
    closePanelTimerRef.current = setTimeout(() => {
      setWorkflowsPanelHoverOpen(false);
      closePanelTimerRef.current = null;
    }, 180);
    // Start collapsing primary sidebar when leaving the secondary panel too
    clearSidebarHoverTimer();
    sidebarHoverTimerRef.current = setTimeout(() => {
      setSidebarCollapsed(true);
      sidebarHoverTimerRef.current = null;
    }, 200);
  }, [clearSidebarHoverTimer]);

  const handleActivatePrimary = (item: PrimaryItem) => {
    setActivePrimary(item);
    if (item !== "Workflows") setWorkflowsPanelPinned(false);
    // Navigation is handled by <Link> in SidebarItem; this only updates local state.
    // For the icon rail (which doesn't use Link), we still router.push.
  };

  const handleWorkflowsIconClick = useCallback(() => {
    setActivePrimary("Workflows");
    setWorkflowsPanelPinned((prev) => !prev);
    router.push(ROUTE_MAP["Workflows"]);
  }, [router]);

  const handleActivateWorkflow = (item: WorkflowItem) => {
    setActiveWorkflow(item);
    if (item !== "Onboarding") {
      setActiveOnboardingSub(null);
      router.push(
        `/workflows?section=${WORKFLOW_SECTION_MAP[item as Exclude<WorkflowItem, "Onboarding">]}`
      );
    }
  };

  const handleActivateOnboardingSub = (sub: OnboardingSub) => {
    setActiveOnboardingSub(sub);
    if (sub) {
      router.push(`/workflows?section=${WORKFLOW_SECTION_MAP[sub]}`);
    }
  };

  const secondaryOpen = workflowsPanelHoverOpen || workflowsPanelPinned;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        {/* Sidebar area: hover to expand, leave to collapse */}
        <div
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
          className={cn(
            "shrink-0 relative border-r border-neutral-200/60 bg-white overflow-hidden",
            "transition-[width] duration-200 ease-in-out",
            sidebarCollapsed ? "w-14" : "w-[200px]"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-150 ease-in-out",
              sidebarCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <IconRail
              activePrimary={activePrimary}
              onActivate={handleActivatePrimary}
              onWorkflowsClick={handleWorkflowsIconClick}
              onWorkflowsMouseEnter={handleWorkflowsMouseEnter}
              onWorkflowsMouseLeave={handleWorkflowsMouseLeave}
            />
          </div>
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-150 ease-in-out",
              sidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <PrimarySidebar
              activePrimary={activePrimary}
              onActivate={handleActivatePrimary}
              workflowsOpen={secondaryOpen}
              onWorkflowsMouseEnter={handleWorkflowsMouseEnter}
              onWorkflowsMouseLeave={handleWorkflowsMouseLeave}
            />
          </div>
        </div>

        <SecondarySidebar
          isOpen={secondaryOpen}
          activeWorkflow={activeWorkflow}
          onActivateWorkflow={handleActivateWorkflow}
          activeOnboardingSub={activeOnboardingSub}
          onActivateOnboardingSub={handleActivateOnboardingSub}
          onMouseEnter={handleSecondaryMouseEnter}
          onMouseLeave={handleSecondaryMouseLeave}
        />

        <MemoizedContent>{children}</MemoizedContent>
      </div>
    </div>
  );
}
