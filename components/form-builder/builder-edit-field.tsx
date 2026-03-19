"use client"

import * as React from "react"
import { useFormBuilderStore } from "@/stores/form-builder"
import { shallow } from "zustand/shallow"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { BuilderEditInputs } from "@/components/form-builder/builder-edit-inputs"

import { FormBuilderState } from "@/types/form-builder-store"

const selector = (state: FormBuilderState) => ({
  isEditFormFieldOpen: state.isEditFormFieldOpen,
  setIsEditFormFieldOpen: state.setIsEditFormFieldOpen,
  selectedFormField: state.selectedFormField,
  updateFormField: state.updateFormField,
  formFields: state.formFields,
})

export function BuilderEditField() {
  const {
    isEditFormFieldOpen,
    setIsEditFormFieldOpen,
    selectedFormField,
    updateFormField,
    formFields,
  } = useFormBuilderStore(selector, shallow)

  const selectedField = React.useMemo(() => {
    return formFields.find((f: { id?: string }) => f.id === selectedFormField)
  }, [selectedFormField, formFields])

  return (
    <Sheet
      open={isEditFormFieldOpen}
      onOpenChange={setIsEditFormFieldOpen}
      modal={false}
    >
      {selectedFormField && selectedField && (
        <SheetContent
          onInteractOutside={(e) => e.preventDefault()}
          className="sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>Edit {selectedField.name} Field</SheetTitle>
            <SheetDescription>Update info about this field.</SheetDescription>
          </SheetHeader>
          <Separator className="my-4" />
          <div className="space-y-6">
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="Your field label..."
                value={selectedField.label}
                onChange={(e) =>
                  updateFormField({ ...selectedField, label: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Your field description..."
                value={selectedField.description}
                onChange={(e) =>
                  updateFormField({ ...selectedField, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your field name..."
                value={selectedField.name}
                onChange={(e) =>
                  updateFormField({ ...selectedField, name: e.target.value })
                }
              />
            </div>
            <BuilderEditInputs selectedField={selectedField} />
          </div>
        </SheetContent>
      )}
    </Sheet>
  )
}
