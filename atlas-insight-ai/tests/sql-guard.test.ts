import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_ROWS, normalizeSql, validateReadOnlySql } from "@/lib/sql-guard";

describe("validateReadOnlySql", () => {
  it("aceita SELECT simples e aplica LIMIT", () => {
    const r = validateReadOnlySql("select id, nome from clientes");
    expect(r.ok).toBe(true);
    expect(r.sql).toContain(`LIMIT ${DEFAULT_MAX_ROWS}`);
  });

  it("aceita CTE (WITH ... SELECT)", () => {
    const r = validateReadOnlySql(
      "with vendas as (select * from pedidos) select count(*) from vendas"
    );
    expect(r.ok).toBe(true);
  });

  it("aceita EXPLAIN SELECT", () => {
    const r = validateReadOnlySql("explain select 1");
    expect(r.ok).toBe(true);
  });

  it("respeita LIMIT existente sem duplicar", () => {
    const r = validateReadOnlySql("select * from t limit 5");
    expect(r.ok).toBe(true);
    expect(r.sql?.match(/limit/gi)?.length).toBe(1);
  });

  it("rejeita SQL vazio", () => {
    expect(validateReadOnlySql("").ok).toBe(false);
    expect(validateReadOnlySql("   ").ok).toBe(false);
  });

  const writes = [
    "insert into t values (1)",
    "update t set a = 1",
    "delete from t",
    "drop table t",
    "truncate t",
    "create table x (id int)",
    "alter table t add column x int",
    "grant select on t to hacker",
    "merge into t using s on t.id = s.id",
  ];
  it.each(writes)("rejeita escrita/DDL: %s", (sql) => {
    expect(validateReadOnlySql(sql).ok).toBe(false);
  });

  it("rejeita stacked statements", () => {
    const r = validateReadOnlySql("select 1; drop table clientes");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Múltiplas instruções/);
  });

  it("rejeita palavra proibida mesmo em CTE de escrita", () => {
    expect(
      validateReadOnlySql("with x as (delete from t returning *) select * from x").ok
    ).toBe(false);
  });

  it("rejeita SELECT INTO (cria tabela)", () => {
    expect(validateReadOnlySql("select * into nova_tabela from t").ok).toBe(false);
  });

  it("rejeita funções perigosas", () => {
    expect(validateReadOnlySql("select pg_sleep(10)").ok).toBe(false);
    expect(validateReadOnlySql("select * from dblink('...', 'select 1')").ok).toBe(false);
  });

  it("não é enganado por palavra proibida escondida em comentário", () => {
    const r = validateReadOnlySql("select 1 -- drop table t");
    expect(r.ok).toBe(true);
  });

  it("não gera falso positivo com literal contendo palavra proibida", () => {
    const r = validateReadOnlySql("select * from log where msg = 'user did delete action'");
    expect(r.ok).toBe(true);
  });

  it("detecta DROP escondido após comentário de bloco", () => {
    expect(validateReadOnlySql("/* comentario */ drop table t").ok).toBe(false);
  });
});

describe("normalizeSql", () => {
  it("remove comentários de linha e bloco", () => {
    expect(normalizeSql("select 1 -- oi\n+2")).not.toContain("oi");
    expect(normalizeSql("select /* x /* aninhado */ y */ 1")).not.toContain("aninhado");
  });

  it("esvazia literais de string com escapes", () => {
    expect(normalizeSql("select 'it''s a trap; drop table t'")).not.toContain("drop");
  });

  it("esvazia dollar-quoted strings", () => {
    expect(normalizeSql("select $$delete from t$$")).not.toContain("delete");
  });
});
