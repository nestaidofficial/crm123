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
import { Loader2, Save, Send, Trash2, Zap, Globe, Check } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { shallow } from "zustand/shallow"
import { toast } from "sonner"

import { generateDefaultValues, generateZodSchema } from "@/lib/form-builder-schema"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { BuilderField } from "@/components/form-builder/builder-field"
import { BuilderSortableField } from "@/components/form-builder/builder-sortable-field"
import { SendFormDialog } from "@/components/forms/send-form-dialog"
import {
  FONT_FAMILIES,
  THEME_PRESETS,
  getCardBorderRadius,
  getCardBoxShadow,
  getFieldSpacingClass,
  getFormWidthClass,
  getLogoHeight,
} from "@/types/form-customization"

import { FormBuilderField } from "@/types/form-builder-field"
import { FormBuilderState } from "@/types/form-builder-store"
import { useAuthStore } from "@/store/useAuthStore"

const selector = (state: FormBuilderState) => ({
  formId: state.formId,
  formShortId: state.formShortId,
  setFormId: state.setFormId,
  setFormShortId: state.setFormShortId,
  formFields: state.formFields,
  setFormFields: state.setFormFields,
  clearFormFields: state.clearFormFields,
  customization: state.customization,
})

export function BuilderFormEditor() {
  const [activeFormField, setActiveFormField] =
    React.useState<FormBuilderField | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [isSendOpen, setIsSendOpen] = React.useState(false)

  const {
    formId,
    formShortId,
    setFormId,
    setFormShortId,
    formFields,
    setFormFields,
    clearFormFields,
    customization,
  } = useFormBuilderStore(selector, shallow)

  const { currentAgencyId } = useAuthStore()

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

  const handleSaveDraft = async () => {
    if (!currentAgencyId) {
      toast.error("No agency selected.")
      return
    }
    setIsSaving(true)
    try {
      const isNew = !formId
      const url = isNew ? "/api/forms" : `/api/forms/${formId}`
      const method = isNew ? "POST" : "PUT"
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-agency-id": currentAgencyId,
        },
        body: JSON.stringify({
          title: customization.formTitle || "Untitled Form",
          description: customization.formDescription,
          fields: formFields,
          customization,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Save failed")
      if (isNew) setFormId(json.data.id)
      toast.success("Draft saved.")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save.")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!currentAgencyId) {
      toast.error("No agency selected.")
      return
    }
    setIsPublishing(true)
    try {
      // Save first if needed
      let id = formId
      if (!id) {
        const res = await fetch("/api/forms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-agency-id": currentAgencyId,
          },
          body: JSON.stringify({
            title: customization.formTitle || "Untitled Form",
            description: customization.formDescription,
            fields: formFields,
            customization,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Save failed")
        id = json.data.id
        setFormId(id)
      } else {
        // Update existing
        await fetch(`/api/forms/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-agency-id": currentAgencyId,
          },
          body: JSON.stringify({
            title: customization.formTitle || "Untitled Form",
            description: customization.formDescription,
            fields: formFields,
            customization,
          }),
        })
      }

      // Publish
      const pubRes = await fetch(`/api/forms/${id}/publish`, {
        method: "POST",
        headers: { "x-agency-id": currentAgencyId },
      })
      const pubJson = await pubRes.json()
      if (!pubRes.ok) throw new Error(pubJson.error ?? "Publish failed")
      setFormShortId(pubJson.data.short_id)
      toast.success("Form published! Share link is ready.")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to publish.")
    } finally {
      setIsPublishing(false)
    }
  }

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

  // Resolve theme
  const theme = THEME_PRESETS.find((t) => t.id === customization.themeId) ?? THEME_PRESETS[0]
  const fontDef = FONT_FAMILIES.find((f) => f.id === customization.fontFamily)
  const fontCss = fontDef?.css ?? "system-ui, sans-serif"

  // Width class
  const widthClass = getFormWidthClass(customization.formWidth)

  // Card styles
  const cardBorderRadius = getCardBorderRadius(customization.cardStyle)
  const cardBoxShadow = getCardBoxShadow(customization.cardStyle)

  // Field spacing
  const spacingClass = getFieldSpacingClass(customization.fieldSpacing)

  // Logo height
  const logoHeight = getLogoHeight(customization.logoSize)

  // Background overlay pattern
  const bgPatternStyle = React.useMemo((): React.CSSProperties => {
    switch (customization.backgroundStyle) {
      case "gradient":
        return {
          background: `linear-gradient(135deg, ${theme.formBg} 0%, ${theme.cardBg} 100%)`,
        }
      case "dots":
        return {
          backgroundColor: theme.formBg,
          backgroundImage: `radial-gradient(${theme.borderColor} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }
      case "lines":
        return {
          backgroundColor: theme.formBg,
          backgroundImage: `repeating-linear-gradient(0deg, ${theme.borderColor}, ${theme.borderColor} 1px, transparent 1px, transparent 28px)`,
        }
      default:
        return { backgroundColor: theme.formBg }
    }
  }, [customization.backgroundStyle, theme])

  // Submit button styles
  const submitBtnStyle = React.useMemo((): React.CSSProperties => {
    switch (customization.submitButtonStyle) {
      case "outline":
        return {
          background: "transparent",
          color: theme.accentColor,
          border: `2px solid ${theme.accentColor}`,
          borderRadius: "8px",
        }
      case "pill":
        return {
          background: theme.accentColor,
          color: theme.accentText,
          border: "none",
          borderRadius: "999px",
        }
      default:
        return {
          background: theme.accentColor,
          color: theme.accentText,
          border: "none",
          borderRadius: "8px",
        }
    }
  }, [customization.submitButtonStyle, theme])

  const logoAlignClass =
    customization.logoPosition === "center"
      ? "justify-center"
      : customization.logoPosition === "right"
      ? "justify-end"
      : "justify-start"

  return (
    <div className="flex-1 overflow-x-hidden px-4 py-6">
      {/* Outer browser-chrome wrapper */}
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-neutral-200 shadow-md overflow-hidden bg-white">
        {/* Browser chrome bar */}
        <div className="flex items-center gap-1.5 border-b border-neutral-100 px-4 py-3 bg-neutral-50">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          {/* URL bar mock */}
          <div className="ml-3 flex-1 max-w-xs h-6 rounded-md bg-neutral-100 border border-neutral-200/60 flex items-center px-2.5 gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            <span className="text-[11px] text-neutral-400 font-mono truncate">
              {formShortId
                ? `${window.location.origin}/f/${formShortId}`
                : "forms.nessacrm.com/preview"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={clearFormFields}
              variant="outline"
              className="gap-1.5 h-7 text-xs"
            >
              <Trash2 className="size-3" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDraft}
              variant="outline"
              className="gap-1.5 h-7 text-xs"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Save className="size-3" />
              )}
              Save
            </Button>
            {formShortId ? (
              <Button
                size="sm"
                onClick={() => setIsSendOpen(true)}
                className="gap-1.5 h-7 text-xs bg-neutral-900 hover:bg-neutral-800 text-white"
              >
                <Send className="size-3" />
                Send
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handlePublish}
                className="gap-1.5 h-7 text-xs bg-neutral-900 hover:bg-neutral-800 text-white"
                disabled={isPublishing || formFields.length === 0}
              >
                {isPublishing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Globe className="size-3" />
                )}
                Publish
              </Button>
            )}
            {formShortId && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePublish}
                className="gap-1.5 h-7 text-xs"
                disabled={isPublishing}
                title="Re-publish to update the live form"
              >
                {isPublishing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3 text-green-500" />
                )}
                Published
              </Button>
            )}
          </div>
        </div>

        {/* Send dialog */}
        {currentAgencyId && formId && (
          <SendFormDialog
            open={isSendOpen}
            onOpenChange={setIsSendOpen}
            formId={formId}
            formTitle={customization.formTitle || "Untitled Form"}
            shortId={formShortId}
            agencyId={currentAgencyId}
          />
        )}

        {/* Form preview area */}
        <div
          className="min-h-[500px] py-10 px-6 transition-all"
          style={bgPatternStyle}
        >
          <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <div
              className={`mx-auto w-full ${widthClass} transition-all`}
              style={{ fontFamily: fontCss }}
            >
              {/* Form card */}
              <div
                style={{
                  backgroundColor: theme.cardBg,
                  borderRadius: cardBorderRadius,
                  boxShadow: cardBoxShadow,
                  border: customization.cardStyle === "bordered" ? `1.5px solid ${theme.borderColor}` : "none",
                  overflow: "hidden",
                }}
              >
                {/* Progress bar */}
                {customization.showProgressBar && (
                  <div
                    className="h-1 transition-all"
                    style={{
                      background: `linear-gradient(to right, ${theme.accentColor} ${formFields.length > 0 ? 30 : 0}%, ${theme.borderColor} ${formFields.length > 0 ? 30 : 0}%)`,
                    }}
                  />
                )}

                {/* Form header */}
                <div
                  className="px-14 pt-8 pb-4"
                  style={{ borderBottom: `1px solid ${theme.borderColor}` }}
                >
                  {/* Logo */}
                  {customization.logoUrl && (
                    <div className={`flex ${logoAlignClass} mb-5`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={customization.logoUrl}
                        alt="Brand logo"
                        style={{ height: logoHeight, width: "auto", objectFit: "contain" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    </div>
                  )}

                  {/* Title */}
                  <h1
                    className="font-semibold leading-tight"
                    style={{ color: theme.textColor, fontSize: "22px" }}
                  >
                    {customization.formTitle || "Untitled Form"}
                  </h1>

                  {/* Description */}
                  {customization.formDescription && (
                    <p className="mt-1.5 text-[14px]" style={{ color: theme.mutedColor }}>
                      {customization.formDescription}
                    </p>
                  )}
                </div>

                {/* Fields */}
                {formFields.length !== 0 ? (
                  <Form {...form}>
                    <form
                      className={`flex flex-col ${spacingClass} px-14 py-6`}
                      style={{ color: theme.textColor }}
                    >
                      <SortableContext
                        items={formFields.map((formField: FormBuilderField) => formField.name)}
                        strategy={verticalListSortingStrategy}
                      >
                        {formFields.map((formField: FormBuilderField, index) => (
                          <div key={formField.name} className="relative">
                            {customization.showFieldNumbers && (
                              <span
                                className="absolute -left-5 top-2 text-[12px] font-semibold tabular-nums"
                                style={{ color: theme.accentColor }}
                              >
                                {index + 1}
                              </span>
                            )}
                            <BuilderSortableField
                              formField={formField}
                              form={form as any}
                            />
                          </div>
                        ))}
                      </SortableContext>
                      <DragOverlay className="bg-background">
                        {activeFormField ? (
                          <BuilderField formField={activeFormField} />
                        ) : null}
                      </DragOverlay>

                      {/* Submit button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-2.5 text-[14px] font-semibold transition-opacity hover:opacity-90"
                          style={submitBtnStyle}
                        >
                          {customization.submitButtonText || "Submit"}
                        </button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-8 gap-3">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center"
                      style={{ background: `${theme.accentColor}15` }}
                    >
                      <Zap className="h-5 w-5" style={{ color: theme.accentColor }} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-[15px]" style={{ color: theme.textColor }}>
                        No fields yet
                      </h3>
                      <p className="text-[13px] mt-0.5" style={{ color: theme.mutedColor }}>
                        Switch to the Fields tab and click a field type to add it.
                      </p>
                    </div>
                  </div>
                )}

                {/* Branding footer */}
                {customization.showBranding && (
                  <div
                    className="flex items-center justify-center gap-1.5 py-3"
                    style={{ borderTop: `1px solid ${theme.borderColor}` }}
                  >
                    <Zap className="h-3 w-3" style={{ color: theme.mutedColor }} />
                    <span className="text-[11px]" style={{ color: theme.mutedColor }}>
                      Powered by Nessa CRM
                    </span>
                  </div>
                )}
              </div>
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  )
}
