"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { CalendarView } from "./calendar-view";
import { CreateShiftDialog } from "./create-shift-dialog";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useSupabaseRealtimeMulti } from "@/lib/hooks/useSupabaseRealtime";
import { toast } from "sonner";

export function ScheduleDashboard() {
  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);
  const createEvent = useScheduleStore((state) => state.createEvent);
  const clearCache = useScheduleStore((state) => state.clearCache);
  const hydrate = useScheduleStore((state) => state.hydrate);
  const currentDateRange = useScheduleStore((state) => state.currentDateRange);

  // ── Real-time: listen for schedule_events changes (from AI coordinator, other users, etc.) ──
  // Use a ref to avoid subscription churn when currentDateRange changes
  const dateRangeRef = useRef(currentDateRange);
  useEffect(() => {
    dateRangeRef.current = currentDateRange;
  }, [currentDateRange]);

  const handleRealtimeRefresh = useCallback(() => {
    clearCache();
    hydrate(dateRangeRef.current || undefined);
  }, [clearCache, hydrate]);

  useSupabaseRealtimeMulti("schedule_events", {
    onInsert: useCallback(() => {
      handleRealtimeRefresh();
      toast.info("New shift added to the schedule");
    }, [handleRealtimeRefresh]),
    onUpdate: useCallback(() => {
      handleRealtimeRefresh();
      toast.info("A shift has been updated");
    }, [handleRealtimeRefresh]),
    onDelete: useCallback(() => {
      handleRealtimeRefresh();
      toast.info("A shift has been removed");
    }, [handleRealtimeRefresh]),
  });

  // Note: hydration moved to WeeklyCalendarView to avoid duplicate fetches

  const handleSaveShift = async (shift: any) => {
    try {
      // Map shift dialog data to schedule event format
      const eventData = {
        title: shift.shiftType || "New Shift",
        clientId: shift.client || undefined,
        caregiverId: shift.caregiver || undefined,
        careType: shift.shiftType?.toLowerCase().replace(/\s+/g, "_") as any,
        status: "scheduled" as const,
        startAt: new Date(`${shift.startDate}T${shift.startTime}`).toISOString(),
        endAt: new Date(`${shift.startDate}T${shift.endTime}`).toISOString(),
        isAllDay: false,
        isOpenShift: shift.isOpenShift || false,
        color: "bg-blue-200",
        instructions: shift.instructions || undefined,
        payRate: shift.payRate ? parseFloat(shift.payRate) : undefined,
        payType: shift.payType as any,
        description: undefined,
        careCoordinatorId: undefined,
        recurrenceRuleId: undefined,
        isRecurringInstance: false,
        parentEventId: undefined,
      };

      await createEvent(eventData as any);
      toast.success("Shift created successfully");
      setIsCreateShiftOpen(false);
    } catch (err) {
      console.error("Failed to create shift:", err);
      toast.error("Failed to create shift");
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <CalendarView onCreateShiftClick={() => setIsCreateShiftOpen(true)} />

      <CreateShiftDialog
        open={isCreateShiftOpen}
        onOpenChange={setIsCreateShiftOpen}
        onSave={handleSaveShift}
      />
    </div>
  );
}
