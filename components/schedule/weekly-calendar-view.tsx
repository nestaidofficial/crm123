"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  Plus,
  Settings as GearIcon,
  Rocket,
  FileText as PaperIcon,
  Gift,
  Link as LinkIcon,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EventDialog } from "./event-dialog";
import { CalendarSettingsSheet } from "./calendar-settings-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClientsStore } from "@/store/useClientsStore";
import { useEmployeesStore } from "@/store/useEmployeesStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import type { ScheduleEventApi } from "@/lib/db/schedule.mapper";

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // Format: "HH:mm" (24-hour)
  endTime: string;
  day: number; // 0-6 for Sun-Sat
  date: Date;
  participants?: string[];
  isAllDay?: boolean;
  icon?: "gear" | "rocket" | "paper" | "gift" | "link";
  color?: string;
  // Home-care specific fields (used for filtering)
  client_id?: string;
  caregiver_id?: string;
  care_coordinator_id?: string;
  care_type?: "personal_care" | "companion_care" | "skilled_nursing" | "respite_care" | "live_in" | "other";
  status?: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
  tasks?: string[];
}

// Icon component renderer
const renderIcon = (iconType?: string) => {
  switch (iconType) {
    case "gear":
      return <GearIcon className="h-3 w-3" />;
    case "rocket":
      return <Rocket className="h-3 w-3" />;
    case "paper":
      return <PaperIcon className="h-3 w-3" />;
    case "gift":
      return <Gift className="h-3 w-3" />;
    case "link":
      return <LinkIcon className="h-3 w-3" />;
    default:
      return null;
  }
};


// Generate 24 hours starting from 8 AM: [8, 9, 10, ..., 23, 0, 1, 2, ..., 7]
const hours = Array.from({ length: 24 }, (_, i) => (i + 8) % 24);
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// Static style objects extracted to avoid re-creation in the 7×24 grid
const tableStyle = { tableLayout: 'fixed' as const, borderSpacing: 0, borderCollapse: 'collapse' as const };
const headerCellStyle = { height: '80px', padding: 0, margin: 0, verticalAlign: 'middle' as const };
const headerThStyle = { height: '80px', padding: '12px', margin: 0, verticalAlign: 'middle' as const };

interface WeeklyCalendarViewProps {
  onCreateShiftClick?: () => void;
}

