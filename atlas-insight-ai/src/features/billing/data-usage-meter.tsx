import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Quanto de dado a conta já mantém, contra o teto do plano.
 *
 * Vale o mesmo raciocínio do medidor de créditos: um limite que só aparece
 * quando é atingido parece defeito, não plano. A diferença é que aqui o
 * estouro é mais caro — o usuário já preparou o arquivo, esperou o upload, e
 * só então ouve não.
 */
export function DataUsageMeter({
  planName,
  usedRows,
  maxRows,
}: {
  planName: string;
  usedRows: number;
  /** -1 = sem teto. */
  maxRows: number;
}) {
  const unlimited = maxRows < 0;
  const pct = unlimited || maxRows === 0 ? 0 : Math.max(0, Math.min(100, (usedRows / maxRows) * 100));
  const tone = pct < 60 ? "bg-primary" : pct < 85 ? "bg-warning" : "bg-destructive";
  const n = (v: number) => v.toLocaleString("pt-BR");

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Dados armazenados</span>
        <Badge variant="secondary" className="text-[10px]">{planName}</Badge>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums">{n(usedRows)}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {unlimited ? "linhas · sem limite no seu plano" : `/ ${n(maxRows)} linhas`}
        </span>
      </div>

      {!unlimited && (
        <>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={usedRows}
            aria-valuemin={0}
            aria-valuemax={maxRows}
            aria-label={`${usedRows} de ${maxRows} linhas armazenadas`}
          >
            <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
          </div>
          {pct >= 85 && (
            // Avisa ANTES do upload que vai falhar, não depois: nesse ponto o
            // usuário já escolheu o arquivo e esperou a subida.
            <p className="mt-1.5 text-[11px] text-destructive">
              Perto do limite. O próximo arquivo grande pode ser recusado.
            </p>
          )}
        </>
      )}
    </div>
  );
}
