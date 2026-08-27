"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${publicEnv().NEXT_PUBLIC_APP_URL}/reset-password`,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setDone(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          {done
            ? `Se existir uma conta para ${email}, você receberá um link de redefinição.`
            : "Informe seu e-mail e enviaremos um link para redefinir a senha."}
        </CardDescription>
      </CardHeader>
      {!done && (
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
              />
            </div>
            {error && (
              <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando…" : "Enviar link"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink-muted">
            <Link href="/login" className="text-accent hover:underline">
              Voltar para o login
            </Link>
          </p>
        </CardContent>
      )}
    </Card>
  );
}
