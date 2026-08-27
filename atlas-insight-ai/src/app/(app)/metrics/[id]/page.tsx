import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricActions } from "@/features/metrics/metric-actions";
import { parseFormula, metricDependencies, fieldReferences } from "@/metrics/formula";
import type { BusinessRule, Metric } from "@/types";

export const metadata = { title: "Metric" };

export default async function MetricDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("metrics")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .is("deleted_at", null)
    .single();
  if (!data) notFound();
  const metric = data as Metric;

  // Explain: parse the formula for dependencies + field lineage.
  let dependencies: string[] = [];
  let fields: Array<{ entity: string; field: string | null }> = [];
  let parseError: string | null = null;
  try {
    const node = parseFormula(metric.formula);
    dependencies = metricDependencies(node);
    fields = fieldReferences(node);
  } catch (error) {
    parseError = error instanceof Error ? error.message : "Formula could not be parsed";
  }

  const { data: rules } = await supabase
    .from("business_rules")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .contains("affected_metrics", [metric.id]);

  const canEdit = ctx.role !== "VIEWER";
  const canCertify = ctx.role === "OWNER" || ctx.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title={metric.name}
        description={metric.description ?? undefined}
        actions={
          <MetricActions
            workspaceId={ctx.workspace.id}
            metricId={metric.id}
            slug={metric.slug}
            formula={metric.formula}
            certified={metric.certified}
            canEdit={canEdit}
            canCertify={canCertify}
          />
        }
      />

      <div className="mb-6 flex items-center gap-2">
        <Badge variant={metric.status === "ACTIVE" || metric.status === "VALIDATED" ? "success" : "secondary"}>
          {metric.status}
        </Badge>
        {metric.certified && (
          <Badge variant="success">
            <BadgeCheck className="h-3 w-3" /> Certified
          </Badge>
        )}
        <Badge variant="outline">v{metric.version}</Badge>
        <Badge variant="outline">{metric.format}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Explain metric</CardTitle>
            <CardDescription>How Atlas computes this metric.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Formula</p>
              <code className="block rounded-md bg-muted p-3 font-mono text-xs">{metric.formula}</code>
              {parseError && <p className="mt-1 text-xs text-destructive">{parseError}</p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Source fields
              </p>
              {fields.length === 0 ? (
                <p className="text-muted-foreground">No direct field references.</p>
              ) : (
                <ul className="space-y-1">
                  {fields.map((f, i) => (
                    <li key={i} className="font-mono text-xs">
                      {f.entity}
                      {f.field ? `.${f.field}` : " (row count)"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Depends on metrics
              </p>
              {dependencies.length === 0 ? (
                <p className="text-muted-foreground">No metric dependencies.</p>
              ) : (
                <ul className="space-y-1">
                  {dependencies.map((d) => (
                    <li key={d} className="font-mono text-xs">
                      metric({d})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Business rules applied</CardTitle>
            <CardDescription>Active rules that affect this metric.</CardDescription>
          </CardHeader>
          <CardContent>
            {(rules ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No business rules affect this metric.</p>
            ) : (
              <ul className="space-y-3">
                {((rules ?? []) as BusinessRule[]).map((r) => (
                  <li key={r.id} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.natural_language_definition}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
