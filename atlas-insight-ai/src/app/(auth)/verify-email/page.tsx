"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_S = 60;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  // Quem chegou aqui pelo link quebrado do e-mail precisa entender por quê,
  // em vez de ver a tela de código sem explicação.
  const reason = searchParams.get("reason");

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!reason) return;
    setInfo(
      reason.includes("expired")
        ? "O link do e-mail expirou. Peça um novo código abaixo e digite-o aqui."
        : "Não foi possível confirmar pelo link do e-mail. Use o código de 6 dígitos abaixo."
    );
  }, [reason]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function verify(token: string) {
    if (!email) {
      setError("E-mail não informado. Volte ao cadastro e tente novamente.");
      return;
    }
    setError(null);
    setVerifying(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    if (otpError) {
      // Um token de signup já usado vira type "email" em novas tentativas.
      const retry = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (retry.error) {
        setVerifying(false);
        setError(
          otpError.message.includes("expired") || otpError.message.includes("invalid")
            ? "Código inválido ou expirado. Confira o e-mail mais recente ou peça um novo código."
            : otpError.message
        );
        return;
      }
    }
    // Cadastro efetivado: dispara os e-mails de boas-vindas/notificação.
    try {
      await fetch("/api/auth/welcome", { method: "POST" });
    } catch {
      // best-effort — nunca bloqueia o onboarding
    }
    router.push("/onboarding");
    router.refresh();
  }

  function onCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) {
      void verify(digits);
    }
  }

  async function resend() {
    if (!email || cooldown > 0) return;
    setResending(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setInfo("Novo código enviado. Confira sua caixa de entrada (e o spam).");
    setCooldown(RESEND_COOLDOWN_S);
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Confirme seu primeiro acesso</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enviamos um código de {CODE_LENGTH} dígitos para{" "}
        <span className="font-medium text-foreground">{email || "seu e-mail"}</span>. Digite-o
        abaixo — ou, se preferir, clique no link de confirmação do próprio e-mail.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === CODE_LENGTH) void verify(code);
        }}
      >
        <div className="space-y-1.5 text-left">
          <Label htmlFor="code">Código de verificação</Label>
          <Input
            id="code"
            ref={inputRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            className="text-center font-mono text-lg tracking-[0.5em]"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-success">{info}</p>}
        <Button type="submit" className="w-full" loading={verifying} disabled={code.length !== CODE_LENGTH}>
          Confirmar cadastro
        </Button>
      </form>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p>
          Não recebeu?{" "}
          <button
            type="button"
            onClick={() => void resend()}
            disabled={resending || cooldown > 0}
            className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cooldown > 0 ? `Reenviar código (${cooldown}s)` : "Reenviar código"}
          </button>
        </p>
        <p>
          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
