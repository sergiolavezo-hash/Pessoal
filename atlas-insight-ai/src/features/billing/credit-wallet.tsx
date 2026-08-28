"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readJson } from "@/lib/api-client";
import { dailyResetClock, formatWait, msUntilDailyReset } from "@/lib/wait-time";

export interface CreditPackOption {
  id: string;
  name: string;
  priceCents: number;
  creditCents: number;
}

export interface CreditWalletState {
  dailyAllowanceCents: number;
  dailyRemainingCents: number;
  balanceCents: number;
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Saldo de IA e recarga em um clique. O usuário que estourou a cota do dia
 * resolve sozinho e volta a trabalhar, sem falar com ninguém.
 */
export function CreditWallet({
  workspaceId,
  state,
  packs,
}: {
  workspaceId: string;
  state: CreditWalletState;
  packs: CreditPackOption[];
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function recharge(packId: string) {
    setLoading(packId);
    try {
      const res = await fetch("/api/billing/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, packId }),
      });
      const json = await readJson<{ url?: string; error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "Não foi possível iniciar a recarga");
      if (json.url) window.location.href = json.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na recarga", { duration: 8000 });
    } finally {
      setLoading(null);
    }
  }

  // Contagem regressiva viva: quem está sem cota precisa ver o prazo andando,
  // não uma frase estática que pode estar velha na tela há uma hora.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const usedToday = state.dailyAllowanceCents - state.dailyRemainingCents;
  const usedPercent =
    state.dailyAllowanceCents > 0
      ? Math.min(100, Math.round((usedToday / state.dailyAllowanceCents) * 100))
      : 0;
  // Antes da carteira ser provisionada tudo vem zerado; não é "cota acabou".
  const provisioned = state.dailyAllowanceCents > 0 || state.balanceCents > 0;
  const exhausted = provisioned && state.dailyRemainingCents === 0 && state.balanceCents === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Créditos de IA
        </CardTitle>
        <CardDescription>
          Sua franquia diária cobre o uso normal. Se acabar, recarregue e continue na hora.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Franquia de hoje</p>
            <p className="text-lg font-semibold">
              {brl(state.dailyRemainingCents)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                de {brl(state.dailyAllowanceCents)}
              </span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={usedPercent >= 100 ? "h-full bg-destructive" : "h-full bg-primary"}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {now
                ? `Renova ${formatWait(msUntilDailyReset(now))}, às ${dailyResetClock(now)}.`
                : "Renova na virada do dia."}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo de créditos</p>
            <p className="text-lg font-semibold">{brl(state.balanceCents)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Usado só depois que a franquia do dia termina.
            </p>
          </div>
        </div>

        {!provisioned && (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Carteira sendo provisionada. Seu uso de IA continua liberado.
          </p>
        )}

        {exhausted && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
            Sua cota de hoje acabou.{" "}
            {now
              ? `Ela se renova ${formatWait(msUntilDailyReset(now))}, às ${dailyResetClock(now)}.`
              : "Ela se renova na virada do dia."}{" "}
            Para voltar a trabalhar agora, recarregue abaixo.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {packs.map((pack) => {
            const bonus = pack.creditCents - pack.priceCents;
            return (
              <div key={pack.id} className="rounded-lg border p-4">
                <p className="text-sm font-medium">{brl(pack.priceCents)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Você recebe {brl(pack.creditCents)}
                  {bonus > 0 && (
                    <span className="ml-1 font-medium text-primary">+{brl(bonus)} bônus</span>
                  )}
                </p>
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  size="sm"
                  loading={loading === pack.id}
                  onClick={() => recharge(pack.id)}
                >
                  Recarregar
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
