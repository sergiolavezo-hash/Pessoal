import { BookText } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NewRuleDialog } from "@/features/business-rules/new-rule-dialog";
import { ObjectMenu } from "@/components/ui/object-menu";
import type { BusinessRule } from "@/types";

export const metadata = { title: "Business Rules" };

export default async function BusinessRulesPage() {
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("business_rules")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });

  const rules = (data ?? []) as BusinessRule[];
  const canEdit = ctx.role !== "VIEWER";

  return (
    <div>
      <PageHeader
        title="Business Rules"
        description="Teach Atlas how your business works. Rules are applied to every relevant analysis."
        actions={canEdit ? <NewRuleDialog workspaceId={ctx.workspace.id} /> : undefined}
      />

      {rules.length === 0 ? (
        <EmptyState
          icon={BookText}
          title="No business rules yet"
          description='Examples: "Only count approved sales." · "An active customer purchased in the last 90 days."'
          action={canEdit ? <NewRuleDialog workspaceId={ctx.workspace.id} /> : undefined}
        />
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const structured = rule.structured_definition ?? {};
            const sqlHint = typeof structured.sql_hint === "string" ? structured.sql_hint : null;
            return (
              <Card key={rule.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        “{rule.natural_language_definition}”
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.status === "ACTIVE" ? "success" : "secondary"}>{rule.status}</Badge>
                      <span className="text-xs text-muted-foreground">v{rule.version}</span>
                      {canEdit && (
                        <ObjectMenu
                          deleteEndpoint={`/api/business-rules/${rule.id}?workspaceId=${ctx.workspace.id}`}
                          deleteConfirm={`Delete rule "${rule.name}"?`}
                          moveEndpoint={`/api/business-rules/${rule.id}`}
                          moveBody={{ workspaceId: ctx.workspace.id }}
                          currentFolder={(rule as { folder?: string | null }).folder ?? null}
                        />
                      )}
                    </div>
                  </div>
                  {sqlHint && (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Structured interpretation
                      </p>
                      <code className="mt-1 block rounded-md bg-muted p-2 font-mono text-xs">{sqlHint}</code>
                    </div>
                  )}
                  {rule.affected_entities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {rule.affected_entities.map((e) => (
                        <Badge key={e} variant="outline">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">Created {relativeTime(rule.created_at)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
