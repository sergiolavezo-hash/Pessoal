import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, created_at, organizations(name, slug, plan)")
    .eq("user_id", user?.id ?? "");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sua conta</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizações</CardTitle>
          <CardDescription>Times dos quais você participa e seu papel em cada um.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(memberships ?? []).map((m, i) => {
            const org = m.organizations as unknown as {
              name: string;
              slug: string;
              plan: string;
            } | null;
            return (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{org?.name}</p>
                  <p className="text-xs text-ink-dim">
                    membro desde {formatDate(m.created_at as string)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="neutral">{m.role}</Badge>
                  <Badge>{org?.plan}</Badge>
                </div>
              </div>
            );
          })}
          {(memberships ?? []).length === 0 && (
            <p className="text-sm text-ink-muted">Nenhuma organização encontrada.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestão de membros e permissões</CardTitle>
          <CardDescription>
            Convites por e-mail, papéis (OWNER, ADMIN, EDITOR, VIEWER) e workspaces adicionais
            chegam na FASE 7 — Enterprise. A base de RBAC já está ativa no banco.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
