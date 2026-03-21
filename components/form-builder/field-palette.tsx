"use client"

import * as React from "react"
import { useFormBuilderStore } from "@/stores/form-builder"
import { shallow } from "zustand/shallow"
import { Layers, Paintbrush } from "lucide-react"

import { formBuilderFields } from "@/lib/form-builder-constants"
import { BuilderDesignPanel } from "@/components/form-builder/builder-design-panel"
import { cn } from "@/lib/utils"

import { FormBuilderState } from "@/types/form-builder-store"

const selector = (state: FormBuilderState) => ({
  addFormField: state.addFormField,
  setIsEditFormFieldOpen: state.setIsEditFormFieldOpen,
  setSelectedFormField: state.setSelectedFormField,
})

type Tab = "fields" | "design"

export function FieldPalette() {
  const { addFormField, setSelectedFormField, setIsEditFormFieldOpen } =
    useFormBuilderStore(selector, shallow)

  const [activeTab, setActiveTab] = React.useState<Tab>("fields")

  return (
    <div className="w-[260px] flex-shrink-0 border-r bg-white flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="px-3 pt-4 pb-0 flex gap-1 shrink-0">
        <TabButton
          active={activeTab === "fields"}
          onClick={() => setActiveTab("fields")}
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Fields"
        />
        <TabButton
          active={activeTab === "design"}
          onClick={() => setActiveTab("design")}
          icon={<Paintbrush className="h-3.5 w-3.5" />}
          label="Design"
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-100 mt-3 mx-3 shrink-0" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {activeTab === "fields" ? (
          <>
            <div className="px-4 pt-4 pb-2 shrink-0">
              <p className="text-[11px] text-neutral-400">
                Click a field to add it to your form
              </p>
            </div>
            <div className="py-1">
              {formBuilderFields.map((field) => (
                <button
                  key={field.name}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors"
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
                  <div className="h-7 w-7 rounded-lg bg-neutral-50 border border-neutral-200/80 flex items-center justify-center shrink-0">
                    <field.Icon className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <span>{field.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <BuilderDesignPanel />
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all",
        active
          ? "bg-neutral-900 text-white shadow-sm"
          : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
      )}
    >
      {icon}
      {label}
    </button>
  )
}
