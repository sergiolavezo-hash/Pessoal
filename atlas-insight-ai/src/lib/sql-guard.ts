/**
 * Guarda de segurança do motor de consultas: o Atlas Insight AI executa
 * EXCLUSIVAMENTE leituras nas fontes de dados dos clientes. Qualquer SQL
 * gerado (por IA ou usuário) passa por este validador antes da execução.
 *
 * Estratégia em camadas:
 *  1. Normalização (remoção de comentários e literais de string) para
 *     impedir que palavras proibidas se escondam em comentários — e que
 *     literais legítimos causem falsos positivos.
 *  2. Bloqueio de múltiplas instruções (stacked statements).
 *  3. Allowlist do verbo inicial (SELECT / WITH / EXPLAIN SELECT).
 *  4. Denylist de palavras-chave de escrita/DDL/administração em
 *     qualquer posição do SQL normalizado.
 *  5. Imposição de LIMIT máximo quando ausente.
 */

export interface SqlGuardResult {
  ok: boolean;
  reason?: string;
  /** SQL possivelmente reescrito (ex.: LIMIT aplicado). */
  sql?: string;
}

const FORBIDDEN_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "merge",
  "upsert",
  "replace",
  "truncate",
  "drop",
  "create",
  "alter",
  "rename",
  "grant",
  "revoke",
  "commit",
  "rollback",
  "savepoint",
  "vacuum",
  "analyze",
  "reindex",
  "cluster",
  "copy",
  "call",
  "do",
  "execute",
  "exec",
  "prepare",
  "deallocate",
  "listen",
  "notify",
  "load",
  "lock",
  "set",
  "reset",
  "discard",
  "checkpoint",
  "comment",
  "security",
  "refresh",
  "import",
  "export",
  "backup",
  "restore",
  "shutdown",
  "kill",
  "use",
  "into", // SELECT ... INTO cria tabela
] as const;

const FORBIDDEN_FUNCTIONS = [
  "pg_sleep",
  "pg_read_file",
  "pg_write_file",
  "pg_ls_dir",
  "lo_import",
  "lo_export",
  "dblink",
  "xp_cmdshell",
  "openrowset",
  "opendatasource",
  "sp_executesql",
  "external_query",
] as const;

export const DEFAULT_MAX_ROWS = 10_000;

/** Remove comentários (-- e /* *​/) e substitui literais de string por ''. */
export function normalizeSql(raw: string): string {
  let out = "";
  let i = 0;
  const n = raw.length;
  while (i < n) {
    const ch = raw[i];
    const next = raw[i + 1];
    // comentário de linha
    if (ch === "-" && next === "-") {
      while (i < n && raw[i] !== "\n") i++;
      continue;
    }
    // comentário de bloco (com suporte a aninhamento, como no Postgres)
    if (ch === "/" && next === "*") {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (raw[i] === "/" && raw[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (raw[i] === "*" && raw[i + 1] === "/") {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      out += " ";
      continue;
    }
    // literal de string simples (com escape '')
    if (ch === "'") {
      out += "''";
      i++;
      while (i < n) {
        if (raw[i] === "'" && raw[i + 1] === "'") {
          i += 2;
        } else if (raw[i] === "'") {
          i++;
          break;
        } else {
          i++;
        }
      }
      continue;
    }
    // dollar-quoted string ($$...$$ ou $tag$...$tag$)
    if (ch === "$") {
      const m = /^\$[a-zA-Z_]*\$/.exec(raw.slice(i));
      if (m) {
        const tag = m[0];
        const end = raw.indexOf(tag, i + tag.length);
        out += "''";
        i = end === -1 ? n : end + tag.length;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

function words(sql: string): string[] {
  return sql.toLowerCase().match(/[a-z_][a-z0-9_.]*/g) ?? [];
}

export function validateReadOnlySql(
  raw: string,
  opts: { maxRows?: number } = {}
): SqlGuardResult {
  const maxRows = opts.maxRows ?? DEFAULT_MAX_ROWS;
  if (!raw || !raw.trim()) {
    return { ok: false, reason: "SQL vazio." };
  }

  const normalized = normalizeSql(raw).trim();

  // múltiplas instruções: qualquer ';' que não seja o terminador final
  const withoutTrailing = normalized.replace(/;\s*$/, "");
  if (withoutTrailing.includes(";")) {
    return { ok: false, reason: "Múltiplas instruções não são permitidas." };
  }

  const tokens = words(withoutTrailing);
  if (tokens.length === 0) {
    return { ok: false, reason: "SQL sem conteúdo após normalização." };
  }

  // verbo inicial permitido
  const first = tokens[0];
  const allowedStart =
    first === "select" ||
    first === "with" ||
    (first === "explain" && tokens.includes("select"));
  if (!allowedStart) {
    return {
      ok: false,
      reason: `Apenas consultas de leitura (SELECT/WITH) são permitidas — recebido "${first?.toUpperCase()}".`,
    };
  }

  // denylist em qualquer posição
  for (const token of tokens) {
    const bare = token.split(".").pop() ?? token;
    if ((FORBIDDEN_KEYWORDS as readonly string[]).includes(bare)) {
      // "do", "set", "use" etc. como palavras inteiras
      return {
        ok: false,
        reason: `Palavra-chave proibida em consulta de leitura: "${bare.toUpperCase()}".`,
      };
    }
    if ((FORBIDDEN_FUNCTIONS as readonly string[]).includes(bare)) {
      return { ok: false, reason: `Função proibida: "${bare}".` };
    }
  }

  // LIMIT: aplica teto quando ausente (não sobrescreve limites menores)
  let sql = raw.trim().replace(/;\s*$/, "");
  const hasLimit = /\blimit\s+\d+/i.test(withoutTrailing);
  const isExplain = first === "explain";
  if (!hasLimit && !isExplain) {
    sql = `${sql}\nLIMIT ${maxRows}`;
  }

  return { ok: true, sql };
}
