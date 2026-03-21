"use client"

import * as React from "react"
import { useFormBuilderStore } from "@/stores/form-builder"
import { shallow } from "zustand/shallow"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  Image,
  Monitor,
  RotateCcw,
  Type,
  Upload,
  X,
} from "lucide-react"

import {
  FONT_FAMILIES,
  THEME_PRESETS,
  type BackgroundStyle,
  type ButtonStyle,
  type CardStyle,
  type FieldSpacing,
  type FontFamily,
  type FormWidth,
  type LogoPosition,
  type LogoSize,
} from "@/types/form-customization"
import { FormBuilderState } from "@/types/form-builder-store"
import { cn } from "@/lib/utils"

const selector = (state: FormBuilderState) => ({
  customization: state.customization,
  updateCustomization: state.updateCustomization,
  resetCustomization: state.resetCustomization,
})

type Section = "branding" | "theme" | "layout" | "typography" | "button" | "extras"

export function BuilderDesignPanel() {
  const { customization, updateCustomization, resetCustomization } =
    useFormBuilderStore(selector, shallow)

  const [openSections, setOpenSections] = React.useState<Section[]>(["branding", "theme"])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function toggleSection(section: Section) {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      updateCustomization({ logoUrl: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    updateCustomization({ logoUrl: undefined })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const activeTheme = THEME_PRESETS.find((t) => t.id === customization.themeId) ?? THEME_PRESETS[0]

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 pt-[26px] pb-2.5">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">
          Design
        </span>
        <button
          onClick={resetCustomization}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Sections — flat list separated by dividers */}
      <div className="pb-6">
        {/* ── BRANDING ── */}
        <Section
          label="Branding"
          icon={<Image className="h-3.5 w-3.5" />}
          open={openSections.includes("branding")}
          onToggle={() => toggleSection("branding")}
        >
          <Field label="Form title">
            <input
              type="text"
              value={customization.formTitle}
              onChange={(e) => updateCustomization({ formTitle: e.target.value })}
              placeholder="Untitled Form"
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={customization.formDescription ?? ""}
              onChange={(e) => updateCustomization({ formDescription: e.target.value })}
              placeholder="Add a short description…"
              rows={2}
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 resize-none transition"
            />
          </Field>

          <Field label="Brand logo">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {!customization.logoUrl ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-md border border-dashed border-neutral-300 py-4 text-[12px] text-neutral-400 hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition flex flex-col items-center gap-1.5"
              >
                <Upload className="h-4 w-4" />
                Upload logo
                <span className="text-[11px]">PNG, JPG, SVG</span>
              </button>
            ) : (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2.5">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={customization.logoUrl}
                    alt="Brand logo"
                    className="h-11 w-auto max-w-[88px] object-contain rounded-sm"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-neutral-700 leading-none">Logo uploaded</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-neutral-400 hover:text-neutral-600 transition mt-0.5"
                    >
                      Replace
                    </button>
                  </div>
                  <button onClick={removeLogo} className="shrink-0 hover:bg-neutral-200 rounded p-1 transition">
                    <X className="h-3.5 w-3.5 text-neutral-400" />
                  </button>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-neutral-200 flex gap-2">
                  <div className="flex-1">
                    <span className="block text-[11px] text-neutral-400 mb-1">Position</span>
                    <SegmentedControl>
                      {(["left", "center", "right"] as LogoPosition[]).map((pos) => {
                        const Icon = pos === "left" ? AlignLeft : pos === "center" ? AlignCenter : AlignRight
                        return (
                          <SegBtn
                            key={pos}
                            active={customization.logoPosition === pos}
                            onClick={() => updateCustomization({ logoPosition: pos })}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </SegBtn>
                        )
                      })}
                    </SegmentedControl>
                  </div>
                  <div className="flex-1">
                    <span className="block text-[11px] text-neutral-400 mb-1">Size</span>
                    <SegmentedControl>
                      {(["S", "M", "L"] as const).map((s, i) => {
                        const sizes = ["small", "medium", "large"] as LogoSize[]
                        return (
                          <SegBtn
                            key={s}
                            active={customization.logoSize === sizes[i]}
                            onClick={() => updateCustomization({ logoSize: sizes[i] })}
                          >
                            {s}
                          </SegBtn>
                        )
                      })}
                    </SegmentedControl>
                  </div>
                </div>
              </div>
            )}
          </Field>
        </Section>

        {/* ── THEME ── */}
        <Section
          label="Theme"
          icon={<div className="h-3 w-3 rounded-sm" style={{ background: activeTheme.accentColor }} />}
          open={openSections.includes("theme")}
          onToggle={() => toggleSection("theme")}
        >
          <div className="grid grid-cols-4 gap-2">
            {THEME_PRESETS.map((theme) => {
              const isActive = customization.themeId === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => updateCustomization({ themeId: theme.id })}
                  className="flex flex-col items-center gap-1.5 group"
                  title={theme.name}
                >
                  {/* Swatch tile — outline sits outside, zero overlap */}
                  <div
                    className="w-full rounded-sm overflow-hidden transition-all"
                    style={{
                      outline: isActive ? "2px solid #a3a3a3" : "2px solid transparent",
                      outlineOffset: "2px",
                    }}
                  >
                    {/* Top: form background */}
                    <div
                      className="h-6 w-full"
                      style={{ background: theme.formBg }}
                    />
                    {/* Bottom: accent color bar */}
                    <div
                      className="h-2.5 w-full"
                      style={{ background: theme.accentColor }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] leading-none transition-colors",
                      isActive ? "text-neutral-900 font-medium" : "text-neutral-400 group-hover:text-neutral-600"
                    )}
                  >
                    {theme.name}
                  </span>
                </button>
              )
            })}
          </div>

          <Field label="Background">
            <div className="grid grid-cols-4 gap-1">
              {(["solid", "gradient", "dots", "lines"] as BackgroundStyle[]).map((bg) => (
                <button
                  key={bg}
                  onClick={() => updateCustomization({ backgroundStyle: bg })}
                  className={cn(
                    "py-1.5 rounded-md border text-[11px] capitalize transition-colors",
                    customization.backgroundStyle === bg
                      ? "border-neutral-300 bg-neutral-100 text-neutral-800 font-medium"
                      : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  )}
                >
                  {bg}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* ── LAYOUT ── */}
        <Section
          label="Layout"
          icon={<Monitor className="h-3.5 w-3.5" />}
          open={openSections.includes("layout")}
          onToggle={() => toggleSection("layout")}
        >
          <Field label="Width">
            <SegmentedControl>
              {(["narrow", "medium", "wide"] as FormWidth[]).map((w) => (
                <SegBtn
                  key={w}
                  active={customization.formWidth === w}
                  onClick={() => updateCustomization({ formWidth: w })}
                >
                  {w}
                </SegBtn>
              ))}
            </SegmentedControl>
          </Field>

          <Field label="Card style">
            <div className="grid grid-cols-4 gap-1">
              {(["flat", "bordered", "elevated", "rounded"] as CardStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => updateCustomization({ cardStyle: style })}
                  className={cn(
                    "py-1.5 rounded-md border text-[11px] capitalize transition-colors",
                    customization.cardStyle === style
                      ? "border-neutral-300 bg-neutral-100 text-neutral-800 font-medium"
                      : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Spacing">
            <SegmentedControl>
              {(["compact", "normal", "relaxed"] as FieldSpacing[]).map((sp) => (
                <SegBtn
                  key={sp}
                  active={customization.fieldSpacing === sp}
                  onClick={() => updateCustomization({ fieldSpacing: sp })}
                >
                  {sp}
                </SegBtn>
              ))}
            </SegmentedControl>
          </Field>
        </Section>

        {/* ── TYPOGRAPHY ── */}
        <Section
          label="Typography"
          icon={<Type className="h-3.5 w-3.5" />}
          open={openSections.includes("typography")}
          onToggle={() => toggleSection("typography")}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {FONT_FAMILIES.map((font) => (
              <button
                key={font.id}
                onClick={() => updateCustomization({ fontFamily: font.id as FontFamily })}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md border py-2.5 transition-all",
                  customization.fontFamily === font.id
                    ? "border-neutral-300 bg-neutral-100 text-neutral-800"
                    : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                )}
              >
                <span
                  className="text-lg font-medium leading-none"
                  style={{ fontFamily: font.css }}
                >
                  {font.sample}
                </span>
                <span className="text-[10px] mt-0.5 opacity-60">{font.name}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── SUBMIT BUTTON ── */}
        <Section
          label="Submit button"
          icon={<div className="h-2.5 w-5 rounded-sm bg-neutral-400" />}
          open={openSections.includes("button")}
          onToggle={() => toggleSection("button")}
        >
          <Field label="Button text">
            <input
              type="text"
              value={customization.submitButtonText}
              onChange={(e) => updateCustomization({ submitButtonText: e.target.value })}
              placeholder="Submit"
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition"
            />
          </Field>

          <Field label="Style">
            <SegmentedControl>
              {(["solid", "outline", "pill"] as ButtonStyle[]).map((style) => (
                <SegBtn
                  key={style}
                  active={customization.submitButtonStyle === style}
                  onClick={() => updateCustomization({ submitButtonStyle: style })}
                >
                  {style}
                </SegBtn>
              ))}
            </SegmentedControl>
          </Field>
        </Section>

        {/* ── EXTRAS ── */}
        <Section
          label="Extras"
          icon={<div className="h-3.5 w-3.5 rounded-sm border border-neutral-400" />}
          open={openSections.includes("extras")}
          onToggle={() => toggleSection("extras")}
        >
          <div className="divide-y divide-neutral-100">
            <ToggleRow
              label="Field numbers"
              description="Show 1, 2, 3… before each field"
              checked={customization.showFieldNumbers}
              onChange={(v) => updateCustomization({ showFieldNumbers: v })}
            />
            <ToggleRow
              label="Progress bar"
              description="Display progress at the top"
              checked={customization.showProgressBar}
              onChange={(v) => updateCustomization({ showProgressBar: v })}
            />
            <ToggleRow
              label="Powered by Nessa"
              description="Show branding in footer"
              checked={customization.showBranding}
              onChange={(v) => updateCustomization({ showBranding: v })}
            />
          </div>
        </Section>
      </div>
    </div>
  )
}

/* ── Primitives ── */

function Section({
  label,
  icon,
  open,
  onToggle,
  children,
}: {
  label: string
  icon: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-neutral-100 first:border-t-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left"
      >
        <span className="text-neutral-400 flex items-center">{icon}</span>
        <span className="flex-1 text-[12px] font-medium text-neutral-700">{label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-neutral-300 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-[11px] text-neutral-400 mb-1">{label}</span>
      {children}
    </div>
  )
}

function SegmentedControl({ children }: { children: React.ReactNode }) {
  const kids = React.Children.toArray(children)
  return (
    <div className="flex h-7 border border-neutral-200 rounded overflow-hidden bg-white">
      {kids.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className="w-px shrink-0 bg-neutral-200" />}
          {child}
        </React.Fragment>
      ))}
    </div>
  )
}

type SegBtnProps = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function SegBtn({ active, onClick, children }: SegBtnProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1 h-full text-[12px] capitalize transition-colors",
        active ? "bg-neutral-100 text-neutral-800 font-medium" : "bg-white text-neutral-500 hover:bg-neutral-50"
      )}
    >
      {children}
    </button>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-neutral-700 leading-none">{label}</p>
        <p className="text-[11px] text-neutral-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative shrink-0 h-5 w-9 rounded-full transition-colors",
          checked ? "bg-neutral-400" : "bg-neutral-200"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  )
}
