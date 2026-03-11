"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  FolderKanban,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

type Agent = {
  id: string;
  name: string;
  category: string;
  department: string;
  description: string;
  badges: string[];
  icon: React.ReactNode;
  recommended: boolean;
  capabilities: string[];
};

const agents: Agent[] = [
  {
    id: "smart-scheduler",
    name: "Smart Scheduler Agent",
    category: "Scheduling",
    department: "Scheduling & Staffing",
    description:
      "Auto-suggest schedules, fill open shifts, warn about conflicts, caregiver availability.",
    badges: ["Recommended", "Saves 2h/week"],
    icon: <Calendar className="h-5 w-5" />,
    recommended: true,
    capabilities: [
      "Matches caregivers by availability and skills",
      "Flags conflicts and travel-time issues",
      "Suggests optimal coverage for open shifts",
    ],
  },
  {
    id: "evv-timesheet-validator",
    name: "EVV & Timesheet Validator",
    category: "EVV / Time Clock",
    department: "Scheduling & Staffing",
    description:
      "Flags missing clock-in/out, GPS mismatch, overtime risks, incomplete notes.",
    badges: ["Recommended", "HIPAA-ready"],
    icon: <Clock className="h-5 w-5" />,
    recommended: true,
    capabilities: [
      "Detects missing clock events or GPS mismatches",
      "Highlights overtime or break violations",
      "Summarizes compliance risks before approval",
    ],
  },
  {
    id: "billing-invoice-builder",
    name: "Billing & Invoice Builder",
    category: "Billing",
    department: "Operations",
    description:
      "Generates invoices from approved shifts, flags missing mileage/expenses, tracks unpaid.",
    badges: ["Recommended", "Reduces denials"],
    icon: <FileText className="h-5 w-5" />,
    recommended: true,
    capabilities: [
      "Creates invoices from approved visits",
      "Flags missing mileage or expense details",
      "Tracks unpaid balances and exceptions",
    ],
  },
  {
    id: "compliance-doc-checker",
    name: "Compliance & Documentation Checker",
    category: "Compliance",
    department: "Operations",
    description:
      "Detects missing forms (TB, background check, I-9), expiring docs, required signatures.",
    badges: ["Recommended", "HIPAA-ready"],
    icon: <ShieldCheck className="h-5 w-5" />,
    recommended: true,
    capabilities: [
      "Audits required documents for completeness",
      "Tracks expiring credentials and renewals",
      "Alerts on missing signatures and forms",
    ],
  },
  {
    id: "shift-fill-assistant",
    name: "Shift Fill Assistant",
    category: "Scheduling",
    department: "Scheduling & Staffing",
    description: "Finds the best caregiver for an open shift.",
    badges: ["Fast match"],
    icon: <Users className="h-5 w-5" />,
    recommended: false,
    capabilities: [
      "Ranks caregivers by fit and proximity",
      "Checks licensing and availability",
      "Suggests backfill options",
    ],
  },
  {
    id: "conflict-detector",
    name: "Conflict Detector",
    category: "Scheduling",
    department: "Scheduling & Staffing",
    description: "Flags overlaps, travel-time issues, and max-hours.",
    badges: ["Risk alert"],
    icon: <AlertTriangle className="h-5 w-5" />,
    recommended: false,
    capabilities: [
      "Detects schedule overlaps and double-bookings",
      "Highlights travel-time conflicts",
      "Warns on max-hours policies",
    ],
  },
  {
    id: "client-preference-matcher",
    name: "Client Preference Matcher",
    category: "Scheduling",
    department: "Scheduling & Staffing",
    description: "Matches language, gender preference, skills, distance.",
    badges: ["Personalized"],
    icon: <CheckCircle className="h-5 w-5" />,
    recommended: false,
    capabilities: [
      "Matches caregiver skills and languages",
      "Honors client preferences and distance",
      "Explains match quality with notes",
    ],
  },
  {
    id: "care-note-summarizer",
    name: "Care Note Summarizer",
    category: "Care Notes",
    department: "Care Delivery & Notes",
    description: "Turns daily notes into a clean summary.",
    badges: ["Time saver"],
    icon: <FileText className="h-5 w-5" />,
    recommended: false,
    capabilities: [
      "Summarizes daily visit notes",
      "Highlights changes or concerns",
      "Formats notes for clinical review",
    ],
  },
  {
    id: "incident-report-drafter",
    name: "Incident Report Drafter",
    category: "Care Notes",
    department: "Care Delivery & Notes",
    description: "Guided incident form with suggested wording.",
    badges: ["Guided"],
    icon: <AlertTriangle className="h-5 w-5" />,
    recommended: false,
    capabilities: [
      "Guides staff through incident details",
      "Suggests compliant wording",
      "Flags missing required fields",
    ],
  },
  {
    id: "family-update-composer",
    name: "Family Update Composer",
    category: "Care Notes",
    department: "Care Delivery & Notes",
    description: "Creates professional updates based on visit notes.",
    badges: ["Client-ready"],
    icon: <MessageSquare className="h-5 w-5" />,
    recommended: false,
    capabilities: [
      "Drafts family updates from caregiver notes",
      "Keeps tone consistent and professional",
      "Highlights key care outcomes",
    ],
  },
  {
    id: "applicant-screener",
    name: "Applicant Screener",
    category: "Recruiting",
    department: "Recruiting & Onboarding",
    description: "Scores candidates and flags missing info.",
    badges: ["Faster hiring"],
    icon: <Briefcase className="h-5 w-5" />,
    recommended: false,
    capabilities: [
      "Scores candidates against role requirements",
      "Highlights missing certifications",
      "Suggests next-step actions",
    ],
  },
  {
    id: "onboarding-checklist-agent",
    name: "Onboarding Checklist Agent",
    category: "Recruiting",
    department: "Recruiting & Onboarding",
    description: "Steps, documents, and reminders for new hires.",
    badges: ["Organized"],
    icon: <CheckCircle className="h-5 w-5" />,
    recommended: false,
    capabilities: [
      "Generates onboarding checklists",
      "Tracks required documents",
      "Sends reminder prompts",
    ],
  },
  {
    id: "training-reminder-agent",
    name: "Training Reminder Agent",
    category: "Recruiting",
    department: "Recruiting & Onboarding",
    description: "Tracks CPR renewals and annual training due dates.",
    badges: ["Compliance-ready"],
    icon: <Calendar className="h-5 w-5" />,
    recommended: false,
    capabilities: [
      "Monitors certification renewal dates",
      "Schedules training reminders",
      "Creates follow-up tasks",
    ],
  },
];

