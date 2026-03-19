"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { TooltipProvider } from "@/components/ui/tooltip"

const FieldPalette = dynamic(
  () => import("@/components/form-builder/field-palette").then((m) => ({ default: m.FieldPalette })),
  { ssr: false }
)
const BuilderFormEditor = dynamic(
  () => import("@/components/form-builder/builder-form-editor").then((m) => ({ default: m.BuilderFormEditor })),
  { ssr: false }
)
const BuilderEditField = dynamic(
  () => import("@/components/form-builder/builder-edit-field").then((m) => ({ default: m.BuilderEditField })),
  { ssr: false }
)

export default function FormBuilderPage() {
  return (
    <TooltipProvider>
      <div className="flex h-full -mx-6 -mt-4">
        {/* Left panel: field palette */}
        <FieldPalette />

        {/* Right area: preview */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-white py-6">
          <BuilderFormEditor />
        </div>

        {/* Edit field sheet */}
        <BuilderEditField />
      </div>
    </TooltipProvider>
  )
}
