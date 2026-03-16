"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 w-full", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
        month: "space-y-4 flex-1",
        caption: "flex justify-center pt-1 relative items-center mb-1",
        caption_label: "text-base font-semibold text-neutral-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 hover:bg-neutral-100 border-neutral-200"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full justify-between",
        head_cell:
          "text-neutral-600 rounded-md flex-1 font-semibold text-sm uppercase text-center",
        row: "flex w-full mt-1 justify-between",
        cell: cn(
          "relative flex-1 h-10 p-0 text-center text-base focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-lg [&:has(>.day-range-start)]:rounded-l-lg [&:has(>.day-range-middle)]:bg-neutral-100 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg"
            : "[&:has([aria-selected])]:rounded-lg"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-full p-0 font-normal text-base hover:bg-neutral-100 aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start rounded-l-lg bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white",
        day_range_end: "day-range-end rounded-r-lg bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white",
        day_selected:
          "bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white focus:bg-neutral-900 focus:text-white rounded-lg",
        day_today: "bg-neutral-100 text-neutral-900 font-semibold",
        day_outside:
          "day-outside text-neutral-400 opacity-40 aria-selected:bg-neutral-100/50 aria-selected:text-neutral-500",
        day_disabled: "text-neutral-300 opacity-50 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-neutral-100 aria-selected:text-neutral-900 rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
