"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADL_OPTIONS,
  DAYS_OF_WEEK_OPTIONS,
  TIME_WINDOW_OPTIONS,
  VISIT_FREQUENCY_OPTIONS,
} from "@/lib/clients/templates";
import type { ClientFormValues } from "@/lib/clients/schema";
import { Calendar, Clock, ChevronDown } from "lucide-react";

const rowClass = "flex items-center gap-3 pb-3 border-b border-neutral-100";
const iconClass = "h-5 w-5 text-neutral-400 shrink-0";
const iconSmall = "h-4 w-4 text-neutral-400 shrink-0";
const errorClass = "text-[11px] text-red-500 -mt-1 pl-8";
const dropdownContent = "rounded-xl border border-neutral-200/80 bg-white shadow-lg max-h-[200px] overflow-y-auto py-1.5";
const selectTriggerClass =
  "h-auto min-h-0 border-0 p-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 text-[14px] flex-1 min-w-0 [&>span]:text-neutral-400 data-[placeholder]:text-neutral-400 [&>svg]:hidden";

// Cast needed: form is ClientFormValues (union); this section only renders for non_medical
interface NonMedicalErrors {
  adlNeeds?: { message?: string };
  schedulePreferences?: { timeWindow?: { message?: string }; visitFrequency?: { message?: string } };
}

export function NonMedicalCarePlanSection() {
  const { control, formState: { errors } } = useFormContext<ClientFormValues>();
  const err = errors as NonMedicalErrors;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] text-neutral-700 mb-3">ADL needs — select all that apply</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ADL_OPTIONS.map((opt) => (
            <Controller
              key={opt}
              name="adlNeeds"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 rounded-lg cursor-pointer text-[13px] text-neutral-800">
                  <Checkbox
                    checked={field.value.includes(opt)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        field.onChange([...field.value, opt]);
                      } else {
                        field.onChange(field.value.filter((v) => v !== opt));
                      }
                    }}
                    className="border-neutral-200 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
                  />
                  {opt}
                </label>
              )}
            />
          ))}
        </div>
        {err.adlNeeds?.message && (
          <p className={errorClass}>{err.adlNeeds.message}</p>
        )}
      </div>

      <div>
        <p className="text-[13px] text-neutral-700 mb-3">Preferred days and frequency</p>
        <div className="space-y-2 mb-3">
          <p className="text-[12px] text-neutral-500">Days of week</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DAYS_OF_WEEK_OPTIONS.map((day) => (
              <Controller
                key={day}
                name="schedulePreferences.daysOfWeek"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer text-[13px] text-neutral-800">
                    <Checkbox
                      checked={field.value.includes(day)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...field.value, day]);
                        } else {
                          field.onChange(field.value.filter((d) => d !== day));
                        }
                      }}
                      className="border-neutral-200 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
                    />
                    {day.slice(0, 3)}
                  </label>
                )}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className={rowClass}>
            <Clock className={iconClass} />
            <Controller
              name="schedulePreferences.timeWindow"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Time window" />
                  </SelectTrigger>
                  <SelectContent className={dropdownContent}>
                    {TIME_WINDOW_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <ChevronDown className={iconSmall} />
          </div>
          {err.schedulePreferences?.timeWindow?.message && (
            <p className={errorClass}>
              {err.schedulePreferences!.timeWindow!.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <div className={rowClass}>
            <Calendar className={iconClass} />
            <Controller
              name="schedulePreferences.visitFrequency"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Visit frequency" />
                  </SelectTrigger>
                  <SelectContent className={dropdownContent}>
                    {VISIT_FREQUENCY_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <ChevronDown className={iconSmall} />
          </div>
          {err.schedulePreferences?.visitFrequency?.message && (
            <p className={errorClass}>
              {err.schedulePreferences!.visitFrequency!.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
