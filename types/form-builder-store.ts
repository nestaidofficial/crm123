import type { FormBuilderField } from "@/types/form-builder-field"
import type { FormCustomization } from "@/types/form-customization"

export type FormBuilderState = {
  formId: string | null
  formShortId: string | null
  setFormId: (id: string | null) => void
  setFormShortId: (shortId: string | null) => void
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
  customization: FormCustomization
  updateCustomization: (patch: Partial<FormCustomization>) => void
  resetCustomization: () => void
}
