// Metric formula language — small, safe, dialect-independent.
//
//   Revenue        -> SUM(Sales.revenue)
//   Gross Profit   -> metric(revenue) - metric(cost)
//   Gross Margin   -> (metric(revenue) - metric(cost)) / metric(revenue)
//   Orders         -> COUNT_DISTINCT(Sales.order_id)
//
// Grammar: expression := term (('+'|'-') term)*
//          term       := factor (('*'|'/') factor)*
//          factor     := number | aggregation | metricRef | '(' expression ')'
//          aggregation := AGG '(' Entity '.' field ')' | COUNT '(' Entity ')'
//          metricRef  := 'metric' '(' slug ')'

export type Aggregation = "SUM" | "AVG" | "MIN" | "MAX" | "COUNT" | "COUNT_DISTINCT";

export type FormulaNode =
  | { kind: "number"; value: number }
  | { kind: "aggregation"; aggregation: Aggregation; entity: string; field: string | null }
  | { kind: "metric"; slug: string }
  | { kind: "binary"; operator: "+" | "-" | "*" | "/"; left: FormulaNode; right: FormulaNode };

const AGGREGATIONS: Aggregation[] = ["SUM", "AVG", "MIN", "MAX", "COUNT_DISTINCT", "COUNT"];

export class FormulaError extends Error {}

interface Token {
  type: "number" | "identifier" | "operator" | "lparen" | "rparen" | "dot" | "comma";
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < input.length && /[0-9.]/.test(input[i])) num += input[i++];
      tokens.push({ type: "number", value: num });
      continue;
    }
    if (/[\p{L}_]/u.test(ch)) {
      let ident = "";
      while (i < input.length && /[\p{L}\p{N}_]/u.test(input[i])) ident += input[i++];
      tokens.push({ type: "identifier", value: ident });
      continue;
    }
    if ("+-*/".includes(ch)) {
      tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen", value: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ch });
      i++;
      continue;
    }
    if (ch === ".") {
      tokens.push({ type: "dot", value: ch });
      i++;
      continue;
    }
    throw new FormulaError(`Unexpected character "${ch}" in formula`);
  }
  return tokens;
}

export function parseFormula(input: string): FormulaNode {
  const tokens = tokenize(input);
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (type: Token["type"]): Token => {
    const t = next();
    if (!t || t.type !== type) throw new FormulaError(`Expected ${type} but got "${t?.value ?? "end"}"`);
    return t;
  };

  function expression(): FormulaNode {
    let left = term();
    while (peek()?.type === "operator" && (peek().value === "+" || peek().value === "-")) {
      const op = next().value as "+" | "-";
      left = { kind: "binary", operator: op, left, right: term() };
    }
    return left;
  }

  function term(): FormulaNode {
    let left = factor();
    while (peek()?.type === "operator" && (peek().value === "*" || peek().value === "/")) {
      const op = next().value as "*" | "/";
      left = { kind: "binary", operator: op, left, right: factor() };
    }
    return left;
  }

  function factor(): FormulaNode {
    const t = peek();
    if (!t) throw new FormulaError("Unexpected end of formula");

    if (t.type === "number") {
      next();
      const value = Number(t.value);
      if (!Number.isFinite(value)) throw new FormulaError(`Invalid number "${t.value}"`);
      return { kind: "number", value };
    }

    if (t.type === "lparen") {
      next();
      const inner = expression();
      expect("rparen");
      return inner;
    }

    if (t.type === "identifier") {
      const upper = t.value.toUpperCase();

      if (t.value.toLowerCase() === "metric") {
        next();
        expect("lparen");
        const slug = expect("identifier").value;
        expect("rparen");
        return { kind: "metric", slug: slug.toLowerCase() };
      }

      if (AGGREGATIONS.includes(upper as Aggregation)) {
        next();
        expect("lparen");
        const entity = expect("identifier").value;
        let field: string | null = null;
        if (peek()?.type === "dot") {
          next();
          field = expect("identifier").value;
        }
        expect("rparen");
        if (upper !== "COUNT" && field === null) {
          throw new FormulaError(`${upper} requires Entity.field`);
        }
        return { kind: "aggregation", aggregation: upper as Aggregation, entity, field };
      }

      throw new FormulaError(
        `Unknown identifier "${t.value}". Use SUM/AVG/MIN/MAX/COUNT/COUNT_DISTINCT(Entity.field) or metric(slug).`
      );
    }

    throw new FormulaError(`Unexpected token "${t.value}"`);
  }

  const result = expression();
  if (pos < tokens.length) throw new FormulaError(`Unexpected trailing input "${tokens[pos].value}"`);
  return result;
}

/** All metric slugs referenced by a formula. */
export function metricDependencies(node: FormulaNode): string[] {
  switch (node.kind) {
    case "metric":
      return [node.slug];
    case "binary":
      return [...metricDependencies(node.left), ...metricDependencies(node.right)];
    default:
      return [];
  }
}

/** All Entity.field references used by a formula. */
export function fieldReferences(node: FormulaNode): Array<{ entity: string; field: string | null }> {
  switch (node.kind) {
    case "aggregation":
      return [{ entity: node.entity, field: node.field }];
    case "binary":
      return [...fieldReferences(node.left), ...fieldReferences(node.right)];
    default:
      return [];
  }
}