const featuredAgentIds = [
  "smart-scheduler",
  "evv-timesheet-validator",
  "billing-invoice-builder",
  "compliance-doc-checker",
];

const sections = [
  {
    id: "scheduling",
    title: "Scheduling & Staffing",
    description: "Optimize coverage, reduce conflicts, and fill shifts faster.",
    agentIds: [
      "shift-fill-assistant",
      "conflict-detector",
      "client-preference-matcher",
    ],
  },
  {
    id: "care-delivery",
    title: "Care Delivery & Notes",
    description: "Turn daily notes into clear, compliant communications.",
    agentIds: [
      "care-note-summarizer",
      "incident-report-drafter",
      "family-update-composer",
    ],
  },
  {
    id: "recruiting",
    title: "Recruiting & Onboarding",
    description: "Screen applicants and keep onboarding on track.",
    agentIds: [
      "applicant-screener",
      "onboarding-checklist-agent",
      "training-reminder-agent",
    ],
  },
];

const chipCategories = [
  "Scheduling",
  "EVV / Time Clock",
  "Billing",
  "Compliance",
  "Care Notes",
  "Recruiting",
];

const skeletonCards = Array.from({ length: 4 }, (_, index) => `skeleton-${index}`);

export function AIDashboard() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [dropdownCategory, setDropdownCategory] = React.useState("All");
  const [selectedDepartment, setSelectedDepartment] = React.useState("All");
  const [onlyRecommended, setOnlyRecommended] = React.useState(false);
  const [activeAgent, setActiveAgent] = React.useState<Agent | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState("");
  const [aiQuestion, setAiQuestion] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const categoryOptions = React.useMemo(() => {
    const unique = Array.from(new Set(agents.map((agent) => agent.category)));
    return ["All", ...unique];
  }, []);

  const departmentOptions = React.useMemo(() => {
    const unique = Array.from(new Set(agents.map((agent) => agent.department)));
    return ["All", ...unique];
  }, []);

  const filteredAgents = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return agents.filter((agent) => {
      const matchesSearch =
        !query ||
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query) ||
        agent.category.toLowerCase().includes(query);
      const matchesCategories =
        selectedCategories.length === 0 ||
        selectedCategories.includes(agent.category);
      const matchesDropdownCategory =
        selectedCategories.length > 0 ||
        dropdownCategory === "All" ||
        dropdownCategory === agent.category;
      const matchesDepartment =
        selectedDepartment === "All" || agent.department === selectedDepartment;
      const matchesRecommended = !onlyRecommended || agent.recommended;

      return (
        matchesSearch &&
        matchesCategories &&
        matchesDropdownCategory &&
        matchesDepartment &&
        matchesRecommended
      );
    });
  }, [
    searchTerm,
    selectedCategories,
    dropdownCategory,
    selectedDepartment,
    onlyRecommended,
  ]);

  const filteredIds = React.useMemo(
    () => new Set(filteredAgents.map((agent) => agent.id)),
    [filteredAgents]
  );

  const recommendedAgents = React.useMemo(
    () => agents.filter((agent) => featuredAgentIds.includes(agent.id)),
    []
  );

  const filteredRecommended = React.useMemo(
    () => recommendedAgents.filter((agent) => filteredIds.has(agent.id)),
    [recommendedAgents, filteredIds]
  );

  const filteredSections = React.useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        agents: agents.filter(
          (agent) => section.agentIds.includes(agent.id) && filteredIds.has(agent.id)
        ),
      }))
      .filter((section) => section.agents.length > 0);
  }, [filteredIds]);

  const showEmptyState = !loading && filteredAgents.length === 0;

  const handleChipToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const handleRun = () => {
    setToastMessage("Agent started");
  };

  return (
    <div className="-m-3 min-h-full pb-12" style={{ background: 'linear-gradient(115deg, #ffffff, #d4dfed)' }}>
      <div className="p-8 space-y-10">
        {/* Hero Section */}
        <div className="relative overflow-hidden py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Title */}
          <div className="text-center">
            <div className="mb-2 inline-flex items-center gap-2">
              <div className="flex items-center -space-x-1.5">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-500" />
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                Nessa Agents
                <sup className="ml-1 text-lg font-normal text-gray-400">™</sup>
              </h1>
            </div>
          </div>

          {/* Input Section */}
          <div className="mx-auto max-w-3xl">
            <div className="relative rounded-[28px] bg-gradient-to-r from-orange-300 via-purple-300 to-blue-300 p-[2px] shadow-lg overflow-hidden">
              {/* Main input container */}
              <div className="relative rounded-[26px] bg-white overflow-hidden">
                <Textarea
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="What should your new teammate work with you on?"
                  className="min-h-[130px] resize-none border-0 bg-transparent px-16 py-6 text-base placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-[26px]"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute bottom-5 left-4 h-9 w-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  <Plus className="h-3 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute bottom-5 right-4 h-9 w-9 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300"
                  onClick={() => {
                    if (aiQuestion.trim()) {
                      setToastMessage("Processing your request...");
                      setAiQuestion("");
                      router.push("/ai/chat");
                    }
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Example Agents */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="cursor-pointer space-y-2 rounded-xl bg-white/70 p-4 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Client Onboarder</h3>
                <p className="mt-0.5 text-xs text-gray-500">Streamlines client intake</p>
              </div>
            </div>
            <div className="cursor-pointer space-y-2 rounded-xl bg-white/70 p-4 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Productivity Coach</h3>
                <p className="mt-0.5 text-xs text-gray-500">Optimizes workflow usage</p>
              </div>
            </div>
            <div className="cursor-pointer space-y-2 rounded-xl bg-white/70 p-4 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500">
                <FolderKanban className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Project Assistant</h3>
                <p className="mt-0.5 text-xs text-gray-500">Manages project tasks</p>
              </div>
            </div>
            <div className="cursor-pointer space-y-2 rounded-xl bg-white/70 p-4 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">AI Guide</h3>
                <p className="mt-0.5 text-xs text-gray-500">Maximizes AI benefits</p>
              </div>
            </div>
          </div>
        </div>
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Recommended for Homecare Ops</h2>
            <p className="text-xs text-muted-foreground">
              Curated agents to automate high-impact workflows.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {loading
              ? skeletonCards.map((key) => (
                  <Card key={key} className="overflow-hidden border bg-white shadow-sm">
                    <CardContent className="space-y-3 p-4">
                      <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                      <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-full rounded bg-muted animate-pulse" />
                        <div className="h-2.5 w-5/6 rounded bg-muted animate-pulse" />
                      </div>
                      <div className="pt-1">
                        <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              : filteredRecommended.map((agent) => (
                  <Card
                    key={agent.id}
                    className="group cursor-pointer overflow-hidden border bg-white shadow-sm transition-all hover:shadow-md"
                    onClick={() => setActiveAgent(agent)}
                  >
                    <CardContent className="space-y-3 p-4">
                      {/* Category Badge */}
                      <Badge 
                        variant="secondary" 
                        className="rounded-md bg-purple-50 text-purple-700 hover:bg-purple-50 text-xs"
                      >
                        {agent.category}
                      </Badge>

                      {/* Title */}
                      <h3 className="text-sm font-semibold leading-tight">
                        {agent.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {agent.description}
                      </p>

                      {/* Bottom section with avatar */}
                      <div className="pt-1">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-[10px]">
                            AI
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </section>

        <Dialog open={Boolean(activeAgent)} onOpenChange={(open) => !open && setActiveAgent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{activeAgent?.name}</DialogTitle>
              <DialogDescription>{activeAgent?.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold">What it can do</h4>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {activeAgent?.capabilities.map((capability) => (
                    <li key={capability}>{capability}</li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="client-name">
                    Client name
                  </label>
                  <Input id="client-name" placeholder="e.g., Maria Johnson" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="caregiver-name">
                    Caregiver name
                  </label>
                  <Input id="caregiver-name" placeholder="e.g., Renee Walters" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="date-range">
                    Date range
                  </label>
                  <Input id="date-range" placeholder="Jan 10 - Jan 24" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="shift-id">
                    Shift ID
                  </label>
                  <Input id="shift-id" placeholder="Shift-1024" />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  Security
                </div>
                <div className="mt-2 space-y-1">
                  <p>HIPAA considerations: avoid PHI in free text fields.</p>
                  <p>Audit logging enabled.</p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline">Save as Workflow</Button>
              <Button onClick={handleRun}>Run Agent</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
              <DialogDescription>
                This is a placeholder for the agent builder experience.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Close
              </Button>
              <Button disabled>Continue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {toastMessage && (
          <div
            className="fixed right-6 top-6 z-50 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg"
            role="status"
            aria-live="polite"
          >
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
