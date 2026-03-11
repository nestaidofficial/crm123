"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nessa_calendar_settings";

export interface HolidayEntry {
  id: string;
  day: number;
  month: number;
  year: number;
  name: string;
}

export interface CalendarSettings {
  timezone: string;
  holidays: HolidayEntry[];
}

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST, no DST)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "America/Detroit", label: "Eastern - Detroit" },
  { value: "America/Indiana/Indianapolis", label: "Eastern - Indiana (Indianapolis)" },
  { value: "America/Boise", label: "Mountain - Boise" },
  { value: "America/North_Dakota/Center", label: "Central - North Dakota" },
];

const DEFAULT_HOLIDAYS: HolidayEntry[] = [
  { id: "ny", day: 1, month: 1, year: 0, name: "New Year's Day" },
  { id: "mlk", day: 20, month: 1, year: 0, name: "Martin Luther King Jr. Day" },
  { id: "pres", day: 17, month: 2, year: 0, name: "Presidents Day" },
  { id: "mem", day: 26, month: 5, year: 0, name: "Memorial Day" },
  { id: "jun", day: 19, month: 6, year: 0, name: "Juneteenth" },
  { id: "july4", day: 4, month: 7, year: 0, name: "Independence Day" },
  { id: "labor", day: 1, month: 9, year: 0, name: "Labor Day" },
  { id: "columbus", day: 12, month: 10, year: 0, name: "Columbus Day" },
  { id: "vets", day: 11, month: 11, year: 0, name: "Veterans Day" },
  { id: "thanks", day: 26, month: 11, year: 0, name: "Thanksgiving" },
  { id: "xmas", day: 25, month: 12, year: 0, name: "Christmas Day" },
];

function loadSettings(): CalendarSettings {
  if (typeof window === "undefined") {
    return {
      timezone: "America/New_York",
      holidays: DEFAULT_HOLIDAYS,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { timezone: "America/New_York", holidays: DEFAULT_HOLIDAYS };
    }
    const parsed = JSON.parse(raw) as CalendarSettings;
    return {
      timezone: parsed.timezone ?? "America/New_York",
      holidays: Array.isArray(parsed.holidays) ? parsed.holidays : DEFAULT_HOLIDAYS,
    };
  } catch {
    return { timezone: "America/New_York", holidays: DEFAULT_HOLIDAYS };
  }
}

function saveSettings(settings: CalendarSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function formatHolidayTag(h: HolidayEntry): string {
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = monthNames[h.month - 1] ?? "";
  if (h.year && h.year > 0) {
    return `${h.day} ${m} ${h.year} · ${h.name}`;
  }
  return `${h.day} ${m} · ${h.name}`;
}

interface CalendarSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarSettingsSheet({ open, onOpenChange }: CalendarSettingsSheetProps) {
  const [timezone, setTimezone] = useState("America/New_York");
  const [holidays, setHolidays] = useState<HolidayEntry[]>(DEFAULT_HOLIDAYS);
  const [newDay, setNewDay] = useState("");
  const [newMonth, setNewMonth] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newName, setNewName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setTimezone(s.timezone);
    setHolidays(s.holidays);
  }, [open]);

  const handleSaveTimezone = (tz: string) => {
    setTimezone(tz);
    saveSettings({ timezone: tz, holidays });
  };

  const handleRemoveHoliday = (id: string) => {
    const next = holidays.filter((h) => h.id !== id);
    setHolidays(next);
    saveSettings({ timezone, holidays: next });
  };

  const handleAddHoliday = () => {
    const day = parseInt(newDay, 10);
    const month = parseInt(newMonth, 10);
    const year = parseInt(newYear, 10) || 0;
    if (!day || day < 1 || day > 31 || !month || month < 1 || month > 12 || !newName.trim()) {
      return;
    }
    const id = `custom-${Date.now()}`;
    const entry: HolidayEntry = { id, day, month, year, name: newName.trim() };
    const next = [...holidays, entry];
    setHolidays(next);
    saveSettings({ timezone, holidays: next });
    setNewDay("");
    setNewMonth("");
    setNewYear("");
    setNewName("");
    setShowAddForm(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-[18px] font-semibold text-neutral-900">
            Calendar settings
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pt-6">
          {/* Time zone */}
          <div className="space-y-2">
            <Label className="text-[14px] font-medium text-neutral-900">Time zone</Label>
            <Select value={timezone} onValueChange={handleSaveTimezone}>
              <SelectTrigger className="w-full h-10 border-neutral-200">
                <SelectValue placeholder="Select time zone" />
              </SelectTrigger>
              <SelectContent>
                {US_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[12px] text-neutral-500">
              All United States time zones. Calendar times will use this zone.
            </p>
          </div>

          {/* Public holidays */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-500" />
              <Label className="text-[14px] font-medium text-neutral-900">
                Public holidays
              </Label>
            </div>
            <p className="text-[12px] text-neutral-500">
              Day · Month · Year · Holiday. Add extra holidays below if needed.
            </p>
            <div className="flex flex-wrap gap-2">
              {holidays.map((h) => (
                <Badge
                  key={h.id}
                  variant="secondary"
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-normal",
                    "bg-neutral-100 text-neutral-800 border border-neutral-200",
                    "flex items-center gap-1.5"
                  )}
                >
                  <span>{formatHolidayTag(h)}</span>
                  {h.id.startsWith("custom-") && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHoliday(h.id)}
                      className="rounded-full p-0.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800"
                      aria-label={`Remove ${h.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>

            {showAddForm ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px] text-neutral-500">Day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="1"
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-neutral-500">Month</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      placeholder="1"
                      value={newMonth}
                      onChange={(e) => setNewMonth(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-neutral-500">Year (optional)</Label>
                    <Input
                      type="number"
                      min={2020}
                      max={2030}
                      placeholder="2026"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] text-neutral-500">Holiday name</Label>
                  <Input
                    placeholder="e.g. Company holiday"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-[#FED96A] hover:bg-[#e8c55a] text-neutral-900"
                    onClick={handleAddHoliday}
                  >
                    Add holiday
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewDay("");
                      setNewMonth("");
                      setNewYear("");
                      setNewName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-dashed border-neutral-300 text-neutral-600 hover:text-neutral-900"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add extra holiday
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
