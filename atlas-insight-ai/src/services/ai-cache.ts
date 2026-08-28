import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/crypto";
import { budgetFor, type AiOperation } from "@/ai/config";

/**
 * Reaproveitamento de respostas de IA.
 *
 * Duas camadas, porque os desperdícios são de naturezas diferentes:
 *
 *  1. cache persistente — a mesma pergunta sobre o mesmo esquema feita
 *     amanhã não deve pagar tokens de novo;
 *  2. single-flight — duas requisições idênticas que chegam ao MESMO tempo
 *     (duplo clique, retry de rede, duas abas) não devem virar duas chamadas
 *     ao provedor. A segunda espera o resultado da primeira.
 *
 * A chave inclui sempre o workspace, e a chave primária da tabela também: o
 * cache de um cliente nunca pode responder ao pedido de outro.
 */

/**
 * Normaliza o texto do pedido antes de virar chave: diferenças de espaço,
 * caixa e pontuação final não mudam a resposta e não deveriam custar tokens.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cacheKey(
  operation: AiOperation,
  contextVersion: string,
  prompt: string
): string {
  return sha256(`${operation}:${contextVersion}:${normalize(prompt)}`);
}

/**
 * Chamadas em voo neste processo, por chave. Serverless roda várias
 * instâncias, então isto não elimina toda duplicação — mas elimina a mais
 * comum, que é o mesmo usuário disparando o mesmo pedido duas vezes seguidas.
 */
const inFlight = new Map<string, Promise<unknown>>();

export async function readCache<T>(
  workspaceId: string,
  key: string
): Promise<T | null> {
  const { data, error } = await createAdminClient()
    .from("ai_response_cache")
    .select("payload, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("cache_key", key)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload as T;
}

export async function writeCache(
  workspaceId: string,
  key: string,
  operation: AiOperation,
  payload: unknown,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const ttl = budgetFor(operation).cacheTtlSeconds;
  if (ttl <= 0) return;
  const { error } = await createAdminClient().from("ai_response_cache").upsert(
    {
      workspace_id: workspaceId,
      cache_key: key,
      operation,
      payload,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
    },
    { onConflict: "workspace_id,cache_key" }
  );
  // O cache é conveniência: não gravar encarece, mas não quebra nada.
  if (error) console.warn(`[ai-cache] not stored: ${error.message}`);
}

/**
 * Garante que duas chamadas idênticas simultâneas virem uma só.
 * A segunda aguarda a promessa da primeira em vez de chamar o provedor.
 */
export function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key);
  if (running) return running as Promise<T>;

  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
