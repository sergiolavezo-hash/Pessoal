import Link from "next/link";
import { Check, X, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Como usar o Atlas" };

/**
 * Central de orientação. Fica em primeiro no menu porque a dúvida mais cara
 * do produto não é "onde clico" — é "por que meu painel saiu vazio", e a
 * resposta quase sempre está na preparação da base.
 */

const STEPS = [
  {
    n: 1,
    title: "Prepare seus dados",
    body: "Deixe a planilha no formato de tabela: uma linha de títulos no topo e, abaixo, uma linha por registro. É a etapa que mais influencia o resultado.",
  },
  {
    n: 2,
    title: "Conecte sua fonte",
    body: "Envie um CSV ou Excel em Enviar dados, ou conecte um banco em Fontes de dados. O Atlas lê a estrutura sozinho.",
    href: "/files",
    hrefLabel: "Enviar dados",
  },
  {
    n: 3,
    title: "O Atlas verifica sua base",
    body: "Cada coluna é analisada: tipo, valores vazios, quantos valores distintos, faixa. Se a base não sustentar um painel confiável, o Atlas avisa antes de gastar sua cota de IA.",
  },
  {
    n: 4,
    title: "Monte seu modelo",
    body: "Reúna num modelo os arquivos e conexões que você quer analisar juntos, e dê um nome a ele. O Atlas já identificou o que é valor, o que é categoria e o que é data.",
    href: "/modelos",
    hrefLabel: "Modelos",
  },
  {
    n: 5,
    title: "Defina seus indicadores",
    body: "Diga o que significa faturamento, ticket médio ou cliente ativo no seu negócio. O Atlas passa a usar sempre a sua definição.",
    href: "/metrics",
    hrefLabel: "Indicadores",
  },
  {
    n: 6,
    title: "Crie seu painel",
    body: "Descreva o painel que você quer em português. O Atlas monta os gráficos, testa cada consulta contra os seus dados e corrige o que não funcionar.",
    href: "/dashboards",
    hrefLabel: "Painéis",
  },
  {
    n: 7,
    title: "Pergunte aos seus dados",
    body: "Dentro do painel, faça perguntas em linguagem natural. A resposta vem com o número, o gráfico e a consulta executada, para você conferir — e quando ela já estiver no painel, vem sem gastar sua cota de IA.",
    href: "/dashboards",
    hrefLabel: "Painéis",
  },
];

const CHECKLIST = [
  "A primeira linha contém os nomes das colunas",
  "Cada linha representa um registro",
  "Não existem células mescladas",
  "Não existem linhas vazias no meio da tabela",
  "Não existem colunas duplicadas",
  "As datas estão todas no mesmo formato",
  "Os números são números, não texto",
  "Não há linhas de total ou subtotal no meio dos dados",
  "As colunas têm nomes claros",
];

export default function ComoUsarPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Como usar o Atlas"
        description="Do arquivo ao painel em sete passos. A qualidade do painel depende da qualidade dos dados — comece pelo primeiro passo."
      />

      <ol className="space-y-3">
        {STEPS.map((step) => (
          <li key={step.n}>
            <Card>
              <CardContent className="flex gap-4 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {step.n}
                </span>
                <div className="min-w-0">
                  <h2 className="font-medium">{step.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                  {step.href && (
                    <Link
                      href={step.href}
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      Ir para {step.hrefLabel} →
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-lg font-semibold tracking-tight">
        Checklist da base
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Confira estes pontos antes de enviar. Eles resolvem a maioria dos painéis que saem vazios
        ou com números estranhos.
      </p>
      <Card className="mt-4">
        <CardContent className="p-4">
          <ul className="space-y-2">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <h2 className="mt-10 text-lg font-semibold tracking-tight">
        A diferença na prática
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <X className="h-4 w-4" />
              Difícil de analisar
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-[11px] leading-relaxed">
{`RELATÓRIO DE VENDAS

Janeiro
Cliente   Valor
João      R$ 1.000
Total     R$ 1.000

Fevereiro
Cliente   Valor
Maria     R$ 2.000`}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">
              Ótimo para ler, difícil de analisar: o mês está num título em vez de numa coluna, e
              as linhas de total se misturam aos dados.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <Check className="h-4 w-4" />
              Pronto para analisar
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-[11px] leading-relaxed">
{`Data        Cliente   Produto     Valor
01/01/2026  João      Produto A   1000
02/01/2026  Maria     Produto B   2000`}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">
              Cada linha é um registro e cada coluna é uma informação. O mês sai da data, e o total
              o Atlas calcula sozinho.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-warning/40 bg-warning/5">
        <CardContent className="flex gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium">Enviou o mesmo arquivo duas vezes?</p>
            <p className="mt-1 text-muted-foreground">
              O Atlas reconhece pelo conteúdo e avisa em vez de importar de novo — assim você não
              fica com dados duplicados nem gasta sua cota de IA à toa.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
