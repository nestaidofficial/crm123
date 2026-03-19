import type { FormBuilderField } from "@/types/form-builder-field"

export type FormBuilderState = {
  formFields: FormBuilderField[]
  setFormFields: (fields: FormBuilderField[]) => void
  deleteFormField: (id?: string) => void
  addFormField: (formField: FormBuilderField) => void
  selectedFormField?: string
  setSelectedFormField: (id?: string) => void
  isEditFormFieldOpen: boolean
  setIsEditFormFieldOpen: (open: boolean) => void
  updateFormField: (formField: FormBuilderField) => void
  clearFormFields: () => void
}
