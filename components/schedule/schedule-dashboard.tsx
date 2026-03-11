"use client";

import { useState } from "react";
import { CalendarView } from "./calendar-view";
import { CreateShiftDialog } from "./create-shift-dialog";
import { useScheduleStore } from "@/store/useScheduleStore";
import { toast } from "sonner";

export function ScheduleDashboard() {
  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);
  const createEvent = useScheduleStore((state) => state.createEvent);

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
