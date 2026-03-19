"use client"

import * as React from "react"
import { useFormBuilderStore } from "@/stores/form-builder"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { zodResolver } from "@hookform/resolvers/zod"
import { Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { shallow } from "zustand/shallow"

import { generateDefaultValues, generateZodSchema } from "@/lib/form-builder-schema"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { BuilderField } from "@/components/form-builder/builder-field"
import { BuilderSortableField } from "@/components/form-builder/builder-sortable-field"

import { FormBuilderField } from "@/types/form-builder-field"
import { FormBuilderState } from "@/types/form-builder-store"

const selector = (state: FormBuilderState) => ({
  formFields: state.formFields,
  setFormFields: state.setFormFields,
  clearFormFields: state.clearFormFields,
})

export function BuilderFormEditor() {
  const [activeFormField, setActiveFormField] =
    React.useState<FormBuilderField | null>(null)
  const { formFields, setFormFields, clearFormFields } = useFormBuilderStore(
    selector,
    shallow
  )

  const formSchema = React.useMemo(
    () => generateZodSchema(formFields),
    [formFields]
  )
  const defaultValues = React.useMemo(
    () => generateDefaultValues(formFields),
    [formFields]
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [form, defaultValues])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = formFields.findIndex((field: FormBuilderField) => field.name === active.id)
      const newIndex = formFields.findIndex((field: FormBuilderField) => field.name === over.id)
      setFormFields(arrayMove(formFields, oldIndex, newIndex))
    }
    setActiveFormField(null)
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const formField = formFields.find((field: FormBuilderField) => field.name === active.id)
    if (formField) {
      setActiveFormField(formField)
    }
  }

  return (
    <div className="flex-1 overflow-x-hidden px-4">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-md border shadow-sm">
        {/* Browser-style header */}
        <div className="flex items-center gap-1.5 border-b p-4">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
          <Button
            className="ml-auto gap-2"
            size="sm"
            onClick={clearFormFields}
            variant="outline"
          >
            <Trash2 className="size-4" />
            Clear form fields
          </Button>
        </div>

        {/* Preview area */}
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          {formFields.length !== 0 ? (
            <Form {...form}>
              <form className="mx-auto flex w-3/4 flex-col gap-6 p-4">
                <SortableContext
                  items={formFields.map((formField: FormBuilderField) => formField.name)}
                  strategy={verticalListSortingStrategy}
                >
                  {formFields.map((formField: FormBuilderField) => (
                    <BuilderSortableField
                      formField={formField}
                      form={form as any}
                      key={formField.name}
                    />
                  ))}
                </SortableContext>
                <DragOverlay className="bg-background">
                  {activeFormField ? (
                    <BuilderField formField={activeFormField} />
                  ) : (
                    <></>
                  )}
                </DragOverlay>
                <Button type="submit">Submit</Button>
              </form>
            </Form>
          ) : (
            <div className="grid place-items-center p-8">
              <h3 className="text-2xl font-semibold">No fields added yet</h3>
              <p className="text-muted-foreground">
                Select fields from the panel on the left to get started.
              </p>
            </div>
          )}
        </DndContext>
      </div>
    </div>
  )
}
