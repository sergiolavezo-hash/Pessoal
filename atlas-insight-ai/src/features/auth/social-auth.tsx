"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Entrada por provedor social.
 *
 * Os botões só aparecem para os provedores listados em
 * NEXT_PUBLIC_AUTH_PROVIDERS (ex.: "google" ou "google,azure"). Sem a
 * variável, nada é renderizado — um botão de um provedor que não foi
 * configurado no Supabase só produziria erro na cara do usuário.
 *
 * O retorno cai em /auth/callback, que já troca o código pela sessão.
 */

type ProviderId = "google" | "azure";

const PROVIDERS: Record<ProviderId, { label: string; icon: React.ReactNode }> = {
  google: {
    label: "Continuar com Google",
    icon: (
      <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden focusable="false">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
      </svg>
    ),
  },
  azure: {
    label: "Continuar com Microsoft",
    icon: (
      <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden focusable="false">
        <path fill="#F25022" d="M0 0h8.5v8.5H0z" />
        <path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z" />
        <path fill="#00A4EF" d="M0 9.5h8.5V18H0z" />
        <path fill="#FFB900" d="M9.5 9.5H18V18H9.5z" />
      </svg>
    ),
  },
};

function enabledProviders(): ProviderId[] {
  return (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is ProviderId => p in PROVIDERS);
}

export function SocialAuth({ next = "/dashboard" }: { next?: string }) {
  const [pending, setPending] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const providers = enabledProviders();

  if (providers.length === 0) return null;

  async function signIn(provider: ProviderId) {
    setError(null);
    setPending(provider);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // Em caso de sucesso o navegador já saiu daqui; só o erro volta.
    if (oauthError) {
      setError(oauthError.message);
      setPending(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-4 space-y-2">
        {providers.map((id) => (
          <Button
            key={id}
            type="button"
            variant="outline"
            className="w-full"
            loading={pending === id}
            disabled={pending !== null && pending !== id}
            onClick={() => signIn(id)}
          >
            {pending !== id && PROVIDERS[id].icon}
            {PROVIDERS[id].label}
          </Button>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
