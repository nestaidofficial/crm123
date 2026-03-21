import { create } from "zustand"
import { persist } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

import { FormBuilderState } from "@/types/form-builder-store"
import { DEFAULT_CUSTOMIZATION } from "@/types/form-customization"

export const useFormBuilderStore = create<FormBuilderState>()(
  persist(
    immer((set, get) => ({
      formId: null,
      formShortId: null,
      isEditFormFieldOpen: false,
      formFields: [],
      customization: DEFAULT_CUSTOMIZATION,
      setFormId: (id) => {
        set({ formId: id })
      },
      setFormShortId: (shortId) => {
        set({ formShortId: shortId })
      },
      setFormFields(fields) {
        set({ formFields: fields })
      },
      addFormField: (formField) => {
        set({ formFields: [...get().formFields, formField] })
      },
      deleteFormField: (id) => {
        set({
          formFields: get().formFields.filter(
            (formField) => formField.id !== id
          ),
        })
      },
      setSelectedFormField: (formField) => {
        set({ selectedFormField: formField })
      },
      setIsEditFormFieldOpen: (open) => {
        set({ isEditFormFieldOpen: open })
      },
      updateFormField: (formField) => {
        set((state) => {
          const field = state.formFields.find((f) => f.id === formField.id)
          if (field) {
            Object.assign(field, formField)
          }
        })
      },
      clearFormFields() {
        set({ formFields: [], selectedFormField: "", formId: null, formShortId: null })
      },
      updateCustomization: (patch) => {
        set((state) => {
          Object.assign(state.customization, patch)
        })
      },
      resetCustomization: () => {
        set({ customization: DEFAULT_CUSTOMIZATION })
      },
    })),
    {
      name: "form-builder-storage",
      partialize: (state) => ({
        formId: state.formId,
        formShortId: state.formShortId,
        formFields: state.formFields,
        customization: state.customization,
      }),
    }
  )
)
