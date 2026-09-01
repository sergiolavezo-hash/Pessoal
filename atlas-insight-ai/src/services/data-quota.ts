import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/services/api-context";

/**
 * Teto de dados por conta.
 *
 * O Postgres do plano gratuito do Supabase tem 500 MB, e esses 500 MB são do
 * banco INTEIRO — compartilhados por todas as contas. Medido com a base COVID
 * real: 306.429 linhas ocupam 30 MB, 101 bytes por linha. Dezesseis bases
 * desse tamanho enchem o banco de todo mundo.
 *
 * Sem teto por conta, o sintoma quando enchesse não seria "fulano estourou o
 * limite": seria o produto parando de aceitar upload para TODOS os clientes
 * ao mesmo tempo, sem explicação. Um teto por conta transforma isso num
 * limite que a pessoa certa vê, no momento certo, com a saída à mão.
 */

/** ~100 bytes por linha, medido. Serve só para escrever a mensagem em MB. */
const BYTES_PER_ROW = 100;

export interface DataQuota {
  usedRows: number;
  /** -1 = sem teto. */
  maxRows: number;
}

/** Teto ausente é diferente de teto zero: na dúvida, não bloqueia o upload. */
const UNKNOWN: DataQuota = { usedRows: 0, maxRows: -1 };

/**
 * Recebe o cliente e a organização, não o ApiContext inteiro: a tela de
 * cobrança é Server Component e não tem ApiContext, e forçar um cast ali só
 * para satisfazer o tipo seria mentira que compila.
 */
export async function getDataQuota(
  supabase: SupabaseClient,
  organizationId: string
): Promise<DataQuota> {
  const { data, error } = await supabase.rpc("data_quota_status", {
    org: organizationId,
  });
  if (error) {
    // Migração 0024 pendente não pode derrubar upload nenhum; qualquer outra
    // falha também não, porque recusar dado por não saber o saldo é pior que
    // aceitar um pouco além do teto.
    if (error.code !== "42883" && error.code !== "PGRST202") {
      console.error(`[data-quota] status indisponível: ${error.message}`);
    }
    return UNKNOWN;
  }
  const row = data as { used_rows?: number | string; max_rows?: number | string } | null;
  return {
    usedRows: Number(row?.used_rows ?? 0),
    maxRows: Number(row?.max_rows ?? -1),
  };
}

function approxMb(rows: number): string {
  return (rows * BYTES_PER_ROW / 1024 / 1024).toFixed(0);
}

/**
 * Recusa ANTES de gravar. O número de linhas já é conhecido depois da leitura
 * do arquivo, então dá para dizer não sem ter escrito nada — e sem deixar a
 * conta pela metade, que é o pior estado possível.
 */
export function assertFitsInQuota(quota: DataQuota, incomingRows: number): void {
  if (quota.maxRows < 0) return;

  const free = Math.max(0, quota.maxRows - quota.usedRows);
  if (incomingRows <= free) return;

  const n = (v: number) => v.toLocaleString("pt-BR");
  throw new ApiError(
    413,
    `Este arquivo tem ${n(incomingRows)} linhas e só cabem mais ${n(free)} no seu plano ` +
      `(${n(quota.usedRows)} de ${n(quota.maxRows)} linhas em uso, cerca de ${approxMb(quota.maxRows)} MB). ` +
      `Nada foi importado. Apague uma base que não usa mais, envie um recorte menor, ou ` +
      `mude de plano em Configurações → Cobrança para subir o limite.`
  );
}
