import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConnectorFactory,
  listRegisteredConnectors,
  registerConnector,
  resetConnectorRegistry,
} from "@/connectors/registry";
import type { DataConnector } from "@/connectors/types";

const fakeConnector: DataConnector = {
  kind: "POSTGRES",
  testConnection: vi.fn(async () => ({ ok: true })),
  listTables: vi.fn(async () => []),
  listColumns: vi.fn(async () => []),
  query: vi.fn(async () => ({
    columns: [],
    rows: [],
    rowCount: 0,
    truncated: false,
    elapsedMs: 0,
  })),
  close: vi.fn(async () => undefined),
};

describe("connector registry", () => {
  beforeEach(() => resetConnectorRegistry());

  it("registra e resolve um conector por kind", () => {
    registerConnector("POSTGRES", () => fakeConnector);
    const factory = getConnectorFactory("POSTGRES");
    expect(factory({}, {}).kind).toBe("POSTGRES");
    expect(listRegisteredConnectors()).toEqual(["POSTGRES"]);
  });

  it("impede registro duplicado", () => {
    registerConnector("POSTGRES", () => fakeConnector);
    expect(() => registerConnector("POSTGRES", () => fakeConnector)).toThrow(/já registrado/i);
  });

  it("erro claro para conector inexistente", () => {
    expect(() => getConnectorFactory("BIGQUERY")).toThrow(/Nenhum conector registrado/);
  });
});
