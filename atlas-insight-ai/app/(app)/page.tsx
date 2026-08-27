import Link from "next/link";
import { Database, Network, Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    href: "/data-sources",
    icon: Database,
    title: "1. Conecte uma fonte de dados",
    description: "BigQuery, PostgreSQL, SQL Server ou arquivos CSV/XLSX — sempre em modo leitura.",
  },
  {
    href: "/semantic",
    icon: Network,
    title: "2. Deixe a IA entender seu negócio",
    description:
      "Perfil automático das tabelas, detecção de relacionamentos e camada semântica validável.",
  },
  {
    href: "/dashboards",
    icon: Sparkles,
    title: "3. Gere seu dashboard",
    description: "A IA propõe KPIs, gráficos e narrativas — você aprova, ajusta e compartilha.",
  },
] as const;

export default async function OverviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <Badge>Fundação · FASE 1</Badge>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">
          {firstName ? `Olá, ${firstName}.` : "Olá."} Vamos transformar seus dados em decisão?
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          O Atlas Insight AI conecta suas fontes de dados, entende o seu negócio e gera dashboards
          com inteligência artificial. Comece pelos três passos abaixo.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-accent/40">
              <CardHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel-2 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                  Abrir <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Segurança em primeiro lugar</CardTitle>
          <CardDescription>
            Suas credenciais são cifradas com AES-256-GCM e nunca ficam acessíveis pelo navegador.
            Toda consulta às suas fontes é validada como somente leitura antes de executar, e cada
            ação relevante fica registrada em auditoria.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
