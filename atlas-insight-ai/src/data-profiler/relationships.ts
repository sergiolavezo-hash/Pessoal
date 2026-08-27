// Relationship detection heuristics — pure logic over profiled catalog data.
// Inferences carry a confidence and a reason; they are suggestions, not facts.

export interface ProfiledColumnRef {
  id: string;
  tableId: string;
  tableName: string;
  name: string;
  dataType: string;
  classification?: string;
  cardinality?: number;
  uniqueCount?: number;
}

export interface DetectedRelationship {
  sourceColumnId: string;
  targetColumnId: string;
  relationshipType: "many-to-one" | "one-to-one";
  confidence: number;
  reason: string;
}

const FK_RE = /^(.*?)_?(id|key|code)$/i;

function singularize(word: string): string {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function normalize(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function typesCompatible(a: string, b: string): boolean {
  const numeric = /int|numeric|decimal|bigint|number/i;
  const text = /char|text|string|uuid/i;
  return (numeric.test(a) && numeric.test(b)) || (text.test(a) && text.test(b)) || a === b;
}

/**
 * Detects likely FK -> PK relationships:
 * 1. `orders.customer_id` -> `customers.customer_id` (same column name, high
 *    uniqueness on the target side)
 * 2. `orders.customer_id` -> `customers.id` (entity prefix matches the table)
 */
export function detectRelationships(columns: ProfiledColumnRef[]): DetectedRelationship[] {
  const results: DetectedRelationship[] = [];
  const seen = new Set<string>();

  const likelyKeys = columns.filter(
    (c) => (c.classification === "ID" || (c.cardinality ?? 0) > 0.95) && c.name.match(FK_RE)
  );

  for (const source of columns) {
    const match = source.name.match(FK_RE);
    if (!match) continue;
    const prefix = normalize(match[1] ?? "");

    for (const target of likelyKeys) {
      if (target.tableId === source.tableId) continue;
      if (!typesCompatible(source.dataType, target.dataType)) continue;

      const targetTable = normalize(target.tableName);
      const targetTableSingular = singularize(targetTable);
      const sameName = normalize(source.name) === normalize(target.name) && prefix.length > 0;
      const prefixMatchesTable =
        prefix.length > 1 &&
        normalize(target.name).match(/^(id|key|code)$|_id$|_key$/) !== null &&
        (targetTable === prefix || targetTableSingular === singularize(prefix));

      if (!sameName && !prefixMatchesTable) continue;

      const key = `${source.id}->${target.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const targetUnique = (target.cardinality ?? 0) > 0.99;
      const sourceUnique = (source.cardinality ?? 0) > 0.99;
      const base = sameName ? 0.85 : 0.75;
      const confidence = Math.min(0.98, base + (targetUnique ? 0.1 : -0.15));

      results.push({
        sourceColumnId: source.id,
        targetColumnId: target.id,
        relationshipType: sourceUnique && targetUnique ? "one-to-one" : "many-to-one",
        confidence: Math.round(confidence * 1000) / 1000,
        reason: sameName
          ? `Column name "${source.name}" matches ${target.tableName}.${target.name}`
          : `Prefix "${match[1]}" matches table "${target.tableName}"`,
      });
    }
  }

  // 3. Same column name across tables (covers cod_marca, id_cliente, sku…)
  //    — no suffix requirement; generic names are excluded to avoid noise.
  const GENERIC = new Set([
    "id", "nome", "name", "status", "data", "date", "descricao", "description",
    "valor", "value", "tipo", "type", "ativo", "active", "email", "created_at",
    "updated_at", "quantidade", "qtd", "total", "obs", "observacao",
  ]);
  const byName = new Map<string, ProfiledColumnRef[]>();
  for (const c of columns) {
    const key = normalize(c.name);
    if (GENERIC.has(c.name.toLowerCase())) continue;
    (byName.get(key) ?? byName.set(key, []).get(key)!).push(c);
  }
  for (const group of byName.values()) {
    const tablesInGroup = new Set(group.map((c) => c.tableId));
    if (tablesInGroup.size < 2) continue;
    // Target = the most unique side (the "one" side of the relationship).
    const sorted = [...group].sort((a, b) => (b.cardinality ?? 0) - (a.cardinality ?? 0));
    const target = sorted[0];
    for (const source of group) {
      if (source.tableId === target.tableId) continue;
      if (!typesCompatible(source.dataType, target.dataType)) continue;
      const key = `${source.id}->${target.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const targetUnique = (target.cardinality ?? 0) > 0.95;
      results.push({
        sourceColumnId: source.id,
        targetColumnId: target.id,
        relationshipType: "many-to-one",
        confidence: targetUnique ? 0.85 : 0.7,
        reason: `Column "${source.name}" exists in both ${source.tableName} and ${target.tableName}`,
      });
    }
  }

  // Keep only the best target per source column.
  const bestBySource = new Map<string, DetectedRelationship>();
  for (const r of results) {
    const current = bestBySource.get(r.sourceColumnId);
    if (!current || r.confidence > current.confidence) bestBySource.set(r.sourceColumnId, r);
  }
  return [...bestBySource.values()];
}
