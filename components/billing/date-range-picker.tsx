"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  isAfter,
  isBefore,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function buildCalendarGrid(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let current = start;
  while (!isAfter(current, end)) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(current);
      current = addDays(current, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [viewMonth, setViewMonth] = React.useState(
    value.start ?? new Date()
  );
  const [hovered, setHovered] = React.useState<Date | null>(null);

  const weeks = buildCalendarGrid(viewMonth);

  const handleDayClick = (day: Date) => {
    if (!value.start || (value.start && value.end)) {
      onChange({ start: day, end: null });
    } else {
      if (isBefore(day, value.start)) {
        onChange({ start: day, end: value.start });
      } else {
        onChange({ start: value.start, end: day });
      }
    }
  };

  const isInRange = (day: Date): boolean => {
    const start = value.start;
    const end = value.end ?? hovered;
    if (!start || !end) return false;
    const [from, to] = isAfter(end, start) ? [start, end] : [end, start];
    return isWithinInterval(day, { start: from, end: to });
  };

  const isRangeStart = (day: Date) =>
    value.start ? isSameDay(day, value.start) : false;

  const isRangeEnd = (day: Date) => {
    const end = value.end ?? (value.start && hovered ? hovered : null);
    return end ? isSameDay(day, end) : false;
  };

  const isRangeEdge = (day: Date) => isRangeStart(day) || isRangeEnd(day);

  return (
    <div className="select-none p-4 w-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="h-8 w-8 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[15px] font-semibold text-neutral-900">
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="h-8 w-8 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-neutral-400 tracking-wide py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              const inCurrentMonth = isSameMonth(day, viewMonth);
              const inRange = isInRange(day);
              const isEdge = isRangeEdge(day);
              const isStart = isRangeStart(day);
              const isEnd = isRangeEnd(day);
              const todayDay = isToday(day);

              // Range strip bg logic — horizontal band across cell
              const showRangeStrip = inRange && !isEdge;
              const isFirstInRow = di === 0;
              const isLastInRow = di === 6;
              const isStartEdge = isStart || isFirstInRow;
              const isEndEdge = isEnd || isLastInRow;

              return (
                <div
                  key={di}
                  className={cn(
                    "relative flex items-center justify-center h-9",
                    // Range background strip
                    inRange && !isEdge && "bg-indigo-50",
                    isEdge && inRange && [
                      isStart && !isEnd && "bg-gradient-to-r from-transparent to-indigo-50",
                      isEnd && !isStart && "bg-gradient-to-l from-transparent to-indigo-50",
                      isStart && isEnd && "bg-transparent",
                    ],
                    // Round left/right of range strip at row boundaries
                    showRangeStrip && isFirstInRow && "rounded-l-full",
                    showRangeStrip && isLastInRow && "rounded-r-full",
                  )}
                  onMouseEnter={() => setHovered(day)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <button
                    type="button"
                    onClick={() => handleDayClick(day)}
                    disabled={!inCurrentMonth}
                    className={cn(
                      "relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-medium transition-all",
                      // Default state
                      !inCurrentMonth && "text-neutral-300 cursor-default pointer-events-none",
                      inCurrentMonth && !isEdge && !todayDay && "text-neutral-700 hover:bg-indigo-100",
                      // Today marker
                      todayDay && !isEdge && "text-indigo-600 bg-indigo-100",
                      // Range edge (selected start/end)
                      isEdge && "bg-indigo-600 text-white hover:bg-indigo-700",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer: selected range label */}
      {(value.start || value.end) && (
        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            {value.start ? format(value.start, "MMM d, yyyy") : "—"}
            {" → "}
            {value.end ? format(value.end, "MMM d, yyyy") : "Select end date"}
          </span>
          {value.start && (
            <button
              type="button"
              onClick={() => onChange({ start: null, end: null })}
              className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
