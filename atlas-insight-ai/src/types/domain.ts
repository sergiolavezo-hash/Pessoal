/** Tipos de domínio compartilhados do Atlas Insight AI. */

export type OrgRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
export type PlanTier = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

export type DataSourceKind = "BIGQUERY" | "POSTGRES" | "SQLSERVER" | "FILE";
export type FileFormat = "CSV" | "XLSX";

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE"
  | "EXPIRED";

export type ColumnClassification =
  | "ID"
  | "METRIC"
  | "DIMENSION"
  | "DATE"
  | "TEXT"
  | "GEO"
  | "PII"
  | "UNKNOWN";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
}

export interface Membership {
  organization_id: string;
  user_id: string;
  role: OrgRole;
}

export interface DataSource {
  id: string;
  workspace_id: string;
  kind: DataSourceKind;
  name: string;
  /** Configuração NÃO sensível (host, project id, dataset...). Nunca segredos. */
  config: Record<string, unknown>;
  status: string;
  last_tested_at: string | null;
}

export interface ColumnProfile {
  nullRate: number;
  distinctCount: number | null;
  min: string | number | null;
  max: string | number | null;
  sampleValues: Array<string | number | null>;
}

export interface SourceColumn {
  id: string;
  table_id: string;
  name: string;
  data_type: string;
  classification: ColumnClassification;
  classification_confidence: number;
  profile: ColumnProfile | null;
}

export interface MetricDefinition {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  description: string | null;
  expression: string;
  status: "DRAFT" | "VALIDATED" | "ACTIVE" | "DEPRECATED";
  certified: boolean;
}

export interface DashboardSpec {
  version: 1;
  title: string;
  description?: string;
  filters: DashboardFilter[];
  layout: DashboardBlock[];
}

export interface DashboardFilter {
  id: string;
  label: string;
  column: string;
  type: "select" | "multiselect" | "daterange" | "search";
}

export interface DashboardBlock {
  id: string;
  type: "kpi" | "line" | "bar" | "area" | "pie" | "table" | "text";
  title: string;
  metricSlug?: string;
  sql?: string;
  narrative?: string;
  grid: { x: number; y: number; w: number; h: number };
}

export interface TrialVerdict {
  allowed: boolean;
  reason: string;
  runs_remaining?: number;
  trial_ends_at?: string;
}
