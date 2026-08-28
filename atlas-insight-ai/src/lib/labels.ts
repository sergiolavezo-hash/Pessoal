/**
 * Rótulos do produto em português.
 *
 * Estados e ações vêm do banco em MAIÚSCULA e em inglês porque é assim que
 * ficam bem num enum; jogá-los direto na tela mistura duas línguas na mesma
 * página e faz o produto parecer inacabado. A tradução vive aqui, num lugar
 * só, para não divergir entre telas.
 */

const SOURCE_STATUS: Record<string, string> = {
  CONNECTED: "Conectada",
  DISCONNECTED: "Desconectada",
  ERROR: "Com erro",
  SYNCING: "Sincronizando",
  PENDING: "Pendente",
};

export function sourceStatusLabel(status: string): string {
  return SOURCE_STATUS[status] ?? status;
}

const AUDIT_ACTIONS: Record<string, string> = {
  uploaded_file: "Arquivo enviado",
  deleted_file: "Arquivo excluído",
  generated_dashboard: "Painel gerado",
  changed_dashboard: "Painel alterado",
  deleted_dashboard: "Painel excluído",
  generated_semantic_model: "Modelo semântico gerado",
  deleted_semantic_model: "Modelo semântico excluído",
  profiled_data_source: "Fonte perfilada",
  synced_data_source: "Fonte sincronizada",
  deleted_data_source: "Fonte excluída",
  created_business_rule: "Regra de negócio criada",
  declared_relationship: "Relacionamento declarado",
  included_column: "Coluna incluída",
  excluded_column: "Coluna excluída",
  deleted_conversation: "Conversa excluída",
  created_metric: "Indicador criado",
  ran_query: "Consulta executada",
  client_error: "Erro no navegador",
};

const RESOURCES: Record<string, string> = {
  dashboard: "painel",
  file: "arquivo",
  data_source: "fonte de dados",
  semantic_model: "modelo semântico",
  business_rule: "regra de negócio",
  relationship: "relacionamento",
  column: "coluna",
  ai_conversation: "conversa",
  metric: "indicador",
  workspace: "área de trabalho",
};

/**
 * "generated_dashboard" + "dashboard" virava "generated dashboard · dashboard":
 * a palavra repetida não informava nada. Quando a ação já cita o recurso, o
 * sufixo é omitido.
 */
export function auditLabel(action: string, resourceType?: string | null): string {
  const label = AUDIT_ACTIONS[action] ?? action.replaceAll("_", " ");
  if (!resourceType) return label;
  const resource = RESOURCES[resourceType] ?? resourceType.replaceAll("_", " ");
  return action.includes(resourceType) ? label : `${label} · ${resource}`;
}
