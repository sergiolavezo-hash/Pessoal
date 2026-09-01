import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Quanto de IA ainda cabe hoje, e em que plano.
 *
 * Existe porque o limite era invisível até doer: o usuário descobria a
 * franquia no momento em que ela acabava, no meio de gerar um painel. Um
 * número na tela antes disso transforma um bloqueio em uma decisão — dá para
 * escolher entre esperar a renovação e assinar.
 *
 * O selo do plano fica ao lado do número de propósito: é o que liga "quanto
 * eu tenho" a "de onde isso vem", e é a única coisa que torna o upgrade uma
 * resposta óbvia em vez de uma venda.
 */
export function CreditsMeter({
  planName,
  allowance,
  remaining,
  extraBalance = 0,
  compact = false,
  href = "/settings/billing",
}: {
  planName: string;
  /** Franquia diária do plano, em créditos. */
  allowance: number;
  /** Quanto sobrou da franquia hoje. */
  remaining: number;
  /** Saldo comprado, que sobrevive à virada do dia. */
  extraBalance?: number;
  compact?: boolean;
  href?: string;
}) {
  // Sem franquia nenhuma a barra não tem escala; mostrar 0% cheio mentiria
  // menos que dividir por zero, mas o honesto é a barra vazia.
  const pct = allowance > 0 ? Math.max(0, Math.min(100, (remaining / allowance) * 100)) : 0;

  // A cor é informação, não enfeite: quem está em 8% precisa ver isso sem ler.
  const tone =
    pct > 40 ? "bg-primary" : pct > 15 ? "bg-warning" : "bg-destructive";

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            Créditos de IA
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {planName}
          </Badge>
        </div>
        {!compact && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>

      <div className={cn("flex items-baseline gap-1.5", compact ? "mt-1" : "mt-2")}>
        <span className={cn("font-semibold tabular-nums", compact ? "text-base" : "text-2xl")}>
          {remaining.toLocaleString("pt-BR")}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          / {allowance.toLocaleString("pt-BR")} hoje
        </span>
      </div>

      <div
        className={cn("mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted")}
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={allowance}
        aria-label={`${remaining} de ${allowance} créditos de IA restantes hoje`}
      >
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>

      {extraBalance > 0 && (
        // O saldo comprado NÃO entra na barra: ele não vira ao meio-noite, e
        // misturar os dois faria a barra encher sozinha na virada do dia.
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          + {extraBalance.toLocaleString("pt-BR")} créditos comprados, que não expiram
        </p>
      )}
    </>
  );

  if (compact) return <div className="rounded-md border p-2.5">{body}</div>;

  return (
    <Link
      href={href}
      className="block rounded-lg border p-4 transition-colors hover:bg-accent/40"
    >
      {body}
    </Link>
  );
}
