import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deduplicação de arquivos por conteúdo.
 *
 * Reenviar a mesma planilha refazia tudo: parse, perfil, modelo semântico e,
 * quando o layout parecia bagunçado, uma chamada de IA — para chegar ao mesmo
 * dataset que já existia. Comparar o hash do conteúdo custa milissegundos e
 * evita o trabalho inteiro.
 *
 * A comparação é sempre DENTRO do workspace: o "vendas.xlsx" de um cliente
 * não pode bloquear o arquivo de mesmo nome de outro.
 */

export interface DuplicateFile {
  id: string;
  name: string;
  dataSourceId: string | null;
  createdAt: string;
}

export function hashFileContent(buffer: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}

/**
 * Procura um arquivo já importado com o mesmo conteúdo neste workspace.
 *
 * Só considera importações que terminaram bem: um envio anterior que falhou
 * no meio não deve impedir a nova tentativa.
 */
export async function findDuplicate(
  workspaceId: string,
  contentHash: string
): Promise<DuplicateFile | null> {
  const { data, error } = await createAdminClient()
    .from("workspace_files")
    .select("id, name, data_source_id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("content_hash", contentHash)
    .eq("status", "READY")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Coluna ausente (migração 0017 pendente) não pode impedir upload nenhum.
  if (error) {
    if (error.code !== "42703" && error.code !== "PGRST204") {
      console.warn(`[file-dedup] lookup failed: ${error.message}`);
    }
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    dataSourceId: data.data_source_id,
    createdAt: data.created_at,
  };
}

/**
 * Descarta as respostas de IA guardadas para o workspace.
 *
 * O cache de 0016 expira por tempo, mas não sabe quando os DADOS mudam:
 * depois de um novo arquivo ou de um refresh, uma pergunta repetida devolveria
 * a resposta antiga. Responder errado é pior do que gastar o token de novo.
 */
export async function invalidateAiCache(workspaceId: string): Promise<void> {
  const { error } = await createAdminClient().rpc("ai_cache_invalidate", {
    ws: workspaceId,
  });
  if (error && error.code !== "42883" && error.code !== "PGRST202") {
    console.warn(`[ai-cache] invalidation failed: ${error.message}`);
  }
}
