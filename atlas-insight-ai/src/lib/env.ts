import { z } from "zod";

/**
 * Validação de ambiente com carregamento preguiçoso: o build não exige
 * segredos, mas qualquer acesso em runtime a uma variável ausente falha
 * com mensagem clara em vez de comportamento silencioso.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ENCRYPTION_KEY: z
    .string()
    .min(32, "ENCRYPTION_KEY deve ser base64 de 32 bytes (openssl rand -base64 32)"),
  LLM_PROVIDER: z.enum(["anthropic", "openai", "google"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

type PublicEnv = z.infer<typeof publicSchema>;
type ServerEnv = z.infer<typeof serverSchema>;

let cachedPublic: PublicEnv | null = null;
let cachedServer: ServerEnv | null = null;

export function publicEnv(): PublicEnv {
  if (!cachedPublic) {
    const parsed = publicSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });
    if (!parsed.success) {
      throw new Error(
        `Variáveis de ambiente públicas inválidas: ${parsed.error.issues
          .map((i) => i.path.join("."))
          .join(", ")}`
      );
    }
    cachedPublic = parsed.data;
  }
  return cachedPublic;
}

export function serverEnv(): ServerEnv {
  if (!cachedServer) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Variáveis de ambiente do servidor inválidas: ${parsed.error.issues
          .map((i) => i.path.join("."))
          .join(", ")}`
      );
    }
    cachedServer = parsed.data;
  }
  return cachedServer;
}

/** Apenas para testes. */
export function resetEnvCache(): void {
  cachedPublic = null;
  cachedServer = null;
}
