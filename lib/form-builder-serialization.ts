import { formBuilderFields } from "@/lib/form-builder-constants"
import { FieldType, type FormBuilderField } from "@/types/form-builder-field"

/**
 * Map from FieldType to its Icon component.
 * Used to rehydrate Icon after deserializing from DB.
 */
const ICON_MAP = Object.fromEntries(
  formBuilderFields.map((f) => [f.type, f.Icon])
) as Record<FieldType, FormBuilderField["Icon"]>

/**
 * A serializable form field — strips the React Icon component and
 * registryDependencies before JSON storage in Supabase.
 */
export type SerializedFormField = Omit<FormBuilderField, "Icon" | "registryDependencies">

/**
 * Strip Icon and registryDependencies from fields so they can be stored as JSON.
 */
export function serializeFormFields(fields: FormBuilderField[]): SerializedFormField[] {
  return fields.map(({ Icon: _icon, registryDependencies: _deps, ...rest }) => rest)
}

/**
 * Re-attach the Icon component to deserialized fields from DB.
 * Any field with an unknown type is dropped.
 */
export function deserializeFormFields(serialized: SerializedFormField[]): FormBuilderField[] {
  return serialized
    .filter((f) => f.type in ICON_MAP)
    .map((f) => ({
      ...f,
      Icon: ICON_MAP[f.type as FieldType],
      registryDependencies: formBuilderFields.find((b) => b.type === f.type)?.registryDependencies ?? [],
    })) as FormBuilderField[]
}
