"use client"

import * as React from "react"
import { useFormBuilderStore } from "@/stores/form-builder"
import { GripVertical, PenIcon, Trash2 } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { shallow } from "zustand/shallow"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form"
import { renderBuilderField } from "@/components/form-builder/builder-render-field"
import { BuilderTooltipWrapper } from "@/components/form-builder/builder-tooltip-wrapper"

import type { FormBuilderField } from "@/types/form-builder-field"
import { FormBuilderState } from "@/types/form-builder-store"

export interface BuilderFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formField: FormBuilderField
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: UseFormReturn<any, any, any>
  style?: React.CSSProperties
  isDragging?: boolean
}

const selector = (state: FormBuilderState) => ({
  deleteFormField: state.deleteFormField,
  setSelectedFormField: state.setSelectedFormField,
  setIsEditFormFieldOpen: state.setIsEditFormFieldOpen,
})

export const BuilderField = React.forwardRef<HTMLDivElement, BuilderFieldProps>(
  ({ formField, form, style, isDragging, ...props }, ref) => {
    const { deleteFormField, setSelectedFormField, setIsEditFormFieldOpen } =
      useFormBuilderStore(selector, shallow)

    return (
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-md border-2 border-dashed border-transparent",
          {
            "rounded-md border-foreground bg-muted opacity-60": isDragging,
          }
        )}
        style={style}
        ref={ref}
      >
        <div className="absolute -left-12 top-1/2 flex -translate-y-1/2 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <BuilderTooltipWrapper text="Edit field">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setSelectedFormField(formField.id)
                setIsEditFormFieldOpen(true)
              }}
              type="button"
            >
              <PenIcon className="size-4" />
            </Button>
          </BuilderTooltipWrapper>
          <BuilderTooltipWrapper text="Delete field" side="bottom">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => deleteFormField(formField.id)}
              type="button"
            >
              <Trash2 className="size-4" />
            </Button>
          </BuilderTooltipWrapper>
        </div>
        <div className="w-full">
          <FormField
            control={form?.control}
            name={formField.name}
            render={({ field }) =>
              renderBuilderField({ field, formField })
            }
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          type="button"
          {...props}
          className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <GripVertical className="size-4" />
        </Button>
      </div>
    )
  }
)

BuilderField.displayName = "BuilderField"
