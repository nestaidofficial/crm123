import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize spoken short-ID variants into canonical format: E-1005, C-42, etc.
 * Handles: "e1005", "E 1005", "e-1005", "E–1005", "E - 1005", "E1005"
 */
export function normalizeShortId(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-\u2013\u2014]+/g, "").toUpperCase();
  const match = cleaned.match(/^([EC])(.+)$/);
  if (!match) return null;
  const prefix = match[1];
  let digits = match[2]
    .replace(/O/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/G/g, "6");
  digits = digits.replace(/\D+$/, "");
  if (!/^\d{1,6}$/.test(digits)) return null;
  return `${prefix}-${digits}`;
}
