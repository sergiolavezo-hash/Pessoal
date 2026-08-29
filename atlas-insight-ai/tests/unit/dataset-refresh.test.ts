import { describe, expect, it } from "vitest";
import { schemaFingerprint } from "@/services/dataset-refresh";

/**
 * A impressão digital é o que sustenta o "nada mudou". Se ela variar sem que
 * o esquema tenha mudado, toda atualização reprocessa perfil, modelo semântico
 * e cache — gastando a cota de IA para chegar ao que já estava publicado.
 */
describe("schemaFingerprint", () => {
  const schema = [
    { name: "vendas.data", type: "date" },
    { name: "vendas.valor", type: "numeric" },
  ];

  it("is stable for the same schema", () => {
    expect(schemaFingerprint(schema)).toBe(schemaFingerprint([...schema]));
  });

  it("changes when a column type changes", () => {
    expect(schemaFingerprint(schema)).not.toBe(
      schemaFingerprint([
        { name: "vendas.data", type: "date" },
        { name: "vendas.valor", type: "text" },
      ])
    );
  });

  it("changes when a column is added or removed", () => {
    expect(schemaFingerprint(schema)).not.toBe(
      schemaFingerprint([...schema, { name: "vendas.regiao", type: "text" }])
    );
    expect(schemaFingerprint(schema)).not.toBe(schemaFingerprint([schema[0]]));
  });

  // Duas tabelas diferentes podem ter uma coluna de mesmo nome; sem o
  // prefixo da tabela, trocar uma pela outra passaria por "nada mudou".
  it("separates columns of the same name in different tables", () => {
    expect(
      schemaFingerprint([{ name: "vendas.valor", type: "numeric" }])
    ).not.toBe(schemaFingerprint([{ name: "compras.valor", type: "numeric" }]));
  });

  it("handles an empty schema", () => {
    expect(schemaFingerprint([])).toMatch(/^[0-9a-f]{64}$/);
  });
});
