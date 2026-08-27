"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    fullName: z.string().min(2, "Informe seu nome completo"),
    email: z.string().email("Informe um e-mail válido"),
    phone: z
      .string()
      .min(10, "Informe um telefone com DDD")
      .regex(/^[\d\s()+-]+$/, "Use apenas números, espaços, ( ) + e -"),
    company: z.string().min(2, "Informe o nome da empresa"),
    password: z
      .string()
      .min(8, "Mínimo de 8 caracteres")
      .regex(/[a-zA-Z]/, "Inclua ao menos uma letra")
      .regex(/\d/, "Inclua ao menos um número"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });

type FormValues = z.infer<typeof schema>;

const PASSWORD_RULES = [
  { label: "8+ caracteres", test: (p: string) => p.length >= 8 },
  { label: "1 letra", test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: "1 número", test: (p: string) => /\d/.test(p) },
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onBlur" });

  const password = watch("password") ?? "";
  const ruleStates = useMemo(
    () => PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(password) })),
    [password]
  );

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName.trim(),
          phone: values.phone.trim(),
          company: values.company.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (error) {
      setServerError(
        error.message.includes("already registered")
          ? "Este e-mail já possui cadastro. Faça login ou recupere a senha."
          : error.message
      );
      return;
    }
    if (data.session) {
      // Confirmação de e-mail desativada no projeto — segue direto.
      window.location.assign("/onboarding");
      return;
    }
    // Primeiro acesso: verificação por código enviado ao e-mail.
    router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Criar sua conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Teste grátis por 14 dias ou 1 dashboard — sem cartão de crédito.
      </p>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nome completo</Label>
          <Input id="fullName" autoComplete="name" placeholder="Seu nome" {...register("fullName")} />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail corporativo</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone (WhatsApp)</Label>
            <Input id="phone" type="tel" autoComplete="tel" placeholder="(11) 90000-0000" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Empresa</Label>
            <Input id="company" autoComplete="organization" placeholder="Sua empresa" {...register("company")} />
            {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
            {ruleStates.map((r) => (
              <span
                key={r.label}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  r.ok ? "text-success" : "text-muted-foreground"
                )}
              >
                {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {r.label}
              </span>
            ))}
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Criar conta e receber código
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Ao criar a conta você concorda com o tratamento dos seus dados de cadastro para acesso à
          plataforma e comunicações do produto, conforme a LGPD.
        </p>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
