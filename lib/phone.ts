/**
 * Normalize a phone number string to E.164 format (+1XXXXXXXXXX).
 * Handles common US formats: (555) 123-4567, 555-123-4567, +15551234567, etc.
 */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+${digits}`;
}
