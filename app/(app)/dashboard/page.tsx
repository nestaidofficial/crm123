"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo, useId } from "react";
import type { CSSProperties } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { format } from "date-fns";
import {
  ArrowUp,
  ArrowUpDown,
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  ChevronsRight,
  Clock,
  ColumnsIcon,
  Copy,
  Download,
  ExternalLink,
  FileText,
  GripVertical,
  Info,
  MoreHorizontal,
  MoreVerticalIcon,
  RefreshCw,
  SearchIcon,
  Trash2,
  UsersIcon,
  UserCheck,
  ClockIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  type Cell,
  type ColumnDef,
  type ColumnFiltersState,
  type Header,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useEmployeesStore } from "@/store/useEmployeesStore";
import { useClientsStore } from "@/store/useClientsStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useSupabaseRealtimeMulti } from "@/lib/hooks/useSupabaseRealtime";

// ═════════════════════════════════════════════════════════════════════════════
// COUNT ANIMATION
// ═════════════════════════════════════════════════════════════════════════════
function CountAnimation({
  number,
  className,
}: {
  number: number;
  className?: string;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, number, { duration: 2 });
    return animation.stop;
  }, [count, number]);

  return <motion.span className={cn(className)}>{rounded}</motion.span>;
}


// ═════════════════════════════════════════════════════════════════════════════
// DATE RANGE PICKER
// ═════════════════════════════════════════════════════════════════════════════
function DateRangePicker() {
  const [date, setDate] = useState<{ from: Date; to?: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 27)),
    to: new Date(),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal text-sm gap-2 h-9">
          <CalendarIcon className="size-4 text-neutral-500" />
          {date.from && date.to ? (
            <>
              {format(date.from, "dd MMM yyyy")} - {format(date.to, "dd MMM yyyy")}
            </>
          ) : date.from ? (
            format(date.from, "dd MMM yyyy")
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          defaultMonth={date.from}
          selected={date}
          onSelect={(newDate: any) => {
            if (newDate) {
              setDate(newDate);
            }
          }}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUMMARY CARDS — uses real dashboard store data
// ═════════════════════════════════════════════════════════════════════════════
function parseChangeLabel(label: string): { value: string; suffix: string } {
  const parts = label.split(" ");
  const value = parts[0] ?? label;
  const suffix = parts.slice(1).join(" ") || "from last month";
  return { value, suffix };
}

function ChangeLabel({ label }: { label: string }) {
  const { value, suffix } = parseChangeLabel(label);
  const isNegative = value.startsWith("-");
  return (
    <p className="text-sm text-neutral-500">
      <span className={isNegative ? "text-red-500" : "text-green-600"}>{value}</span>{" "}
      {suffix}
    </p>
  );
}

function SummaryCards() {
  const { stats, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalVisits = stats?.scheduledVisitsToday?.value ?? 0;
  const newClients = stats?.newClientsThisMonth?.value ?? 0;
  const openShifts = stats?.openShifts?.value ?? 0;
  const careHours = stats?.careHoursThisMonth?.value ?? 0;

  const visitChange = stats?.scheduledVisitsToday?.changeLabel ?? "0 scheduled today";
  const clientChange = stats?.newClientsThisMonth?.changeLabel ?? "0 added this month";
  const shiftsChange = stats?.openShifts?.changeLabel ?? "All shifts filled";
  const hoursChange = stats?.careHoursThisMonth?.changeLabel ?? "0h delivered this month";

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200">
      <div className="grid divide-y md:grid-cols-2 md:divide-x lg:grid-cols-4 lg:divide-y-0">
        <Card className="relative hover:bg-neutral-50 rounded-none border-0 transition-colors">
          <div className="absolute end-4 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-indigo-200 p-4">
            <CalendarIcon className="size-5" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-neutral-500">Total Visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-4xl font-semibold text-neutral-900">
              <CountAnimation number={totalVisits} />
            </div>
            <ChangeLabel label={visitChange} />
          </CardContent>
        </Card>

        <Card className="relative hover:bg-neutral-50 rounded-none border-0 transition-colors">
          <div className="absolute end-4 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-green-200 p-4">
            <UsersIcon className="size-5" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-neutral-500">New Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-4xl font-semibold text-neutral-900">
              <CountAnimation number={newClients} />
            </div>
            <ChangeLabel label={clientChange} />
          </CardContent>
        </Card>

        <Card className="relative hover:bg-neutral-50 rounded-none border-0 transition-colors">
          <div className="absolute end-4 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-purple-200 p-4">
            <UserCheck className="size-5" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-neutral-500">Open Shifts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-4xl font-semibold text-neutral-900">
              <CountAnimation number={openShifts} />
            </div>
            <ChangeLabel label={shiftsChange} />
          </CardContent>
        </Card>

        <Card className="relative hover:bg-neutral-50 rounded-none border-0 transition-colors">
          <div className="absolute end-4 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-orange-200 p-4">
            <ClockIcon className="size-5" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-neutral-500">Care Hours Delivered</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-4xl font-semibold text-neutral-900">
              <CountAnimation number={careHours} />
              <span className="text-xl font-normal text-neutral-500">h</span>
            </div>
            <ChangeLabel label={hoursChange} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VISIT TRENDS LINE CHART
// ═════════════════════════════════════════════════════════════════════════════
const visitChartConfig = {
  personal: { label: "Personal Care", color: "#18181b" },
  skilled: { label: "Skilled Nursing", color: "#71717a" },
  companion: { label: "Companionship", color: "#a1a1aa" },
} satisfies ChartConfig;

// Monthly mock data keyed by year
const monthlyDataByYear: Record<string, Array<{ period: string; personal: number; skilled: number; companion: number }>> = {
  "2025": [
    { period: "January",   personal: 186, skilled: 140, companion: 150 },
    { period: "February",  personal: 305, skilled: 230, companion: 176 },
    { period: "March",     personal: 237, skilled: 120, companion: 190 },
    { period: "April",     personal: 173, skilled: 190, companion: 170 },
    { period: "May",       personal: 209, skilled: 130, companion: 129 },
    { period: "June",      personal: 214, skilled:  90, companion: 180 },
    { period: "July",      personal: 248, skilled: 155, companion: 212 },
    { period: "August",    personal: 291, skilled: 172, companion: 198 },
    { period: "September", personal: 263, skilled: 148, companion: 221 },
    { period: "October",   personal: 312, skilled: 162, companion: 244 },
    { period: "November",  personal: 284, skilled: 138, companion: 205 },
    { period: "December",  personal: 326, skilled: 195, companion: 258 },
  ],
  "2024": [
    { period: "January",   personal: 155, skilled: 118, companion: 132 },
    { period: "February",  personal: 268, skilled: 205, companion: 159 },
    { period: "March",     personal: 214, skilled: 102, companion: 175 },
    { period: "April",     personal: 147, skilled: 171, companion: 155 },
    { period: "May",       personal: 190, skilled: 115, companion: 112 },
    { period: "June",      personal: 196, skilled:  78, companion: 163 },
    { period: "July",      personal: 230, skilled: 140, companion: 194 },
    { period: "August",    personal: 272, skilled: 158, companion: 181 },
    { period: "September", personal: 244, skilled: 132, companion: 202 },
    { period: "October",   personal: 291, skilled: 147, companion: 223 },
    { period: "November",  personal: 263, skilled: 122, companion: 188 },
    { period: "December",  personal: 308, skilled: 178, companion: 238 },
  ],
  "2023": [
    { period: "January",   personal: 130, skilled:  98, companion: 114 },
    { period: "February",  personal: 242, skilled: 180, companion: 138 },
    { period: "March",     personal: 188, skilled:  88, companion: 152 },
    { period: "April",     personal: 126, skilled: 148, companion: 134 },
    { period: "May",       personal: 168, skilled: 100, companion:  97 },
    { period: "June",      personal: 172, skilled:  64, companion: 142 },
    { period: "July",      personal: 205, skilled: 118, companion: 168 },
    { period: "August",    personal: 248, skilled: 136, companion: 158 },
    { period: "September", personal: 220, skilled: 112, companion: 178 },
    { period: "October",   personal: 265, skilled: 128, companion: 198 },
    { period: "November",  personal: 238, skilled: 104, companion: 165 },
    { period: "December",  personal: 280, skilled: 158, companion: 215 },
  ],
};

// Weekly mock data keyed by "YYYY-M" (1-indexed month)
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function genWeeklyData(seed: number, weeks: number) {
  return Array.from({ length: weeks }, (_, i) => ({
    period: `W${i + 1}`,
    personal: Math.round(42 + Math.sin((seed + i) * 0.7) * 18 + (i % 3) * 4),
    skilled:  Math.round(30 + Math.cos((seed + i) * 0.9) * 12 + (i % 2) * 3),
    companion: Math.round(36 + Math.sin((seed + i) * 0.5) * 15 + (i % 4) * 2),
  }));
}
const weeklyDataByMonthYear: Record<string, ReturnType<typeof genWeeklyData>> = {};
["2023","2024","2025"].forEach((yr) => {
  MONTH_NAMES.forEach((_, mi) => {
    const weeksInMonth = new Date(parseInt(yr), mi + 1, 0).getDate() > 28 ? 5 : 4;
    weeklyDataByMonthYear[`${yr}-${mi}`] = genWeeklyData(mi * 7 + parseInt(yr) % 10, weeksInMonth);
  });
});

type TrendView = "monthly" | "weekly";

function VisitTrendsChart() {
  const [trendView, setTrendView] = useState<TrendView>("monthly");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth())); // 0-indexed

  const chartData = trendView === "monthly"
    ? (monthlyDataByYear[selectedYear] ?? monthlyDataByYear["2025"])
    : (weeklyDataByMonthYear[`${selectedYear}-${selectedMonth}`] ?? []);

  const xTickFormatter = trendView === "monthly"
    ? (v: string) => v.slice(0, 3)
    : (v: string) => v;

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Visit Trends</CardTitle>
        <CardAction className="-mt-2.5 flex items-center gap-2">
          {/* Monthly / Weekly toggle */}
          <div className="inline-flex h-9 items-center rounded-md border border-input bg-background p-0.5 text-sm">
            <button
              onClick={() => setTrendView("monthly")}
              className={cn(
                "h-full rounded px-3 text-sm font-medium transition-colors",
                trendView === "monthly"
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setTrendView("weekly")}
              className={cn(
                "h-full rounded px-3 text-sm font-medium transition-colors",
                trendView === "weekly"
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              Weekly
            </button>
          </div>

          {/* Year selector (monthly view) or Month selector (weekly view) */}
          {trendView === "monthly" ? (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 w-[80px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 w-[110px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer className="w-full min-h-[280px] lg:h-[400px]" config={visitChartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 6, right: 6, bottom: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={xTickFormatter}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={35}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="personal"
              type="natural"
              stroke="var(--color-personal)"
              strokeWidth={2}
              dot={{ r: 4, fill: "#fff", stroke: "var(--color-personal)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
            <Line
              dataKey="skilled"
              type="natural"
              stroke="var(--color-skilled)"
              strokeWidth={2}
              dot={{ r: 4, fill: "#fff", stroke: "var(--color-skilled)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
            <Line
              dataKey="companion"
              type="natural"
              stroke="var(--color-companion)"
              strokeWidth={2}
              dot={{ r: 4, fill: "#fff", stroke: "var(--color-companion)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CLIENTS BY SERVICE TYPE PIE CHART
// ═════════════════════════════════════════════════════════════════════════════
const serviceChartData = [
  { service: "personalCare", visitors: 275, fill: "var(--color-personalCare)" },
  { service: "skilledNursing", visitors: 200, fill: "var(--color-skilledNursing)" },
  { service: "companionship", visitors: 187, fill: "var(--color-companionship)" },
  { service: "therapyServices", visitors: 173, fill: "var(--color-therapyServices)" },
];

const serviceChartConfig = {
  visitors: { label: "Clients" },
  personalCare: { label: "Personal Care", color: "#18181b" },
  skilledNursing: { label: "Skilled Nursing", color: "#3f3f46" },
  companionship: { label: "Companionship", color: "#71717a" },
  therapyServices: { label: "Therapy Services", color: "#a1a1aa" },
} satisfies ChartConfig;

function ClientsByServiceChart() {
  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Clients by Service Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={serviceChartConfig}
          className="[&_.recharts-pie-label-text]:fill-neutral-500 [&_.recharts-pie-label-text]:text-[11px] mx-auto min-h-[280px] max-h-[400px] pb-0"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={serviceChartData} dataKey="visitors" label nameKey="service" />
            <ChartLegend
              content={<ChartLegendContent nameKey="service" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOP SERVICES
// ═════════════════════════════════════════════════════════════════════════════
function getChartColorClass(colorKey: string): string {
  switch (colorKey) {
    case "color1": return "bg-amber-500";
    case "color2": return "bg-indigo-400";
    case "color3": return "bg-green-500";
    case "color4": return "bg-purple-400";
    case "color5": return "bg-pink-400";
    default: return "bg-amber-500";
  }
}

const services = [
  { name: "Personal Care", clientCount: 500, percentage: 78, colorKey: "color1" },
  { name: "Skilled Nursing", clientCount: 350, percentage: 48, colorKey: "color2" },
  { name: "Companionship", clientCount: 450, percentage: 84, colorKey: "color3" },
  { name: "Physical Therapy", clientCount: 280, percentage: 62, colorKey: "color4" },
  { name: "Behavioral Support", clientCount: 320, percentage: 71, colorKey: "color5" },
];

const totalClients = 3278;
const serviceChange = 178;
const totalFromList = services.reduce((sum, s) => sum + s.clientCount, 0);
const segments = services.map((s) => ({
  width: (s.clientCount / totalFromList) * 100,
  color: getChartColorClass(s.colorKey),
}));

function TopServices() {
  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Top Services{" "}
            <Tooltip>
              <TooltipTrigger>
                <Info className="text-neutral-400 hover:text-neutral-700 size-4" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Service distribution by client count</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardAction className="-me-2 -mt-2">
            <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-neutral-700 text-sm">
              See Details
              <ChevronsRight className="size-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-neutral-900">{totalClients}</span>
              <Badge className="flex items-center gap-0.5 border-green-600 bg-transparent font-medium text-green-600 text-sm">
                <ArrowUp className="size-4" />
                {serviceChange}
              </Badge>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full">
              {segments.map((seg, i) => (
                <div key={i} className={seg.color} style={{ width: `${seg.width}%` }} />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            {services.map((service) => (
              <div key={service.name} className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div
                    className={`mt-1.5 size-3 shrink-0 rounded-full ${getChartColorClass(service.colorKey)}`}
                  />
                  <div className="min-w-0">
                    <p className="text-base font-medium text-neutral-900">{service.name}</p>
                    <p className="text-sm text-neutral-500">
                      {service.clientCount} Clients
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-base">
                  <span className="font-medium text-neutral-700">{service.percentage}%</span>
                  <ExternalLink className="text-neutral-400 size-3.5" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SCHEDULED VISITS CALENDAR
// ═════════════════════════════════════════════════════════════════════════════
function isSameCalendarDay(a: Date, b: Date | undefined): boolean {
  if (!b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function statusBadgeVariant(status: string): "positive" | "warning" | "neutral" | "negative" | "info" {
  switch (status) {
    case "confirmed":
    case "completed":
      return "positive";
    case "scheduled":
    case "in_progress":
      return "info";
    case "cancelled":
    case "no_show":
      return "negative";
    default:
      return "warning";
  }
}

function formatEventHour(startAt: string, endAt: string): string {
  const fmt = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m} ${ampm}`;
  };
  return `${fmt(new Date(startAt))}–${fmt(new Date(endAt))}`;
}

function ScheduledVisitsCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  const events = useScheduleStore((s) => s.events);
  const isLoading = useScheduleStore((s) => s.isLoading);
  const hydrate = useScheduleStore((s) => s.hydrate);
  const clearCache = useScheduleStore((s) => s.clearCache);

  const clients = useClientsStore((s) => s.clients);
  const employees = useEmployeesStore((s) => s.employees);

  const clientMap = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const employeeMap = React.useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Hydrate the visible month's schedule whenever the month changes
  useEffect(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const startDate = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const endDate = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    clearCache();
    hydrate({ startDate, endDate });
  }, [viewMonth, hydrate, clearCache]);

  // Supabase Realtime — re-fetch when schedule_events change
  useSupabaseRealtimeMulti("schedule_events", {
    onInsert: () => { clearCache(); hydrate(); },
    onUpdate: () => { clearCache(); hydrate(); },
    onDelete: () => { clearCache(); hydrate(); },
  });

  const datesWithEvents = React.useMemo(() => {
    const seen = new Set<string>();
    return events
      .map((e) => { const d = new Date(e.startAt); d.setHours(0, 0, 0, 0); return d; })
      .filter((d) => { const key = d.getTime().toString(); if (seen.has(key)) return false; seen.add(key); return true; });
  }, [events]);

  const eventsForSelectedDate = React.useMemo(() => {
    if (!date) return [];
    return events
      .filter((e) => isSameCalendarDay(new Date(e.startAt), date))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events, date]);

  return (
    <Card className="p-0">
      <CardContent className="p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          month={viewMonth}
          onMonthChange={setViewMonth}
          today={new Date()}
          modifiers={{ hasEvent: datesWithEvents }}
          modifiersClassNames={{
            hasEvent:
              "relative after:absolute after:bottom-1 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-amber-500 after:content-['']",
          }}
          className="w-full"
        />
      </CardContent>
      <div className="flex flex-col divide-y border-t px-0">
        {isLoading && eventsForSelectedDate.length === 0 && (
          <div className="text-neutral-400 px-4 py-8 text-center text-base">
            Loading schedules…
          </div>
        )}
        {!isLoading && eventsForSelectedDate.length === 0 && (
          <div className="text-neutral-400 px-4 py-8 text-center text-base">
            No visits scheduled for this day
          </div>
        )}
        {eventsForSelectedDate.map((evt) => {
          const caregiver = evt.caregiverId ? employeeMap.get(evt.caregiverId) : null;
          const client = evt.clientId ? clientMap.get(evt.clientId) : null;
          const caregiverName = caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : null;
          const clientName = client ? `${client.firstName} ${client.lastName}` : null;
          const initials = caregiverName
            ? caregiverName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
            : "CA";
          const subtitle = [
            caregiverName ? `Caregiver: ${caregiverName}` : null,
            clientName ? `Client: ${clientName}` : null,
            formatEventHour(evt.startAt, evt.endAt),
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <div className="w-full" key={evt.id}>
              <div className="flex items-center p-4">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-neutral-100 text-neutral-700 text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="ms-4 min-w-0 space-y-0.5">
                  <p className="leading-none font-medium text-base truncate">{evt.title}</p>
                  <p className="text-neutral-500 text-sm truncate">{subtitle}</p>
                </div>
                <Badge
                  variant={statusBadgeVariant(evt.status)}
                  className="ms-auto shrink-0 capitalize text-sm"
                >
                  {evt.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD TASKS — live from /api/tasks + Supabase Realtime
// ═════════════════════════════════════════════════════════════════════════════
type DashboardTask = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  dueDate: string | null;
  assignees: { name: string; initials: string; avatar?: string }[];
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; variant: "positive" | "warning" | "negative" | "neutral" | "info"; dot: string }
> = {
  low:    { label: "Low",    variant: "neutral",  dot: "bg-neutral-400" },
  medium: { label: "Medium", variant: "info",     dot: "bg-blue-500"    },
  high:   { label: "High",   variant: "warning",  dot: "bg-amber-500"   },
  urgent: { label: "Urgent", variant: "negative", dot: "bg-red-500"     },
};

function DashboardTasks() {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const agencyId = useAuthStore((s) => s.currentAgencyId);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/tasks");
      if (res.ok) {
        const { data } = await res.json();
        setTasks(
          (data ?? []).map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description ?? "",
            priority: t.priority ?? "medium",
            status: t.status ?? "",
            dueDate: t.dueDate ?? null,
            assignees: (t.assignee ?? []).map((a: any) => ({
              name: a.name,
              initials: a.initials,
              avatar: a.avatar ?? undefined,
            })),
          }))
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { load(); }, [load]);

  useSupabaseRealtimeMulti("kanban_tasks", {
    onInsert: () => load(),
    onUpdate: () => load(),
    onDelete: () => load(),
  });

  // Sort: high/urgent first, then by due date
  const sorted = useMemo(() => {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...tasks].sort((a, b) => {
      const po = (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      if (po !== 0) return po;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [tasks]);

  const isOverdue = (dueDate: string | null) =>
    dueDate ? new Date(dueDate) < new Date() : false;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Tasks
          {tasks.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-neutral-900 px-1.5 text-[11px] font-semibold text-white">
              {tasks.length}
            </span>
          )}
        </CardTitle>
        <CardAction className="-mt-1">
          <Button variant="outline" className="text-sm h-8 px-3" asChild>
            <a href="/tasks">View All <ChevronRight className="size-3.5 ml-1" /></a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-5 pb-5 pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-neutral-400 text-sm">
            Loading tasks…
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-neutral-400">
            <p className="text-sm">No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[340px] pr-0.5">
            {sorted.map((task) => {
              const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
              const overdue = isOverdue(task.dueDate);
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 px-3.5 py-3 hover:bg-neutral-100/60 transition-colors"
                >
                  {/* Priority dot */}
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", pc.dot)} />

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-medium text-neutral-900 leading-snug truncate">
                      {task.title}
                    </p>

                    <div className="flex items-center flex-wrap gap-1.5">
                      {/* Priority badge */}
                      <Badge variant={pc.variant} className="h-5 text-[11px] px-2 capitalize">
                        {pc.label}
                      </Badge>

                      {/* Status badge */}
                      {task.status && (
                        <Badge variant="neutral" className="h-5 text-[11px] px-2 capitalize">
                          {task.status.replace(/_/g, " ")}
                        </Badge>
                      )}

                      {/* Due date */}
                      {task.dueDate && (
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[11px]",
                            overdue ? "text-red-500 font-medium" : "text-neutral-400"
                          )}
                        >
                          <Clock className="size-3" />
                          {format(new Date(task.dueDate), "MMM d")}
                          {overdue && " · Overdue"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assignee avatars */}
                  {task.assignees.length > 0 && (
                    <div className="flex -space-x-1.5 shrink-0">
                      {task.assignees.slice(0, 3).map((a, i) => (
                        <Avatar key={i} className="h-6 w-6 ring-2 ring-white">
                          <AvatarImage src={a.avatar} />
                          <AvatarFallback className="text-[9px] font-semibold bg-neutral-200 text-neutral-700">
                            {a.initials}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {task.assignees.length > 3 && (
                        <Avatar className="h-6 w-6 ring-2 ring-white">
                          <AvatarFallback className="text-[9px] font-semibold bg-neutral-300 text-neutral-600">
                            +{task.assignees.length - 3}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// CLIENTS WITH RECENT SERVICES — live from useClientsStore + useScheduleStore
// ═════════════════════════════════════════════════════════════════════════════
const CARE_TYPE_LABEL: Record<string, string> = {
  personal_care: "Personal Care",
  companion_care: "Companion Care",
  skilled_nursing: "Skilled Nursing",
  respite_care: "Respite Care",
  live_in: "Live-In Care",
  other: "Other",
  non_medical: "Non-Medical Care",
  medical: "Medical Care",
};

function ClientsWithRecentServices() {
  const clients = useClientsStore((s) => s.clients);
  const scheduleEvents = useScheduleStore((s) => s.events);

  const enriched = useMemo(() => {
    // For each client, find their most recent schedule event
    const latestEventByClient = new Map<string, { careType: string | null; startAt: string }>();
    scheduleEvents.forEach((evt) => {
      if (!evt.clientId) return;
      const existing = latestEventByClient.get(evt.clientId);
      if (!existing || new Date(evt.startAt) > new Date(existing.startAt)) {
        latestEventByClient.set(evt.clientId, { careType: evt.careType, startAt: evt.startAt });
      }
    });

    return clients
      .map((c) => ({ client: c, lastEvent: latestEventByClient.get(c.id) ?? null }))
      .sort((a, b) => {
        if (a.lastEvent && b.lastEvent) {
          return new Date(b.lastEvent.startAt).getTime() - new Date(a.lastEvent.startAt).getTime();
        }
        return a.lastEvent ? -1 : b.lastEvent ? 1 : 0;
      })
      .slice(0, 6);
  }, [clients, scheduleEvents]);

  return (
    <Card className="col-span-3">
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Clients with Recent Services</CardTitle>
        <CardAction className="-mt-2.5">
          <Button variant="outline" className="text-sm h-9 px-3">
            View All <ChevronRight className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        {enriched.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center py-8">No clients yet</p>
        ) : (
          <div className="space-y-5">
            {enriched.map(({ client, lastEvent }) => {
              const name = `${client.firstName} ${client.lastName}`;
              const initials = `${client.firstName[0] ?? ""}${client.lastName[0] ?? ""}`.toUpperCase();
              const serviceLabel = lastEvent?.careType
                ? (CARE_TYPE_LABEL[lastEvent.careType] ?? lastEvent.careType)
                : (CARE_TYPE_LABEL[client.careType] ?? client.careType);
              const dateLabel = lastEvent
                ? format(new Date(lastEvent.startAt), "MMM d, yyyy")
                : "—";
              return (
                <div key={client.id} className="flex items-center">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={client.avatar} alt={name} />
                    <AvatarFallback className="text-sm font-medium bg-neutral-100 text-neutral-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 min-w-0 space-y-0.5">
                    <p className="leading-none font-medium text-base truncate">{name}</p>
                    <p className="text-neutral-500 text-sm truncate">{client.email || client.phone}</p>
                  </div>
                  <div className="ml-auto shrink-0 space-y-0.5 text-end">
                    <p className="text-sm font-medium">{serviceLabel}</p>
                    <p className="text-neutral-500 text-xs">{dateLabel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RECENT INVOICES TABLE — live from /api/billing/invoices + Realtime
// ═════════════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════════
// UPCOMING VISITS TABLE — live from /api/schedule (next 30 days) + Realtime
// ═════════════════════════════════════════════════════════════════════════════
type UpcomingVisitRow = {
  id: string;
  title: string;
  client: string;
  caregiver: string;
  careType: string;
  startAt: string;
  endAt: string;
  status: string;
};

const visitStatusVariant = (s: string): "positive" | "warning" | "negative" | "neutral" | "info" => {
  switch (s) {
    case "confirmed":   return "positive";
    case "completed":   return "positive";
    case "scheduled":   return "info";
    case "in_progress": return "info";
    case "cancelled":   return "negative";
    case "no_show":     return "negative";
    default:            return "neutral";
  }
};

function fmtTime(d: Date) {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m} ${d.getHours() >= 12 ? "PM" : "AM"}`;
}

const baseVisitColumns: ColumnDef<UpcomingVisitRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 44,
  },
  {
    accessorKey: "startAt",
    header: "Date & Time",
    cell: ({ row }) => {
      const start = new Date(row.getValue("startAt"));
      const end   = new Date(row.original.endAt);
      return (
        <div className="space-y-0.5">
          <p className="font-medium text-sm whitespace-nowrap">{format(start, "MMM d, yyyy")}</p>
          <p className="text-xs text-neutral-500 whitespace-nowrap">{fmtTime(start)} – {fmtTime(end)}</p>
        </div>
      );
    },
  },
  {
    accessorKey: "client",
    header: "Client",
    cell: ({ row }) => {
      const val = row.getValue("client") as string;
      return val
        ? <span className="font-medium text-sm">{val}</span>
        : <span className="text-neutral-400 italic text-sm">Open shift</span>;
    },
  },
  {
    accessorKey: "caregiver",
    header: "Caregiver",
    cell: ({ row }) => {
      const val = row.getValue("caregiver") as string;
      return val
        ? <span className="text-sm">{val}</span>
        : <span className="text-neutral-400 italic text-sm">Unassigned</span>;
    },
  },
  {
    accessorKey: "careType",
    header: "Service",
    cell: ({ row }) => {
      const raw = row.getValue("careType") as string;
      return <span className="text-sm capitalize">{raw ? raw.replace(/_/g, " ") : "—"}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.getValue("status") as string;
      return (
        <Badge variant={visitStatusVariant(s)} className="capitalize text-xs h-6 whitespace-nowrap">
          {s.replace(/_/g, " ")}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => <div className="text-end">Actions</div>,
    cell: ({ row }) => (
      <div className="text-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.id)}>
              <Copy className="h-4 w-4" /> Copy visit ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/schedule">View in Schedule</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];

function DraggableVisitHeader({ header }: { header: Header<UpcomingVisitRow, unknown> }) {
  const nonDraggable = header.column.id === "select" || header.column.id === "actions";
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id,
    disabled: nonDraggable,
  });
  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition,
    whiteSpace: "nowrap",
    zIndex: isDragging ? 1 : 0,
  };
  if (nonDraggable) {
    return (
      <TableHead className="relative h-10 border-t" style={{ width: header.column.getSize() }} colSpan={header.colSpan}>
        <div className={header.column.id === "select" ? "flex items-center" : ""}>
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      </TableHead>
    );
  }
  return (
    <TableHead ref={setNodeRef} className="relative h-10 border-t" style={style} colSpan={header.colSpan}>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm">
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </span>
        <div className="flex items-center shrink-0">
          {header.column.getCanSort() && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={header.column.getToggleSortingHandler()}>
              <ArrowUpDown className="h-3 w-3 opacity-40" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6 cursor-grab" {...attributes} {...listeners} aria-label="Drag to reorder">
            <GripVertical className="h-3 w-3 opacity-40" />
          </Button>
        </div>
      </div>
    </TableHead>
  );
}

function DragAlongVisitCell({ cell }: { cell: Cell<UpcomingVisitRow, unknown> }) {
  const nonDraggable = cell.column.id === "select" || cell.column.id === "actions";
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id,
    disabled: nonDraggable,
  });
  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };
  if (nonDraggable) {
    return (
      <TableCell className={cell.column.id === "select" ? "w-[44px]" : ""}>
        <div className={cell.column.id === "select" ? "flex items-center" : ""}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      </TableCell>
    );
  }
  return (
    <TableCell ref={setNodeRef} className="truncate" style={style}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  );
}

function UpcomingVisitsTable() {
  const [visits, setVisits] = useState<UpcomingVisitRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    baseVisitColumns
      .map((c) => (c.id || ("accessorKey" in c ? (c.accessorKey as string) : null)) as string)
      .filter((id) => id && id !== "select" && id !== "actions")
  );
  const dndId = useId();

  const agencyId  = useAuthStore((s) => s.currentAgencyId);
  const clients   = useClientsStore((s) => s.clients);
  const employees = useEmployeesStore((s) => s.employees);
  const clientMap   = useMemo(() => new Map(clients.map((c) => [c.id, c])),   [clients]);
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setIsLoading(true);
    try {
      const now    = new Date();
      const plus30 = new Date(now);
      plus30.setDate(plus30.getDate() + 30);
      const res = await apiFetch(
        `/api/schedule?startDate=${now.toISOString().slice(0,10)}&endDate=${plus30.toISOString().slice(0,10)}&limit=50`
      );
      if (res.ok) {
        const { data } = await res.json();
        setVisits(
          (data ?? [])
            .filter((e: any) => e.status !== "cancelled" && e.status !== "completed")
            .sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
            .map((e: any) => {
              const client    = e.clientId    ? clientMap.get(e.clientId)    : null;
              const caregiver = e.caregiverId ? employeeMap.get(e.caregiverId) : null;
              return {
                id:        e.id,
                title:     e.title,
                client:    client    ? `${client.firstName} ${client.lastName}`      : "",
                caregiver: caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : "",
                careType:  e.careType ?? "",
                startAt:   e.startAt,
                endAt:     e.endAt,
                status:    e.status,
              };
            })
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [agencyId, clientMap, employeeMap]);

  useEffect(() => { load(); }, [load]);

  useSupabaseRealtimeMulti("schedule_events", {
    onInsert: () => load(),
    onUpdate: () => load(),
    onDelete: () => load(),
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const fullColumnOrder = useMemo(() => ["select", ...columnOrder, "actions"], [columnOrder]);

  const columns = useMemo<ColumnDef<UpcomingVisitRow>[]>(() => {
    const select  = baseVisitColumns.find((c) => c.id === "select")!;
    const actions = baseVisitColumns.find((c) => c.id === "actions")!;
    const ordered = columnOrder
      .map((id) => baseVisitColumns.find((c) => c.id === id || ("accessorKey" in c && c.accessorKey === id)))
      .filter((c): c is ColumnDef<UpcomingVisitRow> => !!c);
    return [select, ...ordered, actions];
  }, [columnOrder]);

  const table = useReactTable({
    data: visits,
    columns,
    getRowId: (row) => row.id,
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(fullColumnOrder) : updater;
      setColumnOrder(next.filter((id: string) => id !== "select" && id !== "actions"));
    },
    state: { sorting, columnFilters, columnVisibility, rowSelection, columnOrder: fullColumnOrder },
    initialState: { pagination: { pageSize: 8 } },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (
      active && over && active.id !== over.id &&
      active.id !== "select" && active.id !== "actions" &&
      over.id !== "select" && over.id !== "actions"
    ) {
      setColumnOrder((order) => {
        const oldIndex = order.indexOf(active.id as string);
        const newIndex = order.indexOf(over.id as string);
        return arrayMove(order, oldIndex, newIndex);
      });
    }
  }

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 pb-3">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          <Input
            placeholder="Filter visits…"
            value={(table.getColumn("client")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("client")?.setFilterValue(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {selectedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Actions <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{selectedCount} selected</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Copy className="h-4 w-4" /> Copy IDs
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4" /> Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-400 hover:text-neutral-700" onClick={() => load()} disabled={isLoading}>
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <ColumnsIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns().filter((c) => c.getCanHide()).map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  className="capitalize"
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {col.id.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="border-t border-neutral-200/60">
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="bg-neutral-50/80 [&>th]:border-t-0 hover:bg-neutral-50/80">
                  <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                    {hg.headers.map((header) => (
                      <DraggableVisitHeader key={header.id} header={header} />
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-neutral-400 text-sm">
                    Loading upcoming visits…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-neutral-50/60">
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                      {row.getVisibleCells().map((cell) => (
                        <DragAlongVisitCell key={cell.id} cell={cell} />
                      ))}
                    </SortableContext>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-neutral-400 text-sm">
                    No upcoming visits in the next 30 days.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-neutral-200/60 px-5 py-3">
        <p className="text-neutral-500 text-sm">
          {selectedCount > 0
            ? `${selectedCount} of ${table.getFilteredRowModel().rows.length} selected`
            : `${table.getFilteredRowModel().rows.length} visit${table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — AGENCY OPERATIONS DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { employees, hydrate } = useEmployeesStore();
  const hydrateClients = useClientsStore((s) => s.hydrate);
  const { fetchStats, refreshAll } = useDashboardStore();

  useEffect(() => {
    hydrate();
    hydrateClients();
    fetchStats();
  }, [hydrate, hydrateClients, fetchStats]);

  // Realtime: employees
  useSupabaseRealtimeMulti("employees", {
    onInsert: () => { hydrate(); refreshAll(); },
    onUpdate: () => { hydrate(); refreshAll(); },
    onDelete: () => { hydrate(); refreshAll(); },
  });

  useSupabaseRealtimeMulti("employee_verifications", {
    onInsert: () => { hydrate(); refreshAll(); },
    onUpdate: () => { hydrate(); refreshAll(); },
    onDelete: () => { hydrate(); refreshAll(); },
  });

  // Realtime: clients → updates New Clients & total counts
  useSupabaseRealtimeMulti("clients", {
    onInsert: () => { hydrateClients(); refreshAll(); },
    onUpdate: () => { hydrateClients(); refreshAll(); },
    onDelete: () => { hydrateClients(); refreshAll(); },
  });

  // Realtime: schedule_events → updates Total Visits, Open Shifts, Care Hours
  useSupabaseRealtimeMulti("schedule_events", {
    onInsert: () => refreshAll(),
    onUpdate: () => refreshAll(),
    onDelete: () => refreshAll(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl text-neutral-900">
          Agency Operations
        </h1>
      </div>

      <SummaryCards />

      <div className="gap-4 space-y-4 md:grid-cols-2 lg:grid lg:grid-cols-7 lg:space-y-0">
        <VisitTrendsChart />
        <ClientsByServiceChart />
      </div>

      <div className="gap-4 space-y-4 lg:grid lg:space-y-0 xl:grid-cols-3">
        <ScheduledVisitsCalendar />
        <DashboardTasks />
        <TopServices />
      </div>

      <div className="gap-4 space-y-4 lg:grid lg:grid-cols-7 lg:space-y-0">
        <Card className="col-span-4 p-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-5 pt-5">
            <CardTitle className="text-lg font-semibold">Upcoming Visits</CardTitle>
            <CardAction className="-mt-1">
              <Button variant="outline" className="text-sm h-8 px-3" asChild>
                <a href="/schedule">View Schedule <ChevronRight className="size-3.5 ml-1" /></a>
              </Button>
            </CardAction>
          </CardHeader>
          <UpcomingVisitsTable />
        </Card>
        <ClientsWithRecentServices />
      </div>
    </div>
  );
}
