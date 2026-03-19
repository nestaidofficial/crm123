"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { BuilderField, type BuilderFieldProps } from "@/components/form-builder/builder-field"

export const BuilderSortableField = React.memo(({ formField, form }: BuilderFieldProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: formField.name,
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <BuilderField
      formField={formField}
      form={form}
      ref={setNodeRef}
      style={style}
      isDragging={isDragging}
      {...attributes}
      {...listeners}
    />
  )
})

BuilderSortableField.displayName = "BuilderSortableField"
