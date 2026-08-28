import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/services/api-context";

/**
 * Dataset publicado: a base que o usuário enxerga, com qualidade, versão e
 * atualização.
 *
 * Duas separações sustentam o desenho:
 *
 *   NOME é do usuário, VERSÃO é técnica. Na tela existe "Vendas"; a revisão
 *   serve para auditoria e rollback, e não aparece.
 *
 *   Publicar é ATÔMICO. Uma importação nova só substitui a atual depois de
 *   passar no portão de qualidade — senão a base publicada continua no ar.
 *   Um arquivo ruim enviado por cima nunca deixa o cliente sem dados.
 */

export type DatasetStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "REFRESHING"
  | "CHANGE_DETECTED"
  | "SCHEMA_CHANGED"
  | "QUALITY_BLOCKED"
  | "ERROR";

/** Rótulos que o usuário lê. O status técnico nunca vaza para a tela. */
export const DATASET_STATUS_LABEL: Record<DatasetStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Atualizado",
  REFRESHING: "Atualizando",
  CHANGE_DETECTED: "Alteração detectada",
  SCHEMA_CHANGED: "Colunas mudaram",
  QUALITY_BLOCKED: "Precisa de correções",
  ERROR: "Erro na importação",
};

export const DATASET_STATUS_VARIANT: Record<
  DatasetStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  REFRESHING: "secondary",
  CHANGE_DETECTED: "warning",
  SCHEMA_CHANGED: "warning",
  QUALITY_BLOCKED: "destructive",
  ERROR: "destructive",
};

export interface PublishResult {
  published: boolean;
  revision?: number;
  status?: DatasetStatus;
  score?: number;
  reason?: string;
  problems?: string[];
}

export interface SchemaDiff {
  added: string[];
  removed: string[];
  retyped: string[];
}

/** Diferença entre dois esquemas, para saber se painéis podem ter quebrado. */
export function diffSchemas(
  before: Array<{ name: string; type: string }>,
  after: Array<{ name: string; type: string }>
): SchemaDiff {
  const beforeByName = new Map(before.map((c) => [c.name, c.type]));
  const afterByName = new Map(after.map((c) => [c.name, c.type]));

  return {
    added: [...afterByName.keys()].filter((n) => !beforeByName.has(n)),
    removed: [...beforeByName.keys()].filter((n) => !afterByName.has(n)),
    retyped: [...afterByName.keys()].filter(
      (n) => beforeByName.has(n) && beforeByName.get(n) !== afterByName.get(n)
    ),
  };
}

export function hasSchemaChanges(diff: SchemaDiff): boolean {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.retyped.length > 0;
}

/**
 * Quais painéis dependem de uma coluna que sumiu.
 *
 * Sem isto o painel simplesmente para de funcionar e o usuário descobre pelo
 * gráfico vazio; com isto, ele é avisado com o nome do painel e da coluna.
 */
export function impactedByRemovedColumns(
  dashboards: Array<{ id: string; name: string; sql: string[] }>,
  removed: string[]
): Array<{ id: string; name: string; columns: string[] }> {
  if (removed.length === 0) return [];

  return dashboards
    .map((dash) => {
      const haystack = dash.sql.join(" ").toLowerCase();
      const columns = removed.filter((col) =>
        // Fronteira de palavra: "valor" não pode casar dentro de "valor_bruto".
        new RegExp(`\\b${col.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack)
      );
      return { id: dash.id, name: dash.name, columns };
    })
    .filter((d) => d.columns.length > 0);
}

/**
 * Publica uma revisão. O portão de qualidade decide no banco, numa
 * transação, para que duas importações simultâneas não se atropelem.
 */
export async function publishRevision(
  supabase: SupabaseClient,
  dataSourceId: string,
  input: {
    score: number;
    problems: string[];
    rowCount?: number | null;
    columnCount?: number | null;
    contentHash?: string | null;
    minScore?: number;
    schemaDiff?: SchemaDiff;
  }
): Promise<PublishResult> {
  const { data, error } = await supabase.rpc("publish_dataset_revision", {
    source: dataSourceId,
    score: input.score,
    problems: input.problems,
    rows_count: input.rowCount ?? null,
    cols_count: input.columnCount ?? null,
    hash: input.contentHash ?? null,
    min_score: input.minScore ?? 50,
    schema_diff:
      input.schemaDiff && hasSchemaChanges(input.schemaDiff) ? input.schemaDiff : {},
  });

  if (error) {
    // Migração pendente não pode impedir a importação de terminar.
    if (error.code === "42883" || error.code === "PGRST202") {
      console.warn("[datasets] migração 0018 pendente: publicação não versionada");
      return { published: true };
    }
    throw new ApiError(500, `Falha ao publicar a versão: ${error.message}`);
  }

  return data as PublishResult;
}

/** Responde "nada mudou" sem reprocessar a origem inteira. */
export async function isUnchanged(
  supabase: SupabaseClient,
  dataSourceId: string,
  contentHash: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("dataset_content_unchanged", {
    source: dataSourceId,
    hash: contentHash,
  });
  if (error) return false;
  return data === true;
}
