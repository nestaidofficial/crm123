"use client"

import * as React from "react"
import { useFormBuilderStore } from "@/stores/form-builder"
import { shallow } from "zustand/shallow"

import { formBuilderFields } from "@/lib/form-builder-constants"
import { Separator } from "@/components/ui/separator"

import { FormBuilderState } from "@/types/form-builder-store"

const selector = (state: FormBuilderState) => ({
  addFormField: state.addFormField,
  setIsEditFormFieldOpen: state.setIsEditFormFieldOpen,
  setSelectedFormField: state.setSelectedFormField,
})

export function FieldPalette() {
  const { addFormField, setSelectedFormField, setIsEditFormFieldOpen } =
    useFormBuilderStore(selector, shallow)

  return (
    <div className="w-[260px] flex-shrink-0 border-r bg-white flex flex-col overflow-y-auto">
      <div className="px-4 pt-[30px] pb-3">
        <h2 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wide">
          Form Builder
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {formBuilderFields.map((field) => (
          <button
            key={field.name}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[14px] text-neutral-700 hover:bg-neutral-50 transition-colors"
            onClick={() => {
              const newFormField = {
                ...field,
                id: Math.random().toString().slice(-10),
                name: `${field.name.toLowerCase().replaceAll(" ", "_")}_${Math.random().toString().slice(-10)}`,
              }
              addFormField(newFormField)
              setSelectedFormField(newFormField.id)
              setIsEditFormFieldOpen(true)
            }}
          >
            <field.Icon className="h-4 w-4 text-neutral-400 shrink-0" />
            <span>{field.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
