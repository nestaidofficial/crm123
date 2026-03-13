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
  const cleaned = raw.replace(/[\s\-–—]+/g, "").toUpperCase();
  const match = cleaned.match(/^([EC])(\d{1,6})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}
