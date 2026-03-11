"use client";

import { WeeklyCalendarView } from "./weekly-calendar-view";

interface CalendarViewProps {
  onCreateShiftClick?: () => void;
}

export function CalendarView({ onCreateShiftClick }: CalendarViewProps) {
  return (
    <div className="h-full w-full">
      <WeeklyCalendarView onCreateShiftClick={onCreateShiftClick} />
    </div>
  );
}
