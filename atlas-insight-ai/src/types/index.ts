// Shared domain types. Database rows are represented as plain interfaces —
// keep in sync with supabase/migrations.

export type OrgRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
export type Plan = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  company: string | null;
  welcomed_at: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete"
  | "expired";

export interface Subscription {
  id: string;
  organization_id: string;
  plan: Plan;
  plan_id: string | null;
  status: SubscriptionStatus;
  billing_interval: "monthly" | "yearly" | null;
  trial_started_at: string;
  trial_ends_at: string;
  trial_dashboard_runs_used: number;
  trial_dashboard_runs_limit: number;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  external_customer_id: string | null;
  external_subscription_id: string | null;
}

export interface BillingPlan {
  id: string;
  name: string;
  tier: Plan;
  price_monthly_cents: number | null;
  price_yearly_cents: number | null;
  currency: string;
  trial_days: number;
  trial_dashboard_runs: number;
  limits: Record<string, number>;
  active: boolean;
}

export interface PaymentTransaction {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  amount_cents: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  description: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface TrialVerdict {
  allowed: boolean;
  view_allowed?: boolean;
  reason: string;
  runs_remaining?: number;
  trial_ends_at?: string;
}

export type DataSourceType =
  | "bigquery"
  | "postgres"
  | "sqlserver"
  | "mysql"
  | "oracle"
  | "azuresql"
  | "snowflake"
  | "redshift"
  | "databricks"
  | "file"
  | "rest";

export type DataSourceStatus = "PENDING" | "CONNECTED" | "ERROR" | "SYNCING";

export interface DataSource {
  id: string;
  workspace_id: string;
  name: string;
  type: DataSourceType;
  status: DataSourceStatus;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dataset {
  id: string;
  workspace_id: string;
  data_source_id: string;
  name: string;
}

export interface CatalogTable {
  id: string;
  workspace_id: string;
  dataset_id: string;
  name: string;
  row_count: number | null;
  profiled_at: string | null;
}

export type ColumnClassification =
  | "ID"
  | "FOREIGN_KEY"
  | "DIMENSION"
  | "MEASURE"
  | "DATE"
  | "TEXT"
  | "BOOLEAN"
  | "CATEGORY";

export interface ColumnProfile {
  row_count?: number;
  unique_count?: number;
  cardinality?: number;
  null_percentage?: number;
  min?: string | number | null;
  max?: string | number | null;
  average?: number | null;
  sample_values?: unknown[];
}

export interface CatalogColumn {
  id: string;
  workspace_id: string;
  table_id: string;
  name: string;
  data_type: string;
  ordinal: number;
  nullable: boolean;
  profile: ColumnProfile;
  classification: { classification?: ColumnClassification; confidence?: number };
}

export interface CatalogRelationship {
  id: string;
  workspace_id: string;
  source_column_id: string;
  target_column_id: string;
  relationship_type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  confidence: number;
  reason: string | null;
  source: "inferred" | "declared" | "confirmed";
}

export type MetricStatus = "DRAFT" | "VALIDATED" | "ACTIVE" | "DEPRECATED";

export interface Metric {
  id: string;
  workspace_id: string;
  semantic_model_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  formula: string;
  aggregation: string | null;
  format: string;
  status: MetricStatus;
  certified: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessRule {
  id: string;
  workspace_id: string;
  name: string;
  natural_language_definition: string;
  structured_definition: Record<string, unknown>;
  affected_metrics: string[];
  affected_entities: string[];
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Dashboard {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  spec: Record<string, unknown>;
  version: number;
  generated_by_ai: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  data_source_id: string | null;
  name: string;
  kind: "data" | "document";
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  error: string | null;
  created_at: string;
}

export interface AiConversation {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface QueryExecution {
  id: string;
  workspace_id: string;
  data_source_id: string | null;
  sql: string;
  dialect: string | null;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMEOUT" | "BLOCKED";
  row_count: number | null;
  duration_ms: number | null;
  error: string | null;
  context: Record<string, unknown>;
  created_at: string;
}

export interface SemanticModelRow {
  id: string;
  workspace_id: string;
  data_source_id: string | null;
  name: string;
  version: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  definition: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
