"use client";

import { useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Users,
  UserCircle,
  Building2,
  MessageSquare,
  LogOut,
  RefreshCw,
  AlertTriangle,
  GitBranch,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/useSidebarStore";

const onboardingChildren = [
  { id: "onboarding", label: "Employee", icon: Users },
  { id: "client", label: "Client", icon: UserCircle },
  { id: "partner", label: "Partner", icon: Building2 },
];

const onboardingIds = new Set(onboardingChildren.map((c) => c.id));

const flatSections = [
  { id: "client-communication", label: "Communication", icon: MessageSquare },
  { id: "discharge", label: "Discharge", icon: LogOut },
  { id: "service-changes", label: "Service Changes", icon: RefreshCw },
  { id: "incident", label: "Incident", icon: AlertTriangle },
];

export function WorkflowsSecondarySidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { workflowsPanelOpen, openWorkflowsPanel, scheduleCloseWorkflowsPanel, cancelClose } =
    useSidebarStore();

  const active = searchParams.get("section") ?? "onboarding";
  const onWorkflowsPage = pathname?.startsWith("/workflows") ?? false;
  const onboardingActive = onboardingIds.has(active);
  const [onboardingOpen, setOnboardingOpen] = useState(onboardingActive);

  // Panel is visible when hovered from primary sidebar OR pinned on the workflows page
  const isVisible = workflowsPanelOpen || onWorkflowsPage;

  return (
    <aside
      onMouseEnter={cancelClose}
      onMouseLeave={onWorkflowsPage ? undefined : scheduleCloseWorkflowsPanel}
      className={cn(
        "shrink-0 border-r border-neutral-200/60 bg-white flex flex-col overflow-hidden",
        "transition-[width] duration-200 ease-in-out",
        isVisible ? "w-48" : "w-0"
      )}
    >
      {/* Fixed-width inner container so content never wraps during animation */}
      <div className="w-48 flex flex-col flex-1 overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-0.5">

          {/* Onboarding group */}
          <div
            onMouseEnter={() => setOnboardingOpen(true)}
            onMouseLeave={() => !onboardingActive && setOnboardingOpen(false)}
          >
            <button
              onClick={() => {
                setOnboardingOpen((o) => !o);
                router.push(`/workflows?section=onboarding`);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-100 group",
                onboardingActive
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
              )}
            >
              <GitBranch
                className={cn(
                  "h-[17px] w-[17px] shrink-0 transition-colors",
                  onboardingActive
                    ? "text-neutral-800"
                    : "text-neutral-400 group-hover:text-neutral-600"
                )}
              />
              <span
                className={cn(
                  "flex-1 text-[13px] leading-none",
                  onboardingActive ? "font-semibold text-neutral-900" : "font-medium"
                )}
              >
                Onboarding
              </span>
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 text-neutral-300 transition-transform duration-200",
                  (onboardingOpen || onboardingActive) && "rotate-90"
                )}
              />
            </button>

            {/* Sub-items — smooth slide */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                onboardingOpen || onboardingActive ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="pl-3 pt-0.5 pb-0.5 space-y-0.5">
                {onboardingChildren.map(({ id, label, icon: Icon }) => {
                  const isActive = active === id;
                  return (
                    <button
                      key={id}
                      onClick={() =>
                        router.push(
                          isActive ? "/workflows?section=none" : `/workflows?section=${id}`
                        )
                      }
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors duration-100 group",
                        isActive
                          ? "bg-neutral-100 text-neutral-900"
                          : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          isActive
                            ? "text-neutral-700"
                            : "text-neutral-300 group-hover:text-neutral-500"
                        )}
                      />
                      <span
                        className={cn(
                          "text-[12.5px] leading-none",
                          isActive ? "font-semibold text-neutral-900" : "font-medium"
                        )}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Flat sections */}
          {flatSections.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() =>
                  router.push(isActive ? "/workflows?section=none" : `/workflows?section=${id}`)
                }
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-100 group",
                  isActive
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                )}
              >
                <Icon
                  className={cn(
                    "h-[17px] w-[17px] shrink-0 transition-colors",
                    isActive
                      ? "text-neutral-800"
                      : "text-neutral-400 group-hover:text-neutral-600"
                  )}
                />
                <span
                  className={cn(
                    "text-[13px] leading-none",
                    isActive ? "font-semibold text-neutral-900" : "font-medium"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
