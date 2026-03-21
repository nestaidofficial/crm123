export type ThemePreset = {
  id: string
  name: string
  swatch: string
  formBg: string
  cardBg: string
  borderColor: string
  textColor: string
  mutedColor: string
  accentColor: string
  accentText: string
  inputBg: string
  labelColor: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Default",
    swatch: "#171717",
    formBg: "#f9fafb",
    cardBg: "#ffffff",
    borderColor: "#e5e7eb",
    textColor: "#111827",
    mutedColor: "#6b7280",
    accentColor: "#171717",
    accentText: "#ffffff",
    inputBg: "#ffffff",
    labelColor: "#374151",
  },
  {
    id: "ocean",
    name: "Ocean",
    swatch: "#0284c7",
    formBg: "#f0f9ff",
    cardBg: "#ffffff",
    borderColor: "#bae6fd",
    textColor: "#0c4a6e",
    mutedColor: "#0369a1",
    accentColor: "#0284c7",
    accentText: "#ffffff",
    inputBg: "#f0f9ff",
    labelColor: "#075985",
  },
  {
    id: "forest",
    name: "Forest",
    swatch: "#16a34a",
    formBg: "#f0fdf4",
    cardBg: "#ffffff",
    borderColor: "#bbf7d0",
    textColor: "#14532d",
    mutedColor: "#15803d",
    accentColor: "#16a34a",
    accentText: "#ffffff",
    inputBg: "#f0fdf4",
    labelColor: "#166534",
  },
  {
    id: "sunset",
    name: "Sunset",
    swatch: "#ea580c",
    formBg: "#fff7ed",
    cardBg: "#ffffff",
    borderColor: "#fed7aa",
    textColor: "#431407",
    mutedColor: "#c2410c",
    accentColor: "#ea580c",
    accentText: "#ffffff",
    inputBg: "#fff7ed",
    labelColor: "#9a3412",
  },
  {
    id: "lavender",
    name: "Lavender",
    swatch: "#7c3aed",
    formBg: "#faf5ff",
    cardBg: "#ffffff",
    borderColor: "#ddd6fe",
    textColor: "#2e1065",
    mutedColor: "#6d28d9",
    accentColor: "#7c3aed",
    accentText: "#ffffff",
    inputBg: "#faf5ff",
    labelColor: "#5b21b6",
  },
  {
    id: "rose",
    name: "Rose",
    swatch: "#e11d48",
    formBg: "#fff1f2",
    cardBg: "#ffffff",
    borderColor: "#fecdd3",
    textColor: "#4c0519",
    mutedColor: "#be123c",
    accentColor: "#e11d48",
    accentText: "#ffffff",
    inputBg: "#fff1f2",
    labelColor: "#9f1239",
  },
  {
    id: "midnight",
    name: "Midnight",
    swatch: "#1e293b",
    formBg: "#0f172a",
    cardBg: "#1e293b",
    borderColor: "#334155",
    textColor: "#f1f5f9",
    mutedColor: "#94a3b8",
    accentColor: "#6366f1",
    accentText: "#ffffff",
    inputBg: "#1e293b",
    labelColor: "#cbd5e1",
  },
  {
    id: "slate",
    name: "Slate",
    swatch: "#475569",
    formBg: "#f8fafc",
    cardBg: "#ffffff",
    borderColor: "#cbd5e1",
    textColor: "#0f172a",
    mutedColor: "#64748b",
    accentColor: "#475569",
    accentText: "#ffffff",
    inputBg: "#f8fafc",
    labelColor: "#334155",
  },
]

export type FontFamily = "inter" | "system" | "serif" | "mono" | "elegant"

export const FONT_FAMILIES: { id: FontFamily; name: string; sample: string; css: string }[] = [
  { id: "inter", name: "Inter", sample: "Aa", css: "'Inter', sans-serif" },
  { id: "system", name: "System", sample: "Aa", css: "system-ui, sans-serif" },
  { id: "serif", name: "Georgia", sample: "Aa", css: "Georgia, serif" },
  { id: "mono", name: "Mono", sample: "Aa", css: "'Courier New', monospace" },
  { id: "elegant", name: "Playfair", sample: "Aa", css: "'Playfair Display', serif" },
]

export type FormWidth = "narrow" | "medium" | "wide"
export type CardStyle = "elevated" | "bordered" | "flat" | "rounded"
export type FieldSpacing = "compact" | "normal" | "relaxed"
export type LogoPosition = "left" | "center" | "right"
export type LogoSize = "small" | "medium" | "large"
export type ButtonStyle = "solid" | "outline" | "pill"
export type BackgroundStyle = "solid" | "gradient" | "dots" | "lines"

export type FormCustomization = {
  logoUrl?: string
  logoPosition: LogoPosition
  logoSize: LogoSize
  formTitle: string
  formDescription?: string
  themeId: string
  formWidth: FormWidth
  cardStyle: CardStyle
  fieldSpacing: FieldSpacing
  fontFamily: FontFamily
  submitButtonText: string
  submitButtonStyle: ButtonStyle
  backgroundStyle: BackgroundStyle
  showFieldNumbers: boolean
  showProgressBar: boolean
  showBranding: boolean
}

export const DEFAULT_CUSTOMIZATION: FormCustomization = {
  logoUrl: undefined,
  logoPosition: "left",
  logoSize: "medium",
  formTitle: "Untitled Form",
  formDescription: "",
  themeId: "default",
  formWidth: "medium",
  cardStyle: "elevated",
  fieldSpacing: "normal",
  fontFamily: "inter",
  submitButtonText: "Submit",
  submitButtonStyle: "solid",
  backgroundStyle: "solid",
  showFieldNumbers: false,
  showProgressBar: false,
  showBranding: true,
}

export function getFormWidthClass(width: FormWidth): string {
  switch (width) {
    case "narrow": return "max-w-lg"
    case "medium": return "max-w-2xl"
    case "wide": return "max-w-4xl"
  }
}

export function getFieldSpacingClass(spacing: FieldSpacing): string {
  switch (spacing) {
    case "compact": return "gap-3"
    case "normal": return "gap-6"
    case "relaxed": return "gap-10"
  }
}

export function getCardBorderRadius(style: CardStyle): string {
  switch (style) {
    case "flat": return "0px"
    case "bordered": return "8px"
    case "elevated": return "12px"
    case "rounded": return "24px"
  }
}

export function getCardBoxShadow(style: CardStyle): string {
  switch (style) {
    case "flat": return "none"
    case "bordered": return "none"
    case "elevated": return "0 4px 24px 0 rgba(0,0,0,0.08)"
    case "rounded": return "0 8px 32px 0 rgba(0,0,0,0.10)"
  }
}

export function getLogoHeight(size: LogoSize): number {
  switch (size) {
    case "small": return 32
    case "medium": return 48
    case "large": return 64
  }
}
