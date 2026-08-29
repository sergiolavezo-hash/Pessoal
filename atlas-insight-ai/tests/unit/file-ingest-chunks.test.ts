import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countIngestedRows, dedupeRows, insertRowsFrom } from "@/services/file-ingest";

const TABLE = "file_abc123";

function rowsOf(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({ i, nome: `linha ${i}` }));
}

/** Cliente falso: guarda o que cada chamada de insert recebeu. */
function fakeAdmin(onRpc?: (name: string, args: Record<string, unknown>) => unknown) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: onRpc?.(name, args) ?? null, error: null };
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("dedupeRows", () => {
  /**
   * A retomada de um arquivo grande refaz esta lista para descobrir onde
   * parou. Se a ordem mudasse entre duas execuções, o ponto de parada
   * apontaria para outra linha e a base do cliente entraria embaralhada.
   */
  it("preserves order and keeps the first occurrence", () => {
    const rows = [{ a: 1 }, { a: 2 }, { a: 1 }, { a: 3 }];
    expect(dedupeRows(rows)).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  it("gives the same result every time it runs", () => {
    const rows = [...rowsOf(50), ...rowsOf(50)];
    expect(dedupeRows(rows)).toEqual(dedupeRows(rows));
    expect(dedupeRows(rows)).toHaveLength(50);
  });

  it("keeps rows that differ only in one field", () => {
    expect(dedupeRows([{ a: 1, b: 1 }, { a: 1, b: 2 }])).toHaveLength(2);
  });
});

describe("insertRowsFrom", () => {
  it("inserts every row when there is no deadline", async () => {
    const { client, calls } = fakeAdmin();
    const rows = rowsOf(5_000);
    const next = await insertRowsFrom(client, TABLE, rows, 0, Number.POSITIVE_INFINITY);
    expect(next).toBe(5_000);
    const sent = calls.flatMap((c) => c.args.p_rows as Record<string, unknown>[]);
    expect(sent).toHaveLength(5_000);
    expect(sent[0]).toEqual(rows[0]);
    expect(sent[4_999]).toEqual(rows[4_999]);
  });

  /**
   * O motivo de tudo isto existir: 300 mil linhas são centenas de idas ao
   * banco e não cabem nos 60 segundos da função. Estourando o prazo, o pedido
   * devolve onde parou em vez de morrer levando o arquivo junto.
   */
  it("stops at the deadline and reports where it stopped", async () => {
    const { client } = fakeAdmin();
    const next = await insertRowsFrom(client, TABLE, rowsOf(10_000), 0, Date.now() - 1);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10_000);
  });

  /**
   * Zero progresso faria o navegador repetir o mesmo pedido para sempre.
   * Mesmo com o prazo já vencido, um lote sempre entra.
   */
  it("always makes progress, even with the deadline already past", async () => {
    const { client, calls } = fakeAdmin();
    const next = await insertRowsFrom(client, TABLE, rowsOf(10), 0, 0);
    expect(next).toBe(10);
    expect(calls).toHaveLength(1);
  });

  // Retomar reinserindo o que já entrou duplicaria dado na base do cliente.
  it("resumes from the offset instead of re-inserting", async () => {
    const { client, calls } = fakeAdmin();
    const rows = rowsOf(3_000);
    const next = await insertRowsFrom(client, TABLE, rows, 2_500, Number.POSITIVE_INFINITY);
    expect(next).toBe(3_000);
    const sent = calls.flatMap((c) => c.args.p_rows as Record<string, unknown>[]);
    expect(sent).toHaveLength(500);
    expect(sent[0]).toEqual(rows[2_500]);
  });

  it("does nothing when the offset is already at the end", async () => {
    const { client, calls } = fakeAdmin();
    expect(await insertRowsFrom(client, TABLE, rowsOf(10), 10, Number.POSITIVE_INFINITY)).toBe(10);
    expect(calls).toHaveLength(0);
  });

  it("surfaces a database failure instead of reporting progress", async () => {
    const client = {
      rpc: vi.fn(async () => ({ data: null, error: { message: "boom" } })),
    } as unknown as SupabaseClient;
    await expect(insertRowsFrom(client, TABLE, rowsOf(10), 0, Infinity)).rejects.toThrow("boom");
  });

  /** O nome vai para dentro de SQL montado; o que não bate com o formato não entra. */
  it("refuses a table name that is not a plain identifier", async () => {
    const { client } = fakeAdmin();
    for (const name of ["file_a; drop table x", "File_A", "1file", '"file"', ""]) {
      await expect(insertRowsFrom(client, name, rowsOf(1), 0, Infinity)).rejects.toThrow(
        "invalid table name"
      );
    }
  });
});

describe("countIngestedRows", () => {
  /**
   * O ponto de retomada vem daqui, não do navegador: quem recarregou a página
   * no meio mandaria um número errado, e um número errado significa linha
   * duplicada ou linha faltando.
   */
  it("reads the count from the physical table", async () => {
    const { client, calls } = fakeAdmin(() => [{ n: 120_000 }]);
    expect(await countIngestedRows(client, TABLE)).toBe(120_000);
    expect(String(calls[0].args.p_query)).toContain(TABLE);
  });

  // count(*) volta como bigint, que o PostgREST pode entregar em texto.
  it("accepts the count as a string", async () => {
    const { client } = fakeAdmin(() => [{ n: "306430" }]);
    expect(await countIngestedRows(client, TABLE)).toBe(306_430);
  });

  it("reads an empty table as zero", async () => {
    const { client } = fakeAdmin(() => []);
    expect(await countIngestedRows(client, TABLE)).toBe(0);
  });

  it("refuses a table name that is not a plain identifier", async () => {
    const { client } = fakeAdmin();
    await expect(countIngestedRows(client, "x; drop table y")).rejects.toThrow(
      "invalid table name"
    );
  });
});
