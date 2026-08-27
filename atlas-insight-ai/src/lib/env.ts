import { z } from "zod";

/**
 * Server-side environment validation. Import only from server code.
 * Values are read lazily so that build-time evaluation (e.g. `next build`
 * without a configured environment) does not crash.
 */
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  LLM_PROVIDER: z.enum(["anthropic", "openai", "google"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  GOOGLE_AI_MODEL: z.string().optional(),
  QUERY_TIMEOUT_MS: z.coerce.number().default(30_000),
  QUERY_MAX_ROWS: z.coerce.number().default(10_000),
  // Transactional email (welcome / signup notifications). Optional: when
  // absent, sending is skipped gracefully.
  RESEND_API_KEY: z.string().optional(),
  // Billing (Stripe). Optional: checkout returns a friendly 503 when absent.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SIGNUP_NOTIFY_ENDPOINT: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid server environment: ${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function publicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