// Month view: 6 rows × 7 days grid
function MonthGridView({
  currentMonth,
  events,
  getEventsForDate,
  isToday,
  onDayClick,
}: {
  currentMonth: Date;
  events: CalendarEvent[];
  getEventsForDate: (d: Date) => CalendarEvent[];
  isToday: (d: Date) => boolean;
  onDayClick: (d: Date) => void;
}) {
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startDay = monthStart.getDay(); // 0 = Sunday
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const prevMonthDays = startDay;
  const totalCells = 42; // 6 weeks
  const gridDays: Array<{ date: Date; dayNum: number; isCurrentMonth: boolean }> = [];

  const prevMonthEnd = new Date(monthStart);
  prevMonthEnd.setDate(0);
  const prevDaysCount = prevMonthEnd.getDate();

  for (let i = 0; i < totalCells; i++) {
    if (i < startDay) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevDaysCount - startDay + i + 1);
      gridDays.push({ date: d, dayNum: d.getDate(), isCurrentMonth: false });
    } else if (i < startDay + daysInMonth) {
      const dayNum = i - startDay + 1;
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
      gridDays.push({ date: d, dayNum, isCurrentMonth: true });
    } else {
      const overflow = i - (startDay + daysInMonth);
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, overflow + 1);
      gridDays.push({ date: d, dayNum: d.getDate(), isCurrentMonth: false });
    }
  }

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      {/* Header row */}
      <div className="flex flex-shrink-0 border-b border-gray-200" style={{ height: "60px", minHeight: "60px" }}>
        {daysOfWeek.map((d) => (
          <div key={d} className="flex-1 flex items-center justify-center text-[12px] font-medium text-gray-600">
            {d}
          </div>
        ))}
      </div>
      {/* 6 weeks × 7 days grid - fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="flex flex-1 min-h-0 border-b border-gray-100">
            {gridDays.slice(row * 7, row * 7 + 7).map((cell) => {
              const dayEvents = getEventsForDate(cell.date);
              const today = isToday(cell.date);
              return (
                <div
                  key={cell.date.toISOString()}
                  className={cn(
                    "flex-1 min-w-0 align-top border-r border-gray-100 p-2 cursor-pointer hover:bg-gray-50 flex flex-col overflow-hidden",
                    !cell.isCurrentMonth && "bg-gray-50/50"
                  )}
                  onClick={() => onDayClick(cell.date)}
                >
                  <div
                    className={cn(
                      "text-[13px] font-medium w-7 h-7 flex items-center justify-center rounded-full shrink-0",
                      today && "bg-black text-white",
                      cell.isCurrentMonth ? "text-gray-900" : "text-gray-400"
                    )}
                  >
                    {cell.dayNum}
                  </div>
                  <div className="mt-1 space-y-0.5 overflow-hidden min-h-0">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className={cn(
                          "text-[11px] truncate px-1.5 py-0.5 rounded",
                          evt.color || "bg-gray-200",
                          evt.color && /-(100|200|300)$/.test(evt.color) ? "text-gray-800" : "text-white"
                        )}
                      >
                        {evt.title || "Untitled"}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

type ViewMode = "day" | "week" | "month";
type ViewFilter = "carer" | "client" | "both";

function sameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

const CALENDAR_SETTINGS_KEY = "nessa_calendar_settings";

function getTimezoneAbbr(ianaTimezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ianaTimezone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? ianaTimezone;
  } catch {
    return ianaTimezone;
  }
}

function loadTimezoneFromStorage(): string {
  if (typeof window === "undefined") return "America/New_York";
  try {
    const raw = window.localStorage.getItem(CALENDAR_SETTINGS_KEY);
    if (!raw) return "America/New_York";
    const parsed = JSON.parse(raw);
    return parsed.timezone ?? "America/New_York";
  } catch {
    return "America/New_York";
  }
}

export function WeeklyCalendarView({ onCreateShiftClick }: WeeklyCalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(() => new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("both");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [calendarTimezone, setCalendarTimezone] = useState<string>("America/New_York");

  // Load timezone from localStorage and keep in sync when settings change
  useEffect(() => {
    setCalendarTimezone(loadTimezoneFromStorage());
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CALENDAR_SETTINGS_KEY) {
        setCalendarTimezone(loadTimezoneFromStorage());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Re-read when the settings sheet closes so changes in the same tab are picked up
  useEffect(() => {
    if (!settingsOpen) {
      setCalendarTimezone(loadTimezoneFromStorage());
    }
  }, [settingsOpen]);

  const timezoneAbbr = getTimezoneAbbr(calendarTimezone);
  
  // Drag state
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [dragDimensions, setDragDimensions] = useState({ width: 0, height: 0 });
  const [previewTime, setPreviewTime] = useState<{ startTime: string; endTime: string; day: number } | null>(null);
  const [initialMousePos, setInitialMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizedEvent, setResizedEvent] = useState<CalendarEvent | null>(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizePreviewEndTime, setResizePreviewEndTime] = useState<string | null>(null);
  const [hasResized, setHasResized] = useState(false);

  // Store lookups for avatars and schedule data
  const clients = useClientsStore((s) => s.clients);
  const employees = useEmployeesStore((s) => s.employees);

  // Map-based lookups to avoid O(n) .find() on every event render
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const scheduleEvents = useScheduleStore((s) => s.events);
  const createEvent = useScheduleStore((s) => s.createEvent);
  const dragUpdateEvent = useScheduleStore((s) => s.dragUpdateEvent);
  const updateEvent = useScheduleStore((s) => s.updateEvent);
  const deleteEvent = useScheduleStore((s) => s.deleteEvent);
  const hydrate = useScheduleStore((s) => s.hydrate);

  // Convert schedule events from API to CalendarEvent format for UI
  const events = useMemo(() => {
    return scheduleEvents.map((evt): CalendarEvent => {
      const startDate = new Date(evt.startAt);
      const endDate = new Date(evt.endAt);
      
      return {
        id: evt.id,
        title: evt.title,
        startTime: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
        endTime: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
        day: startDate.getDay(),
        date: startDate,
        client_id: evt.clientId || undefined,
        caregiver_id: evt.caregiverId || undefined,
        care_coordinator_id: evt.careCoordinatorId || undefined,
        care_type: evt.careType as any,
        status: evt.status as any,
        isAllDay: evt.isAllDay,
        color: evt.color || "bg-blue-200",
        participants: [],
      };
    });
  }, [scheduleEvents]);

  // Filter events based on viewFilter
  const filteredEvents = useMemo(() => {
    if (viewFilter === "both") return events;
    if (viewFilter === "carer") return events.filter(e => !!e.caregiver_id);
    if (viewFilter === "client") return events.filter(e => !!e.client_id);
    return events;
  }, [events, viewFilter]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Hydrate all stores in parallel on mount and when week/view changes
  const hydrateClients = useClientsStore((s) => s.hydrate);
  const hydrateEmployees = useEmployeesStore((s) => s.hydrate);

  useEffect(() => {
    const start = new Date(currentWeek);
    let dateRange: { startDate: string; endDate: string };

    if (viewMode === "day") {
      const startDate = start.toISOString().slice(0, 10);
      dateRange = { startDate, endDate: startDate };
    } else if (viewMode === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      dateRange = {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      };
    } else {
      const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      dateRange = {
        startDate: monthStart.toISOString().slice(0, 10),
        endDate: monthEnd.toISOString().slice(0, 10),
      };
    }

    // Fire all three in parallel — each store has its own cache guard
    hydrate(dateRange).catch(() => {});
    hydrateClients();
    hydrateEmployees();
  }, [currentWeek, viewMode, hydrate, hydrateClients, hydrateEmployees]);

  // Get current week dates (Sunday to Saturday), or single day for day view
  const weekDates = useMemo((): Array<{ date: number; fullDate: Date; dayOfWeek: number }> => {
    if (viewMode === "day") {
      const d = new Date(currentWeek);
      return [{
        date: d.getDate(),
        fullDate: new Date(d),
        dayOfWeek: d.getDay(),
      }];
    }
    const start = new Date(currentWeek);
    const day = start.getDay();
    const diff = start.getDate() - day; // Go to Sunday
    start.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return {
        date: date.getDate(),
        fullDate: new Date(date),
        dayOfWeek: i,
      };
    });
  }, [currentWeek, viewMode]);

  // Events for a specific calendar date (for day view and month view)
  const getEventsForDate = (d: Date) => {
    return filteredEvents.filter((e) => e.date && sameDay(e.date, d));
  };

  const getHourlyEventsForDate = (d: Date) => {
    return getEventsForDate(d).filter(
      (e) => !e.isAllDay && e.title && e.title.trim().length > 0
    );
  };

  // Get month and year (or full date for day view) for display
  const headerTitle = useMemo(() => {
    const month = monthNames[currentWeek.getMonth()];
    const year = currentWeek.getFullYear();
    if (viewMode === "day") {
      return `${month} ${currentWeek.getDate()}, ${year}`;
    }
    return `${month} ${year}`;
  }, [currentWeek, viewMode]);

  // Check if a date is today
  const isToday = useCallback((date: Date) => {
    const today = currentTime;
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }, [currentTime]);

  // Get events for a specific day
  const getEventsForDay = (dayIndex: number) => {
    return filteredEvents.filter(event => event.day === dayIndex);
  };

  // Get all-day events for a specific day
  const getAllDayEventsForDay = (dayIndex: number) => {
    return filteredEvents.filter(event => 
      event.day === dayIndex && 
      event.isAllDay && 
      event.title && 
      event.title.trim().length > 0
    );
  };

  // Get hourly events for a specific day (or for a specific date when dateForDay is provided, e.g. day view)
  const getHourlyEventsForDay = (dayIndex: number, dateForDay?: Date) => {
    if (dateForDay) {
      return getHourlyEventsForDate(dateForDay);
    }
    return filteredEvents.filter(event =>
      event.day === dayIndex &&
      !event.isAllDay &&
      event.title &&
      event.title.trim().length > 0
    );
  };

  // Convert time string to minutes from midnight
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get current time in minutes
  const getCurrentTimeInMinutes = () => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  };

  // Check if current time is in the visible week
  const isCurrentTimeInWeek = () => {
    const today = new Date();
    const weekStart = weekDates[0].fullDate;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return today >= weekStart && today <= weekEnd;
  };

  // Navigate based on view mode
  const navigate = useCallback((direction: "prev" | "next") => {
    setCurrentWeek((prev) => {
      const newDate = new Date(prev);
      const delta = direction === "next" ? 1 : -1;
      if (viewMode === "day") {
        newDate.setDate(newDate.getDate() + delta);
      } else if (viewMode === "week") {
        newDate.setDate(newDate.getDate() + delta * 7);
      } else {
        newDate.setMonth(newDate.getMonth() + delta);
      }
      return newDate;
    });
  }, [viewMode]);

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Calculate the maximum number of concurrent events for each hour on each day
  const dayCount = viewMode === "day" ? 1 : 7;
  const focusedDateForDay = viewMode === "day" ? new Date(currentWeek) : undefined;
  const getMaxEventsPerHour = useMemo(() => {
    const maxPerHour: Record<number, Record<number, number>> = {};
    const dateForDay = viewMode === "day" ? focusedDateForDay : undefined;

    hours.forEach(hour => {
      maxPerHour[hour] = {};
      for (let day = 0; day < dayCount; day++) {
        maxPerHour[hour][day] = 0;
      }
    });

    hours.forEach(hour => {
      for (let day = 0; day < dayCount; day++) {
        const dayEvents = getHourlyEventsForDay(day, dateForDay);

        const hourStart = hour * 60;
        const hourEnd = hourStart + 60;

        const eventsInHour = dayEvents.filter(event => {
          const eventStart = timeToMinutes(event.startTime);
          const eventEnd = timeToMinutes(event.endTime);
          return eventStart < hourEnd && eventEnd > hourStart;
        });

        if (eventsInHour.length > 0) {
          let maxConcurrent = 0;
          for (let minute = hourStart; minute < hourEnd; minute++) {
            const concurrentCount = eventsInHour.filter(event => {
              const eventStart = timeToMinutes(event.startTime);
              const eventEnd = timeToMinutes(event.endTime);
              return minute >= eventStart && minute < eventEnd;
            }).length;
            maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          }
          maxPerHour[hour][day] = maxConcurrent;
        }
      }
    });

    return maxPerHour;
  }, [filteredEvents, viewMode, dayCount, currentWeek.toDateString()]);

  // Get dynamic row height based on max events in that hour
  const getRowHeight = (hour: number) => {
    const baseHeight = 80;
    const eventHeight = 36;
    const gap = 4;
    const padding = 8; // Top and bottom padding
    
    // Find max concurrent events across all days for this hour
    const maxEvents = Math.max(...Object.values(getMaxEventsPerHour[hour] || {}), 1);
    
    if (maxEvents <= 1) return baseHeight;
    
    // Calculate height needed for stacked events
    const neededHeight = maxEvents * eventHeight + (maxEvents - 1) * gap + padding;
    return Math.max(baseHeight, neededHeight);
  };

  // Calculate cumulative row offset for positioning
  const getCumulativeOffset = (hourIndex: number) => {
    let offset = 0;
    for (let i = 0; i < hourIndex; i++) {
      const hour = hours[i];
      offset += getRowHeight(hour) + 1; // +1 for border
    }
    return offset;
  };

  // Build map of hour to cumulative offset
  const hourRowOffsets = useMemo(() => {
    const offsets: Record<number, number> = {};
    hours.forEach((hour, index) => {
      offsets[hour] = getCumulativeOffset(index);
    });
    return offsets;
  }, [getMaxEventsPerHour]);

  // Calculate total calendar height
  const totalCalendarHeight = useMemo(() => {
    let total = 0;
    hours.forEach(hour => {
      total += getRowHeight(hour) + 1; // +1 for border
    });
    return total - 1; // Remove last border
  }, [getMaxEventsPerHour]);

  // Handle event click — open edit dialog (used by both direct click and click-after-mouseup)
  const handleEventClick = async (event: CalendarEvent) => {
    if (!event.id.startsWith("new-")) {
      try {
        const res = await fetch(`/api/schedule/${event.id}/tasks`);
        if (res.ok) {
          const { data } = await res.json();
          const taskTitles: string[] = data.map((t: { title: string }) => t.title);
          setSelectedEvent({ ...event, tasks: taskTitles.length > 0 ? taskTitles : undefined });
        } else {
          setSelectedEvent(event);
        }
      } catch {
        setSelectedEvent(event);
      }
    } else {
      setSelectedEvent(event);
    }
    setIsEventDialogOpen(true);
  };
  const openEditDialogRef = useRef(handleEventClick);
  openEditDialogRef.current = handleEventClick;

  // Handle empty time slot click
  const handleTimeSlotClick = (dayIndex: number, hour: number) => {
    const clickedDate = weekDates[dayIndex].fullDate;
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = (hour + 1) % 24;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    
    const newEvent: CalendarEvent = {
      id: `new-${Date.now()}`,
      title: "",
      startTime,
      endTime,
      day: dayIndex,
      date: clickedDate,
      participants: [],
      color: "bg-black",
    };
    
    setSelectedEvent(newEvent);
    setIsEventDialogOpen(true);
  };

  // Build startAt/endAt ISO strings from CalendarEvent
  const eventToStartEnd = (evt: CalendarEvent) => {
    const d = evt.date;
    const [sh, sm] = evt.startTime.split(":").map(Number);
    const [eh, em] = evt.endTime.split(":").map(Number);
    const startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm).toISOString();
    const endAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em).toISOString();
    return { startAt, endAt };
  };

  // Sync task list to API: delete all existing tasks then recreate (bulk replace)
  const syncEventTasks = async (eventId: string, tasks?: string[]) => {
    const nonEmptyTasks = tasks?.filter((t) => t.trim()) ?? [];
    try {
      await fetch(`/api/schedule/${eventId}/tasks`, { method: "DELETE" });
      for (let i = 0; i < nonEmptyTasks.length; i++) {
        await fetch(`/api/schedule/${eventId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: nonEmptyTasks[i], sortOrder: i }),
        });
      }
    } catch (err) {
      console.error("Failed to sync tasks:", err);
    }
  };

  // Handle event save
  const handleEventSave = async (updatedEvent: CalendarEvent) => {
    if (!updatedEvent.title?.trim()) return;

    if (updatedEvent.id.startsWith("new-")) {
      const { startAt, endAt } = eventToStartEnd(updatedEvent);
      try {
        const newEvent = await createEvent({
          title: updatedEvent.title.trim(),
          clientId: updatedEvent.client_id ?? null,
          caregiverId: updatedEvent.caregiver_id ?? null,
          careCoordinatorId: updatedEvent.care_coordinator_id ?? null,
          careType: updatedEvent.care_type ?? null,
          status: (updatedEvent.status as any) ?? "scheduled",
          startAt,
          endAt,
          isAllDay: updatedEvent.isAllDay ?? false,
          isOpenShift: false,
          color: updatedEvent.color ?? null,
        } as any);
        await syncEventTasks(newEvent.id, updatedEvent.tasks);
      } catch (err) {
        console.error("Failed to create event:", err);
      }
    } else {
      try {
        await updateEvent(updatedEvent.id, {
          title: updatedEvent.title.trim(),
          clientId: updatedEvent.client_id ?? null,
          caregiverId: updatedEvent.caregiver_id ?? null,
          careCoordinatorId: updatedEvent.care_coordinator_id ?? null,
          careType: updatedEvent.care_type as any,
          status: updatedEvent.status as any,
          color: updatedEvent.color ?? null,
        });
        await syncEventTasks(updatedEvent.id, updatedEvent.tasks);
      } catch (err) {
        console.error("Failed to update event:", err);
      }
    }
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
  };

  // Handle save and create new event for same time slot
  const handleSaveAndNew = async (savedEvent: CalendarEvent, newEvent: CalendarEvent) => {
    if (!savedEvent.title?.trim()) return;

    if (savedEvent.id.startsWith("new-")) {
      const { startAt, endAt } = eventToStartEnd(savedEvent);
      try {
        const created = await createEvent({
          title: savedEvent.title.trim(),
          clientId: savedEvent.client_id ?? null,
          caregiverId: savedEvent.caregiver_id ?? null,
          careCoordinatorId: savedEvent.care_coordinator_id ?? null,
          careType: savedEvent.care_type ?? null,
          status: (savedEvent.status as any) ?? "scheduled",
          startAt,
          endAt,
          isAllDay: savedEvent.isAllDay ?? false,
          isOpenShift: false,
          color: savedEvent.color ?? null,
        } as any);
        await syncEventTasks(created.id, savedEvent.tasks);
      } catch (err) {
        console.error("Failed to create event:", err);
      }
    } else {
      try {
        await updateEvent(savedEvent.id, {
          title: savedEvent.title.trim(),
          clientId: savedEvent.client_id ?? null,
          caregiverId: savedEvent.caregiver_id ?? null,
          careCoordinatorId: savedEvent.care_coordinator_id ?? null,
          careType: savedEvent.care_type as any,
          status: savedEvent.status as any,
          color: savedEvent.color ?? null,
        });
        await syncEventTasks(savedEvent.id, savedEvent.tasks);
      } catch (err) {
        console.error("Failed to update event:", err);
      }
    }
    setSelectedEvent(newEvent);
  };

  // Convert pixel position to time and day (with dynamic row heights)
  const pixelToTimeAndDay = (clientX: number, clientY: number) => {
    const container = document.querySelector('.flex-1.overflow-auto') as HTMLElement;
    if (!container) return null;
    
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    
    // Calculate which day column (0-6)
    const overlayLeft = 70; // Time column width
    const overlayWidth = containerRect.width - overlayLeft;
    const relativeX = (clientX - containerRect.left) + scrollLeft - overlayLeft;
    const dayIndex = Math.max(0, Math.min(6, Math.floor((relativeX / overlayWidth) * 7)));
    
    // Calculate time from Y position with dynamic row heights
    const overlayTop = 61;
    const relativeY = (clientY - containerRect.top) + scrollTop - overlayTop;
    
    // Find which hour row this Y position falls into
    let cumulativeHeight = 0;
    let foundHour = 8; // Default to 8am
    
    for (let i = 0; i < hours.length; i++) {
      const hour = hours[i];
      const rowHeight = getRowHeight(hour);
      
      if (relativeY < cumulativeHeight + rowHeight) {
        foundHour = hour;
        break;
      }
      cumulativeHeight += rowHeight + 1; // +1 for border
    }
    
    return {
      dayIndex,
      hour: foundHour,
      minutes: 0, // Snap to hour start
      timeString: `${foundHour.toString().padStart(2, '0')}:00`,
    };
  };

  // Handle mouse down - prepare for potential drag
  const handleMouseDown = (event: CalendarEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDraggedEvent(event);
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDragPosition({
      x: e.clientX,
      y: e.clientY,
    });
    // Store original dimensions to preserve size during drag
    setDragDimensions({
      width: rect.width,
      height: rect.height,
    });
    setIsDragActive(true);
    setHasMoved(false);
    setPreviewTime(null);
  };

  // Handle drag - only activate after mouse moves beyond threshold
  useEffect(() => {
    if (!isDragActive || !draggedEvent || !initialMousePos) return;

    const DRAG_THRESHOLD = 5; // pixels to move before drag starts

    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (rafId !== null) return; // Throttle to one update per animation frame

      rafId = requestAnimationFrame(() => {
        rafId = null;
      });

      // Calculate distance moved from initial click
      const deltaX = Math.abs(e.clientX - initialMousePos.x);
      const deltaY = Math.abs(e.clientY - initialMousePos.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Only start dragging if mouse moved beyond threshold
      if (!isDragging && distance > DRAG_THRESHOLD) {
        setIsDragging(true);
        setHasMoved(true);
      }
      
      // Only update position and preview if actually dragging
      if (isDragging || distance > DRAG_THRESHOLD) {
        setHasMoved(true);
        setDragPosition({
          x: e.clientX,
          y: e.clientY,
        });
        
        // Calculate preview time as user drags
        const result = pixelToTimeAndDay(e.clientX, e.clientY);
        if (result) {
          const { dayIndex, timeString } = result;
          
          // Calculate duration
          const startMinutes = timeToMinutes(draggedEvent.startTime);
          const endMinutes = timeToMinutes(draggedEvent.endTime);
          const duration = endMinutes - startMinutes;
          
          // Calculate new end time
          const newStartMinutes = timeToMinutes(timeString);
          const newEndMinutes = newStartMinutes + duration;
          const newEndHour = Math.floor(newEndMinutes / 60) % 24;
          const newEndMin = newEndMinutes % 60;
          const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;
          
          setPreviewTime({
            startTime: timeString,
            endTime: newEndTime,
            day: dayIndex,
          });
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // If this was a click (no drag), open edit dialog before resetting state
      if (!isDragging && draggedEvent) {
        openEditDialogRef.current(draggedEvent);
      }
      e.preventDefault();
      
      // Only update event if we actually dragged (not just clicked)
      if (isDragging && draggedEvent) {
        const result = pixelToTimeAndDay(e.clientX, e.clientY);
        if (result) {
          const { dayIndex, timeString } = result;
          
          // Calculate duration
          const startMinutes = timeToMinutes(draggedEvent.startTime);
          const endMinutes = timeToMinutes(draggedEvent.endTime);
          const duration = endMinutes - startMinutes;
          
          // Calculate new end time
          const newStartMinutes = timeToMinutes(timeString);
          const newEndMinutes = newStartMinutes + duration;
          const newEndHour = Math.floor(newEndMinutes / 60) % 24;
          const newEndMin = newEndMinutes % 60;
          const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;
          
          // Update event immediately on drop
          const updatedEvent: CalendarEvent = {
            ...draggedEvent,
            startTime: timeString,
            endTime: newEndTime,
            day: dayIndex,
            date: weekDates[dayIndex].fullDate,
          };
          
          // Update via store drag update (optimistic)
          const newDate = weekDates[dayIndex].fullDate;
          const [startHours, startMins] = timeString.split(':').map(Number);
          const [endHours, endMins] = newEndTime.split(':').map(Number);
          const startAt = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), startHours, startMins).toISOString();
          const endAt = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), endHours, endMins).toISOString();
          
          dragUpdateEvent(draggedEvent.id, startAt, endAt).catch((err) => {
            console.error("Failed to update event time:", err);
          });
        }
      }
      
      // Reset all drag state
      setIsDragging(false);
      setIsDragActive(false);
      setDraggedEvent(null);
      setHasMoved(false);
      setDragDimensions({ width: 0, height: 0 });
      setPreviewTime(null);
      setInitialMousePos(null);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
    
    // Only change cursor when actually dragging
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isDragActive, isDragging, draggedEvent, events, weekDates, initialMousePos]);

  // Handle resize start
  const handleResizeStart = (event: CalendarEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizedEvent(event);
    setResizeStartY(e.clientY);
    setResizePreviewEndTime(null);
    setHasResized(false);
  };

  // Handle resize - update end time based on mouse position
  useEffect(() => {
    if (!isResizing || !resizedEvent) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      // Mark that mouse has moved during resize
      setHasResized(true);
      
      const container = document.querySelector('.flex-1.overflow-auto') as HTMLElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const overlayTop = 61;
      const relativeY = (e.clientY - containerRect.top) + scrollTop - overlayTop;
      
      // Find which hour row this Y position falls into
      let cumulativeHeight = 0;
      let endHour = 8;
      let endMinutes = 0;
      
      for (let i = 0; i < hours.length; i++) {
        const hour = hours[i];
        const rowHeight = getRowHeight(hour);
        
        if (relativeY >= cumulativeHeight && relativeY < cumulativeHeight + rowHeight) {
          endHour = hour;
          // Calculate minutes within the hour based on position in row
          const positionInRow = relativeY - cumulativeHeight;
          const percentInRow = positionInRow / rowHeight;
          endMinutes = Math.round(percentInRow * 60);
          endMinutes = Math.min(60, Math.max(0, endMinutes)); // Clamp to 0-60
          break;
        }
        cumulativeHeight += rowHeight + 1; // +1 for border
      }
      
      // Snap to 15-minute intervals
      endMinutes = Math.round(endMinutes / 15) * 15;
      if (endMinutes === 60) {
        endMinutes = 0;
        endHour = (endHour + 1) % 24;
      }
      
      // Construct end time string
      const endTimeString = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      
      // Make sure end time is after start time
      const startMinutes = timeToMinutes(resizedEvent.startTime);
      const newEndMinutes = timeToMinutes(endTimeString);
      
      if (newEndMinutes > startMinutes) {
        setResizePreviewEndTime(endTimeString);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      
      if (resizedEvent && resizePreviewEndTime) {
        // Update the event with new end time via store
        const [resizeEndHours, resizeEndMins] = resizePreviewEndTime.split(':').map(Number);
        const startDate = resizedEvent.date;
        const endAt = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), resizeEndHours, resizeEndMins).toISOString();
        const [resizeStartHours, resizeStartMins] = resizedEvent.startTime.split(':').map(Number);
        const startAt = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), resizeStartHours, resizeStartMins).toISOString();
        
        dragUpdateEvent(resizedEvent.id, startAt, endAt).catch((err) => {
          console.error("Failed to resize event:", err);
        });
      }
      
      // Reset resize state (keep hasResized for a moment to prevent click)
      setIsResizing(false);
      setResizedEvent(null);
      setResizeStartY(0);
      setResizePreviewEndTime(null);
      
      // Reset hasResized after a short delay to prevent click handler from firing
      setTimeout(() => {
        setHasResized(false);
      }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
    
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resizedEvent, resizePreviewEndTime, events]);

  // Calculate overlapping events positions (Vertical stacking like Google Calendar)
  const getOverlappingEvents = (events: CalendarEvent[]) => {
    if (events.length === 0) return [];
    
    // Sort events by start time, then by end time (longer events first)
    const sorted = [...events].sort((a, b) => {
      const startDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      if (startDiff !== 0) return startDiff;
      return timeToMinutes(b.endTime) - timeToMinutes(a.endTime);
    });
    
    // Build a map of which events overlap at each minute
    const minuteMap = new Map<number, CalendarEvent[]>();
    
    sorted.forEach(event => {
      const startMin = timeToMinutes(event.startTime);
      const endMin = timeToMinutes(event.endTime);
      
      for (let min = startMin; min < endMin; min++) {
        if (!minuteMap.has(min)) {
          minuteMap.set(min, []);
        }
        minuteMap.get(min)!.push(event);
      }
    });
    
    // Assign stack positions to events
    const eventStackIndex = new Map<string, number>();
    const eventStackTotal = new Map<string, number>();
    
    sorted.forEach(event => {
      const startMin = timeToMinutes(event.startTime);
      const endMin = timeToMinutes(event.endTime);
      
      // Find max concurrent events during this event's duration
      let maxConcurrent = 0;
      for (let min = startMin; min < endMin; min++) {
        const concurrent = minuteMap.get(min)?.length || 0;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
      }
      
      // Find which position this event should be in
      // Look for the first available position across all overlapping events
      const overlappingEvents = new Set<CalendarEvent>();
      for (let min = startMin; min < endMin; min++) {
        const eventsAtMin = minuteMap.get(min) || [];
        eventsAtMin.forEach(e => overlappingEvents.add(e));
      }
      
      const usedPositions = new Set<number>();
      overlappingEvents.forEach(e => {
        if (e.id !== event.id && eventStackIndex.has(e.id)) {
          usedPositions.add(eventStackIndex.get(e.id)!);
        }
      });
      
      // Find first available position
      let position = 0;
      while (usedPositions.has(position)) {
        position++;
      }
      
      eventStackIndex.set(event.id, position);
      eventStackTotal.set(event.id, maxConcurrent);
    });
    
    // Build result with positioning info
    const result: Array<CalendarEvent & { left: number; width: number; zIndex: number; stackIndex: number; stackTotal: number }> = [];
    
    sorted.forEach(event => {
      result.push({
        ...event,
        left: 0,
        width: 100,
        zIndex: 10 + (eventStackIndex.get(event.id) || 0),
        stackIndex: eventStackIndex.get(event.id) || 0,
        stackTotal: eventStackTotal.get(event.id) || 1,
      });
    });
    
    return result;
  };

  // Calculate event position and height using dynamic row heights
  const getEventStyle = (event: CalendarEvent & { left?: number; width?: number; zIndex?: number; stackIndex?: number; stackTotal?: number }) => {
    const startMinutes = timeToMinutes(event.startTime);
    
    // Check if this event is being resized
    const isBeingResized = isResizing && resizedEvent?.id === event.id;
    const endTime = isBeingResized && resizePreviewEndTime ? resizePreviewEndTime : event.endTime;
    const endMinutes = timeToMinutes(endTime);
    
    // Get the hour this event starts in
    const startHour = Math.floor(startMinutes / 60);
    const endHour = Math.floor(endMinutes / 60);
    
    // Get cumulative offset for this hour
    const hourOffset = hourRowOffsets[startHour] || 0;
    
    // Fixed height and gap for stacked events
    const baseEventHeight = 36;
    const gapBetweenEvents = 4;
    const stackIndex = event.stackIndex || 0;
    const stackTotal = event.stackTotal || 1;
    
    // Calculate position within the row based on stack index
    const topPadding = 4; // Small padding from top of row
    const topInRow = topPadding + stackIndex * (baseEventHeight + gapBetweenEvents);
    
    // Final top position is hour offset + position within row
    const top = hourOffset + topInRow;
    
    // Calculate height based on duration when resizing or if duration spans multiple hours
    let height = baseEventHeight;
    
    if (isBeingResized || (endHour > startHour) || (endMinutes - startMinutes > 60)) {
      // Calculate actual pixel height spanning multiple rows if needed
      const endHourOffset = hourRowOffsets[endHour] || 0;
      const endRowHeight = getRowHeight(endHour);
      const endMinutesInHour = endMinutes % 60;
      const endPositionInRow = (endMinutesInHour / 60) * endRowHeight;
      const endPosition = endHourOffset + endPositionInRow;
      
      height = Math.max(baseEventHeight, endPosition - top);
    }
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: event.left !== undefined ? `${event.left}%` : '0%',
      width: event.width !== undefined ? `${event.width}%` : '100%',
      zIndex: event.zIndex || 10,
    };
  };

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-200 w-full flex-shrink-0 bg-white">
        {/* Left side - Navigation and Month/Year */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              onClick={() => navigate("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              onClick={() => navigate("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900">{headerTitle}</h2>
          </div>
        </div>

        {/* Right side - View selector and action buttons */}
        <div className="flex items-center gap-2">
          {/* View filter dropdown */}
          <Select value={viewFilter} onValueChange={(v) => setViewFilter(v as ViewFilter)}>
            <SelectTrigger className="w-[110px] h-8 text-[13px] border-neutral-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="carer">Carer</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>
          
          {/* View mode dropdown */}
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[90px] h-8 text-[13px] border-neutral-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={onCreateShiftClick}
            className="bg-[#E8C252] hover:bg-[#d4ad47] text-black rounded-full px-3 py-1.5 h-8 text-[13px] font-medium"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Shift
          </Button>
          <Button
            className="bg-[#7BD48B] hover:bg-[#6ac57a] text-black rounded-full px-3 py-1.5 h-8 text-[13px] font-medium"
          >
            Publish Shift
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar content: month grid or time-grid (day/week) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-auto overflow-x-hidden relative" style={{ width: '100%' }}>
        {viewMode === "month" ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <MonthGridView
            currentMonth={currentWeek}
            events={filteredEvents}
            getEventsForDate={getEventsForDate}
            isToday={isToday}
            onDayClick={(d) => {
              setCurrentWeek(new Date(d));
              setViewMode("day");
            }}
          />
          </div>
        ) : (
        <>
        <table
          className="w-full border-collapse"
          style={tableStyle}
        >
          <thead className="sticky top-0 bg-white z-10">
            {/* Day Headers Row */}
            <tr style={{ height: '80px', margin: 0, padding: 0 }}>
              <th
                className="w-[70px] border-r border-b border-gray-200"
                style={headerCellStyle}
              >
                <div className="flex items-center justify-end pr-2" style={{ height: '80px' }}>
                  <span className="text-xs text-gray-500">+ {timezoneAbbr}</span>
                </div>
              </th>
              {weekDates.map((weekDate, index) => {
                const isCurrentDay = isToday(weekDate.fullDate);
                return (
                  <th
                    key={index}
                    className={cn(
                      "border-b border-gray-200 text-center",
                      index < weekDates.length - 1 && "border-r border-gray-200"
                    )}
                    style={headerThStyle}
                  >
                    <div className="text-sm font-medium text-gray-700 flex items-center justify-center gap-1.5">
                      <span>{daysOfWeek[index]}</span>
                      {isCurrentDay ? (
                        <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold">
                          {weekDate.date}
                        </span>
                      ) : (
                        <span className="text-gray-900">{weekDate.date}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {hours.map((hour) => {
              const hourLabel = hour === 0
                ? "12 am"
                : hour < 12
                ? `${hour} am`
                : hour === 12
                ? "12 pm"
                : `${hour - 12} pm`;
              
              const rowHeight = getRowHeight(hour);

              return (
                <tr 
                  key={hour} 
                  style={{ 
                    height: `${rowHeight}px`, 
                    lineHeight: `${rowHeight}px`,
                    margin: 0,
                    padding: 0
                  }}
                >
                  {/* Time Column */}
                  <td 
                    className="w-[70px] border-r border-b border-gray-200 align-top" 
                    style={{ 
                      height: `${rowHeight}px`, 
                      padding: 0,
                      margin: 0,
                      verticalAlign: 'top'
                    }}
                  >
                    <div className="flex items-start justify-end pr-3 pt-0.5" style={{ height: `${rowHeight}px` }}>
                      <span className="text-sm text-gray-500 leading-none">{hourLabel}</span>
                    </div>
                  </td>

                  {/* Day Columns */}
                  {weekDates.map((weekDate, dayIndex) => {
                    return (
                      <td
                        key={dayIndex}
                        className={cn(
                          "border-b border-gray-200 relative cursor-pointer hover:bg-gray-50 transition-colors",
                          dayIndex < weekDates.length - 1 && "border-r border-gray-200"
                        )}
                        style={{ 
                          height: `${rowHeight}px`, 
                          padding: 0,
                          margin: 0,
                          lineHeight: `${rowHeight}px`,
                          verticalAlign: 'top'
                        }}
                        onClick={() => handleTimeSlotClick(dayIndex, hour)}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Events Overlay - positioned absolutely over the table body */}
        {/* 
          Position calculation:
          - Header row: exactly 80px height
          - Border between header and tbody: 1px (border-collapse)
          - Overlay starts exactly where first tbody row (8am) begins: 80px + 1px border
          - Each hour row has dynamic height based on number of events
          - Events positioned using cumulative row offsets
        */}
        <div 
          className="absolute pointer-events-none" 
          style={{ 
            top: '81px', // Header (80px) + border (1px) = exact start of first hour row
            left: '70px', // Exact width of time column
            width: 'calc(100% - 70px)',
            height: `${totalCalendarHeight}px`, // Dynamic height based on event counts
          }}
        >
          {weekDates.map((weekDate, dayIndex) => {
            const hourlyEvents = getHourlyEventsForDay(
              dayIndex,
              viewMode === "day" ? weekDate.fullDate : undefined
            );
            const isCurrentDay = isToday(weekDate.fullDate);
            const overlappingEvents = getOverlappingEvents(hourlyEvents);
            
            // Calculate exact percentage for each column (100% / 7 days)
            const columnWidthPercent = 100 / 7;
            const leftPercent = dayIndex * columnWidthPercent;

            return (
              <div
                key={dayIndex}
                className="absolute overflow-visible"
                style={{
                  left: `${leftPercent}%`,
                  width: `${columnWidthPercent}%`,
                  top: 0,
                  height: `${totalCalendarHeight}px`, // Match parent height with dynamic rows
                  paddingLeft: '0px', // No padding - align exactly with grid
                  paddingRight: '0px', // No padding - align exactly with grid
                  boxSizing: 'border-box',
                }}
              >
                {/* Drop placeholder: ghost rectangle at target slot (transparent + 2px primary border, visible until drop) */}
                {isDragging && previewTime && draggedEvent && previewTime.day === dayIndex && (() => {
                  const phStyle = getEventStyle({
                    startTime: previewTime.startTime,
                    endTime: previewTime.endTime,
                    left: 0,
                    width: 100,
                  } as CalendarEvent & { left: number; width: number });
                  return (
                    <div
                      className="absolute left-0 w-full rounded-md border-2 border-primary-500 bg-transparent pointer-events-none z-20"
                      style={{
                        top: phStyle.top,
                        height: phStyle.height,
                      }}
                      aria-hidden
                    />
                  );
                })()}

                {overlappingEvents.map((event) => {
                  const style = getEventStyle(event);
                  const isStacked = (event.stackTotal || 1) > 1;
                  
                  const isBeingDragged = draggedEvent?.id === event.id;
                  const isBeingResized = resizedEvent?.id === event.id;
                  
                  // Show preview end time during resize
                  const displayEndTime = isBeingResized && resizePreviewEndTime 
                    ? resizePreviewEndTime 
                    : event.endTime;
                  
                  // Use dark text on light backgrounds (200, 100, 300 shades)
                  const isLightBg = event.color && /-(100|200|300)$/.test(event.color);
                  
                  // Look up caregiver and client for avatar display (O(1) Map lookup)
                  const caregiver = event.caregiver_id ? employeeMap.get(event.caregiver_id) : undefined;
                  const client = event.client_id ? clientMap.get(event.client_id) : undefined;
                  const avatarParticipants = [
                    caregiver
                      ? {
                          name: `${caregiver.firstName} ${caregiver.lastName}`,
                          initials: `${caregiver.firstName?.[0] ?? ""}${caregiver.lastName?.[0] ?? ""}`,
                          src: caregiver.avatar,
                        }
                      : null,
                    client
                      ? {
                          name: `${client.firstName} ${client.lastName}`,
                          initials: `${client.firstName?.[0] ?? ""}${client.lastName?.[0] ?? ""}`,
                          src: client.avatar,
                        }
                      : null,
                  ].filter(Boolean) as { name: string; initials: string; src?: string }[];

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute rounded hover:opacity-90 transition-opacity pointer-events-auto select-none",
                        isLightBg ? "text-gray-800" : "text-white",
                        event.color || "bg-black",
                        isBeingDragged && "opacity-50 z-50",
                        !isBeingResized && "cursor-move",
                        isStacked ? "text-xs" : "text-xs"
                      )}
                      style={{
                        top: isBeingDragged ? undefined : style.top,
                        height: isBeingDragged ? `${dragDimensions.height}px` : style.height,
                        left: isBeingDragged ? undefined : style.left,
                        width: isBeingDragged ? `${dragDimensions.width}px` : `calc(${style.width} - 8px)`, // Subtract padding
                        zIndex: isBeingDragged ? 1000 : style.zIndex,
                        padding: isStacked ? '4px 8px' : '4px 6px',
                        boxSizing: 'border-box',
                        margin: '0 4px', // Small margin on sides
                        border: 'none',
                        ...(isBeingDragged && {
                          position: 'fixed' as const,
                          top: `${dragPosition.y - dragOffset.y}px`,
                          left: `${dragPosition.x - dragOffset.x}px`,
                          pointerEvents: 'none',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                        }),
                      }}
                      onMouseDown={(e) => {
                        // Don't start drag if clicking on resize handle
                        const target = e.target as HTMLElement;
                        if (target.classList.contains('resize-handle')) {
                          return;
                        }
                        e.stopPropagation();
                        handleMouseDown(event, e);
                      }}
                      onClick={(e) => {
                        // Only handle click if we didn't drag or resize
                        if (!hasMoved && !isDragging && !isResizing && !hasResized) {
                          e.stopPropagation();
                          handleEventClick(event);
                        }
                      }}
                    >
                      {isStacked ? (
                        // Compact view for stacked events
                        <div className="flex items-center justify-between truncate">
                          <span className="font-medium truncate flex-1">{event.title || "Untitled Event"}</span>
                          <span className="text-[10px] opacity-90 ml-2 whitespace-nowrap">
                            {isBeingDragged && previewTime
                              ? formatTime(previewTime.startTime)
                              : formatTime(event.startTime)
                            }
                          </span>
                        </div>
                      ) : (
                        // Full view for single events
                        <>
                          <div className="font-medium">{event.title || "Untitled Event"}</div>
                          <div className="text-[10px] opacity-90">
                            {isBeingDragged && previewTime
                              ? `${formatTime(previewTime.startTime)} - ${formatTime(previewTime.endTime)}`
                              : `${formatTime(event.startTime)} - ${formatTime(displayEndTime)}`
                            }
                          </div>
                        </>
                      )}

                      {/* Participant avatars — bottom-right corner */}
                      {avatarParticipants.length > 0 && (
                        <div
                          className="absolute bottom-3 right-2 flex items-center"
                          style={{ gap: '-4px' }}
                        >
                          {avatarParticipants.map((p, idx) => (
                            <Avatar
                              key={idx}
                              className="h-8 w-8 border border-white/70"
                              style={{ marginLeft: idx === 0 ? 0 : '-10px', zIndex: avatarParticipants.length - idx }}
                            >
                              <AvatarImage src={p.src} alt={p.name} />
                              <AvatarFallback
                                className={cn(
                                  "text-[11px] font-semibold",
                                  isLightBg
                                    ? "bg-gray-300 text-gray-700"
                                    : "bg-white/30 text-white"
                                )}
                              >
                                {p.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      )}
                      
                      {/* Resize handle at bottom */}
                      {!isBeingDragged && (
                        <div
                          className="resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 transition-colors"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleResizeStart(event, e);
                          }}
                          style={{
                            borderBottomLeftRadius: '4px',
                            borderBottomRightRadius: '4px',
                          }}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Current Time Indicator */}
                {isCurrentDay && (() => {
                  const currentTimeMinutes = getCurrentTimeInMinutes();
                  const currentHour = Math.floor(currentTimeMinutes / 60);
                  const minutesInHour = currentTimeMinutes % 60;
                  
                  // Get cumulative offset for the current hour
                  const hourOffset = hourRowOffsets[currentHour] || 0;
                  
                  // Position within the hour (proportional to row height)
                  const rowHeight = getRowHeight(currentHour);
                  const positionInRow = (minutesInHour / 60) * rowHeight;
                  
                  const topPosition = hourOffset + positionInRow;
                  return (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none"
                      style={{
                        top: `${topPosition}px`,
                      }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-black rounded-full -ml-1"></div>
                        <div className="flex-1 h-0.5 bg-black"></div>
                      </div>
                      <div className="ml-3 mt-1">
                        <div className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded">
                          {currentTime.getHours() % 12 || 12}:
                          {currentTime.getMinutes().toString().padStart(2, "0")}{" "}
                          {currentTime.getHours() >= 12 ? "pm" : "am"}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        event={selectedEvent}
        onSave={handleEventSave}
        onSaveAndNew={handleSaveAndNew}
        onDelete={async (id) => {
          try {
            await deleteEvent(id);
          } catch (err) {
            console.error("Failed to delete event:", err);
          }
        }}
      />

      {/* Calendar settings (holidays, time zone) */}
      <CalendarSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
