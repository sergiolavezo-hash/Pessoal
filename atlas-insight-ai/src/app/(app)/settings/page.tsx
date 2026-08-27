import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Profile } from "@/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("organization_members")
    .select("id, role, created_at, profiles(id, email, full_name)")
    .eq("organization_id", ctx.organization.id)
    .order("created_at");

  return (
    <div>
      <PageHeader title="Settings" description="Organization, workspace and team management." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Organization</CardTitle>
            <CardDescription>Your organization details and plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{ctx.organization.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-xs">{ctx.organization.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge>{ctx.organization.plan}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your role</span>
              <Badge variant="secondary">{ctx.role}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Workspace</CardTitle>
            <CardDescription>The workspace you are currently working in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{ctx.workspace.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Workspace ID</span>
              <span className="font-mono text-xs">{ctx.workspace.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Team members</CardTitle>
          <CardDescription>
            Members of {ctx.organization.name}. Roles control what each member can do: OWNER and
            ADMIN manage the organization, EDITOR creates and edits resources, VIEWER has
            read-only access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members ?? []).map((m) => {
                const profile = m.profiles as unknown as Profile | null;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{profile?.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{profile?.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.role}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
