import type { DataSourceKind } from "@/types/domain";
import type { ConnectorFactory } from "./types";

/**
 * Registro de conectores. As implementações reais (BigQuery, Postgres,
 * SQL Server, arquivos) chegam na FASE 2 e se registram aqui — o resto
 * da plataforma resolve conectores apenas por `kind`.
 */

const registry = new Map<DataSourceKind, ConnectorFactory>();

export function registerConnector(kind: DataSourceKind, factory: ConnectorFactory): void {
  if (registry.has(kind)) {
    throw new Error(`Conector já registrado para ${kind}.`);
  }
  registry.set(kind, factory);
}

export function getConnectorFactory(kind: DataSourceKind): ConnectorFactory {
  const factory = registry.get(kind);
  if (!factory) {
    throw new Error(
      `Nenhum conector registrado para ${kind}. Disponíveis: ${
        registry.size ? [...registry.keys()].join(", ") : "(nenhum)"
      }.`
    );
  }
  return factory;
}

export function listRegisteredConnectors(): DataSourceKind[] {
  return [...registry.keys()];
}

/** Apenas para testes. */
export function resetConnectorRegistry(): void {
  registry.clear();
}
