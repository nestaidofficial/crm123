import { create } from "zustand"
import { persist } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

import { FormBuilderState } from "@/types/form-builder-store"

export const useFormBuilderStore = create<FormBuilderState>()(
  persist(
    immer((set, get) => ({
      isEditFormFieldOpen: false,
      formFields: [],
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
        set({ formFields: [], selectedFormField: "" })
      },
    })),
    {
      name: "form-builder-storage",
      partialize: (state) => ({ formFields: state.formFields }),
    }
  )
)
