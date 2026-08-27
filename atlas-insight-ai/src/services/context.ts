import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole, Organization, Profile, Workspace } from "@/types";

export const WORKSPACE_COOKIE = "atlas-workspace";

export interface AppContext {
  userId: string;
  profile: Profile;
  organizations: Array<Organization & { role: OrgRole }>;
  organization: Organization & { role: OrgRole };
  workspaces: Workspace[];
  workspace: Workspace;
  role: OrgRole;
}

/**
 * Resolves the authenticated user's current organization + workspace.
 * Redirects to /login when unauthenticated and /onboarding when the user
 * has no organization yet.
 */
export async function getAppContext(): Promise<AppContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("organization_members")
      .select("role, organizations(*)")
      .eq("user_id", user.id),
  ]);

  const organizations = (memberships ?? [])
    .map((m) => {
      const org = m.organizations as unknown as Organization | null;
      return org ? { ...org, role: m.role as OrgRole } : null;
    })
    .filter((o): o is Organization & { role: OrgRole } => o !== null);

  if (organizations.length === 0) redirect("/onboarding");

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .in(
      "organization_id",
      organizations.map((o) => o.id)
    )
    .is("deleted_at", null)
    .order("created_at");

  const allWorkspaces = (workspaces ?? []) as Workspace[];
  if (allWorkspaces.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const preferred = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const workspace = allWorkspaces.find((w) => w.id === preferred) ?? allWorkspaces[0];
  const organization = organizations.find((o) => o.id === workspace.organization_id) ?? organizations[0];

  return {
    userId: user.id,
    profile: (profile ?? { id: user.id, email: user.email ?? "", full_name: null, avatar_url: null }) as Profile,
    organizations,
    organization,
    workspaces: allWorkspaces.filter((w) => w.organization_id === organization.id),
    workspace,
    role: organization.role,
  };
}
