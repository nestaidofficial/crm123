"use client";

/**
 * Medical care plan step of Add Client wizard.
 * Form styling follows: .cursor/rules/nessa-form-design.mdc
 */

import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SKILLED_SERVICES_OPTIONS } from "@/lib/clients/templates";
import type { ClientFormValues } from "@/lib/clients/schema";
import { Stethoscope, User, Phone, Pill, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const rowClass = "flex items-center gap-3 pb-3 border-b border-neutral-100";
const iconClass = "h-5 w-5 text-neutral-400 shrink-0";
const inputBase =
  "min-h-[28px] py-1 border-0 px-0 bg-transparent shadow-none focus-visible:ring-0 text-[14px] leading-[1.5] placeholder:text-neutral-400 caret-neutral-900 outline-none focus:outline-none focus:ring-0 flex-1 min-w-0 self-center";
const errorClass = "text-[11px] text-red-500 -mt-1 pl-8";

type MedicalErrors = Record<string, { message?: string } | undefined>;

export function MedicalCarePlanSection() {
  const { control, formState: { errors } } = useFormContext<ClientFormValues>();
  const err = errors as MedicalErrors;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "medications" as const,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className={rowClass}>
          <Stethoscope className={iconClass} />
          <Controller
            name="diagnosis"
            control={control}
            render={({ field }) => (
              <Input
                id="diagnosis"
                {...field}
                className={inputBase}
                placeholder="e.g. Diabetes, CHF"
              />
            )}
          />
        </div>
        {err.diagnosis?.message && (
          <p className={errorClass}>{err.diagnosis.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <div className={rowClass}>
          <User className={iconClass} />
          <Controller
            name="physicianName"
            control={control}
            render={({ field }) => (
              <Input
                id="physicianName"
                {...field}
                className={inputBase}
                placeholder="Physician name"
              />
            )}
          />
        </div>
        {err.physicianName?.message && (
          <p className={errorClass}>{err.physicianName.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <div className={rowClass}>
          <Phone className={iconClass} />
          <Controller
            name="physicianPhone"
            control={control}
            render={({ field }) => (
              <Input
                id="physicianPhone"
                {...field}
                type="tel"
                className={inputBase}
                placeholder="Physician phone"
              />
            )}
          />
        </div>
        {err.physicianPhone?.message && (
          <p className={errorClass}>{err.physicianPhone.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-[13px] text-neutral-500">Add each medication with dose and frequency</p>
        {fields.map((field, i) => (
          <div
            key={field.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3"
          >
            <Pill className={iconClass} />
            <Controller
              name={`medications.${i}.name`}
              control={control}
              render={({ field: f }) => (
                <Input
                  {...f}
                  className={cn(inputBase, "flex-1 min-w-[120px]")}
                  placeholder="Medication name"
                />
              )}
            />
            <Controller
              name={`medications.${i}.dose`}
              control={control}
              render={({ field: f }) => (
                <Input
                  {...f}
                  className={cn(inputBase, "w-24")}
                  placeholder="10mg"
                />
              )}
            />
            <Controller
              name={`medications.${i}.frequency`}
              control={control}
              render={({ field: f }) => (
                <Input
                  {...f}
                  className={cn(inputBase, "flex-1 min-w-[100px]")}
                  placeholder="Once daily"
                />
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              className="h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-red-500 shrink-0"
              aria-label="Remove medication"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ name: "", dose: "", frequency: "" })}
          className="flex items-center gap-3 w-full text-left text-[13px] text-neutral-500 hover:text-neutral-700 py-2 border-0"
        >
          <Plus className={iconClass} />
          Add medication
        </Button>
        {err.medications?.message && (
          <p className={errorClass}>{err.medications.message}</p>
        )}
      </div>

      <div>
        <p className="text-[13px] text-neutral-700 mb-3">Skilled services — select all that apply</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SKILLED_SERVICES_OPTIONS.map((opt) => (
            <Controller
              key={opt}
              name="skilledServices"
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
        {err.skilledServices?.message && (
          <p className={cn(errorClass, "mt-1")}>{err.skilledServices.message}</p>
        )}
      </div>
    </div>
  );
}
