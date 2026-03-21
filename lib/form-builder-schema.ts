import * as z from "zod"

import { FieldType, FormBuilderField } from "@/types/form-builder-field"

export function generateZodSchema(formFields: FormBuilderField[]) {
  const formSchemaObject: Record<string, z.ZodType<any, any>> = {}
  formFields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny
    switch (field.type) {
      case FieldType.INPUT:
        fieldSchema = z.string()
        break
      case FieldType.TEXTAREA:
        fieldSchema = z.string()
        break
      case FieldType.NUMBER_INPUT:
        fieldSchema = z.coerce.number()
        break
      case FieldType.EMAIL:
        fieldSchema = z.string().email()
        break
      case FieldType.CHECKBOX:
        fieldSchema = z.boolean()
        break
      case FieldType.SELECT:
        fieldSchema = z.string()
        break
      case FieldType.DATE:
        fieldSchema = z.date()
        break
      case FieldType.RADIO_GROUP:
        fieldSchema = z.string()
        break
      case FieldType.SWITCH:
        fieldSchema = z.boolean()
        break
      case FieldType.COMBOBOX:
        fieldSchema = z.string()
        break
      case FieldType.SLIDER:
        fieldSchema = z.coerce.number()
        break
      case FieldType.SIGNATURE:
        fieldSchema = z.string()
        break
    }
    formSchemaObject[field.name] = fieldSchema
  })

  return z.object(formSchemaObject)
}

export const generateDefaultValues = (
  formFields: FormBuilderField[]
): Record<string, any> => {
  const defaultValues: Record<string, any> = {}

  formFields.forEach((field) => {
    if (field.default) {
      defaultValues[field.name] = field.default
    }
  })

  return defaultValues
}
