import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/** Cliente vinculado à sessão do usuário (respeita RLS). */
export function createClient() {
  const env = publicEnv();
  const cookieStore = cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado a partir de um Server Component: o middleware
          // renova a sessão, então ignorar é seguro.
        }
      },
    },
  });
}

/**
 * Cliente de serviço (ignora RLS). Uso EXCLUSIVO em rotas de servidor
 * confiáveis: webhooks de billing e leitura/escrita de credenciais
 * cifradas. Jamais importar em código acessível ao cliente.
 */
export function createServiceClient() {
  const env = serverEnv();
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
