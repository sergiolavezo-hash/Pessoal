import { Parser } from "node-sql-parser";
import type { SqlDialect } from "@/connectors/types";

// Read-only SQL enforcement. This runs on EVERY query before execution —
// AI-generated or not. Defense in depth: connectors additionally open
// read-only sessions where the engine supports it.

export interface SqlValidationResult {
  valid: boolean;
  errors: string[];
  /** Tables referenced by the query (schema-qualified where present). */
  tables: string[];
}

const FORBIDDEN_STATEMENTS = new Set([
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "truncate",
  "create",
  "merge",
  "grant",
  "revoke",
  "call",
  "exec",
  "execute",
  "use",
  "set",
  "copy",
  "vacuum",
  "analyze",
  "comment",
  "lock",
  "declare",
]);

// Keywords that must never appear even inside a SELECT (protects against
// dialect corners the parser misses).
const FORBIDDEN_PATTERNS: Array<{ re: RegExp; message: string }> = [
  { re: /\binto\s+(?:outfile|dumpfile)\b/i, message: "SELECT INTO OUTFILE is not allowed" },
  { re: /\bfor\s+update\b/i, message: "FOR UPDATE is not allowed" },
  { re: /\bpg_sleep\s*\(/i, message: "pg_sleep is not allowed" },
  { re: /\bwaitfor\s+delay\b/i, message: "WAITFOR DELAY is not allowed" },
  { re: /\bxp_cmdshell\b/i, message: "xp_cmdshell is not allowed" },
  { re: /\bopenrowset\b/i, message: "OPENROWSET is not allowed" },
  { re: /\bdblink\b/i, message: "dblink is not allowed" },
  { re: /\bcopy\s/i, message: "COPY is not allowed" },
  { re: /\bpg_read_file\b|\bpg_ls_dir\b/i, message: "Filesystem access functions are not allowed" },
];

const DIALECT_MAP: Record<SqlDialect, string> = {
  postgres: "PostgresQL",
  bigquery: "BigQuery",
  sqlserver: "TransactSQL",
};

/** Strips string literals and comments so keyword scans don't false-positive. */
export function stripLiteralsAndComments(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      out += quote;
      i++;
      while (i < sql.length) {
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            i += 2;
            continue;
          }
          break;
        }
        i++;
      }
      out += quote;
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

export function validateReadOnlySql(sql: string, dialect: SqlDialect): SqlValidationResult {
  const errors: string[] = [];
  const trimmed = sql.trim().replace(/;\s*$/, "");

  if (trimmed.length === 0) {
    return { valid: false, errors: ["Query is empty"], tables: [] };
  }

  const stripped = stripLiteralsAndComments(trimmed);

  // Multiple statements are never allowed.
  if (stripped.includes(";")) {
    errors.push("Multiple SQL statements are not allowed");
  }

  // The statement must start with SELECT or WITH.
  const firstWord = stripped.trimStart().split(/\s/, 1)[0]?.toLowerCase() ?? "";
  if (firstWord !== "select" && firstWord !== "with") {
    errors.push(`Only SELECT queries are allowed (got "${firstWord.toUpperCase()}")`);
  }

  // Forbidden keywords as standalone statements anywhere in the text.
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.re.test(stripped)) errors.push(pattern.message);
  }

  // AST validation.
  let tables: string[] = [];
  const parser = new Parser();
  try {
    const ast = parser.astify(trimmed, { database: DIALECT_MAP[dialect] });
    const statements = Array.isArray(ast) ? ast : [ast];
    if (statements.length > 1) {
      errors.push("Multiple SQL statements are not allowed");
    }
    for (const statement of statements) {
      const type = (statement as { type?: string }).type?.toLowerCase() ?? "";
      if (FORBIDDEN_STATEMENTS.has(type)) {
        errors.push(`${type.toUpperCase()} statements are not allowed`);
      } else if (type !== "select") {
        errors.push(`Only SELECT statements are allowed (got "${type.toUpperCase()}")`);
      }
    }
    tables = extractTables(parser, trimmed, dialect);
  } catch {
    // Parser gaps (dialect-specific syntax): fall back to keyword scanning.
    const words = stripped.toLowerCase().split(/[^a-z_]+/);
    for (const word of words) {
      if (FORBIDDEN_STATEMENTS.has(word) && !["set", "use", "analyze", "call", "declare", "exec", "execute", "comment", "lock"].includes(word)) {
        errors.push(`Keyword "${word.toUpperCase()}" is not allowed`);
      }
    }
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)], tables };
}

function extractTables(parser: Parser, sql: string, dialect: SqlDialect): string[] {
  try {
    const list = parser.tableList(sql, { database: DIALECT_MAP[dialect] });
    // Format: "select::schema::table" (schema may be "null").
    return [...new Set(
      list.map((entry) => {
        const [, schema, table] = entry.split("::");
        return schema && schema !== "null" ? `${schema}.${table}` : table;
      })
    )];
  } catch {
    return [];
  }
}

/**
 * Optional allowlist enforcement: every referenced table must be one of the
 * known tables of the workspace's semantic context.
 */
export function validateTableAllowlist(tables: string[], allowed: string[]): string[] {
  const normalizedAllowed = new Set(
    allowed.flatMap((t) => {
      const lower = t.toLowerCase();
      const bare = lower.split(".").pop() ?? lower;
      return [lower, bare];
    })
  );
  return tables.filter((t) => {
    const lower = t.toLowerCase();
    const bare = lower.split(".").pop() ?? lower;
    return !normalizedAllowed.has(lower) && !normalizedAllowed.has(bare);
  });
}
