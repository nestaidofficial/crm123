import { z } from "zod";

/**
 * Environment schema. Required vars are validated at build/startup;
 * missing or invalid env fails fast with a clear Zod error.
 */
const envSchema = z.object({
  /** Public app URL (links, redirects). Set in .env.local or platform env. */
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .optional(),

  // --- Phase 2 (Database) – Supabase ---
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // --- Phase 3 (Auth) – optional for now ---
  // NEXTAUTH_SECRET: z.string().min(32).optional(),
  // NEXTAUTH_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const message = [
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    ]
      .flat()
      .join("\n");
    throw new Error(message);
  }

  return parsed.data;
}

/** Validated, typed config. Use this instead of process.env in app code. */
export const env = validateEnv();
