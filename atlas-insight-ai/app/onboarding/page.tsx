"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const slug = slugify(orgName);
    if (slug.length < 2) {
      setError("Informe um nome válido para a organização.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("create_organization", {
      org_name: orgName.trim(),
      org_slug: slug,
      ws_name: "Principal",
    });
    setLoading(false);
    if (rpcError) {
      setError(
        rpcError.message.includes("duplicate")
          ? "Já existe uma organização com esse nome — tente outro."
          : rpcError.message
      );
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="auth-grid pointer-events-none absolute inset-0" aria-hidden />
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <CardTitle>Bem-vindo ao Atlas Insight AI</CardTitle>
          <CardDescription>
            Crie sua organização para começar. Seu teste gratuito de 14 dias (ou 1 execução de
            dashboard) começa agora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Nome da empresa</Label>
              <Input
                id="orgName"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Ex.: Atlas Tecnologia"
              />
            </div>
            {error && (
              <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando…" : "Criar organização"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
