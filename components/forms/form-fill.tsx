"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, CheckCircle2, Zap } from "lucide-react"
import { toast } from "sonner"

import { deserializeFormFields, type SerializedFormField } from "@/lib/form-builder-serialization"
import { generateZodSchema, generateDefaultValues } from "@/lib/form-builder-schema"
import { renderBuilderField } from "@/components/form-builder/builder-render-field"
import { Form, FormField } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import {
  THEME_PRESETS,
  FONT_FAMILIES,
  getCardBorderRadius,
  getCardBoxShadow,
  getFieldSpacingClass,
  getFormWidthClass,
  getLogoHeight,
  type FormCustomization,
} from "@/types/form-customization"

interface FormFillProps {
  shortId: string
  serializedFields: SerializedFormField[]
  customization: FormCustomization
  token?: string
}

export function FormFill({ shortId, serializedFields, customization, token }: FormFillProps) {
  const [submitted, setSubmitted] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const formFields = React.useMemo(
    () => deserializeFormFields(serializedFields),
    [serializedFields]
  )

  const formSchema = React.useMemo(() => generateZodSchema(formFields), [formFields])
  const defaultValues = React.useMemo(() => generateDefaultValues(formFields), [formFields])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  })

  const theme = THEME_PRESETS.find((t) => t.id === customization.themeId) ?? THEME_PRESETS[0]
  const fontDef = FONT_FAMILIES.find((f) => f.id === customization.fontFamily)
  const fontCss = fontDef?.css ?? "system-ui, sans-serif"
  const widthClass = getFormWidthClass(customization.formWidth)
  const cardBorderRadius = getCardBorderRadius(customization.cardStyle)
  const cardBoxShadow = getCardBoxShadow(customization.cardStyle)
  const spacingClass = getFieldSpacingClass(customization.fieldSpacing)
  const logoHeight = getLogoHeight(customization.logoSize)

  const bgPatternStyle = React.useMemo((): React.CSSProperties => {
    switch (customization.backgroundStyle) {
      case "gradient":
        return { background: `linear-gradient(135deg, ${theme.formBg} 0%, ${theme.cardBg} 100%)` }
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

  const submitBtnStyle = React.useMemo((): React.CSSProperties => {
    switch (customization.submitButtonStyle) {
      case "outline":
        return { background: "transparent", color: theme.accentColor, border: `2px solid ${theme.accentColor}`, borderRadius: "8px" }
      case "pill":
        return { background: theme.accentColor, color: theme.accentText, border: "none", borderRadius: "999px" }
      default:
        return { background: theme.accentColor, color: theme.accentText, border: "none", borderRadius: "8px" }
    }
  }, [customization.submitButtonStyle, theme])

  const logoAlignClass =
    customization.logoPosition === "center"
      ? "justify-center"
      : customization.logoPosition === "right"
      ? "justify-end"
      : "justify-start"

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/forms/public/${shortId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: values,
          token: token ?? undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Submission failed")
      setSubmitted(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: theme.formBg, fontFamily: fontCss }}>
        <div
          className="w-full max-w-md text-center p-10"
          style={{
            backgroundColor: theme.cardBg,
            borderRadius: cardBorderRadius,
            boxShadow: cardBoxShadow,
            border: customization.cardStyle === "bordered" ? `1.5px solid ${theme.borderColor}` : "none",
          }}
        >
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: `${theme.accentColor}18` }}
          >
            <CheckCircle2 className="h-7 w-7" style={{ color: theme.accentColor }} />
          </div>
          <h2 className="text-[20px] font-semibold mb-2" style={{ color: theme.textColor }}>
            Thank you!
          </h2>
          <p className="text-[14px]" style={{ color: theme.mutedColor }}>
            Your response has been submitted successfully.
          </p>
          {customization.showBranding && (
            <div className="flex items-center justify-center gap-1.5 mt-8" style={{ color: theme.mutedColor }}>
              <Zap className="h-3 w-3" />
              <span className="text-[11px]">Powered by Nessa CRM</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ ...bgPatternStyle, fontFamily: fontCss }}>
      <div className={`mx-auto w-full ${widthClass}`}>
        <div
          style={{
            backgroundColor: theme.cardBg,
            borderRadius: cardBorderRadius,
            boxShadow: cardBoxShadow,
            border: customization.cardStyle === "bordered" ? `1.5px solid ${theme.borderColor}` : "none",
            overflow: "hidden",
          }}
        >
          {/* Progress bar placeholder */}
          {customization.showProgressBar && (
            <div className="h-1" style={{ background: `linear-gradient(to right, ${theme.accentColor} 0%, ${theme.borderColor} 0%)` }} />
          )}

          {/* Form header */}
          <div className="px-10 pt-8 pb-4" style={{ borderBottom: `1px solid ${theme.borderColor}` }}>
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
            <h1 className="font-semibold leading-tight" style={{ color: theme.textColor, fontSize: "22px" }}>
              {customization.formTitle || "Untitled Form"}
            </h1>
            {customization.formDescription && (
              <p className="mt-1.5 text-[14px]" style={{ color: theme.mutedColor }}>
                {customization.formDescription}
              </p>
            )}
          </div>

          {/* Fields */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={`flex flex-col ${spacingClass} px-10 py-6`}
              style={{ color: theme.textColor }}
            >
              {formFields.map((formField, index) => (
                <div key={formField.name ?? index} className="relative">
                  {customization.showFieldNumbers && (
                    <span
                      className="absolute -left-5 top-2 text-[12px] font-semibold tabular-nums"
                      style={{ color: theme.accentColor }}
                    >
                      {index + 1}
                    </span>
                  )}
                  <FormField
                    control={form.control}
                    name={formField.name}
                    render={({ field }) =>
                      renderBuilderField({ formField, field }) ?? <></>
                    }
                  />
                </div>
              ))}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={submitBtnStyle}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {customization.submitButtonText || "Submit"}
                </button>
              </div>
            </form>
          </Form>

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
    </div>
  )
}
