import {
  FormulaError,
  fieldReferences,
  metricDependencies,
  parseFormula,
  type FormulaNode,
} from "@/metrics/formula";
import { findEntity, findField, type SemanticModel } from "@/semantic/schema";

export interface MetricDefinition {
  slug: string;
  name: string;
  formula: string;
  format?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  dependencies: string[];
  entities: string[];
}

/**
 * Validates a metric formula against a semantic model and the other metrics
 * of the workspace (for metric() references). Detects circular dependencies.
 */
export function validateMetricFormula(
  formula: string,
  model: SemanticModel | null,
  knownMetrics: MetricDefinition[],
  selfSlug?: string
): ValidationResult {
  const errors: string[] = [];
  let node: FormulaNode;
  try {
    node = parseFormula(formula);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof FormulaError ? error.message : "Invalid formula"],
      dependencies: [],
      entities: [],
    };
  }

  const deps = [...new Set(metricDependencies(node))];
  const refs = fieldReferences(node);
  const entities = [...new Set(refs.map((r) => r.entity))];

  // Field references must resolve in the semantic model.
  if (refs.length > 0 && !model) {
    errors.push("No semantic model available to resolve Entity.field references");
  }
  if (model) {
    for (const ref of refs) {
      const entity = findEntity(model, ref.entity);
      if (!entity) {
        errors.push(`Unknown entity "${ref.entity}"`);
        continue;
      }
      if (ref.field && !findField(entity, ref.field)) {
        errors.push(`Unknown field "${ref.field}" on entity "${ref.entity}"`);
      }
    }
  }

  // metric() references must exist and not be circular.
  const bySlug = new Map(knownMetrics.map((m) => [m.slug, m]));
  for (const dep of deps) {
    if (dep === selfSlug) {
      errors.push(`Metric cannot reference itself ("${dep}")`);
      continue;
    }
    if (!bySlug.has(dep)) {
      errors.push(`Unknown metric "${dep}"`);
    }
  }
  if (selfSlug && hasCircularDependency(selfSlug, deps, bySlug)) {
    errors.push("Circular metric dependency detected");
  }

  return { valid: errors.length === 0, errors, dependencies: deps, entities };
}

function hasCircularDependency(
  root: string,
  deps: string[],
  bySlug: Map<string, MetricDefinition>,
  seen = new Set<string>()
): boolean {
  for (const dep of deps) {
    if (dep === root) return true;
    if (seen.has(dep)) continue;
    seen.add(dep);
    const metric = bySlug.get(dep);
    if (!metric) continue;
    try {
      const childDeps = metricDependencies(parseFormula(metric.formula));
      if (hasCircularDependency(root, childDeps, bySlug, seen)) return true;
    } catch {
      // Unparseable dependency formulas are reported when that metric is validated.
    }
  }
  return false;
}

/**
 * Compiles a metric formula into a SQL aggregate expression.
 * `metric()` references are inlined recursively; ratios are NULLIF-protected.
 */
export function compileMetricToSql(
  formula: string,
  model: SemanticModel,
  knownMetrics: MetricDefinition[],
  quote: (identifier: string) => string,
  depth = 0
): string {
  if (depth > 10) throw new FormulaError("Metric dependency chain too deep");
  const node = parseFormula(formula);
  return compileNode(node, model, knownMetrics, quote, depth);
}

function compileNode(
  node: FormulaNode,
  model: SemanticModel,
  knownMetrics: MetricDefinition[],
  quote: (identifier: string) => string,
  depth: number
): string {
  switch (node.kind) {
    case "number":
      return String(node.value);
    case "aggregation": {
      const entity = findEntity(model, node.entity);
      if (!entity) throw new FormulaError(`Unknown entity "${node.entity}"`);
      if (node.aggregation === "COUNT" && !node.field) return "COUNT(*)";
      const field = node.field ? findField(entity, node.field) : undefined;
      if (!field) throw new FormulaError(`Unknown field "${node.field}" on "${node.entity}"`);
      const column = quote(field.column);
      if (node.aggregation === "COUNT_DISTINCT") return `COUNT(DISTINCT ${column})`;
      return `${node.aggregation}(${column})`;
    }
    case "metric": {
      const metric = knownMetrics.find((m) => m.slug === node.slug);
      if (!metric) throw new FormulaError(`Unknown metric "${node.slug}"`);
      return `(${compileMetricToSql(metric.formula, model, knownMetrics, quote, depth + 1)})`;
    }
    case "binary": {
      const left = compileNode(node.left, model, knownMetrics, quote, depth);
      const right = compileNode(node.right, model, knownMetrics, quote, depth);
      if (node.operator === "/") {
        return `(${left} / NULLIF(${right}, 0))`;
      }
      return `(${left} ${node.operator} ${right})`;
    }
  }
}
