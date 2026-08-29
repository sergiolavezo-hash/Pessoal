import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/types";

const ROLE_ORDER: Record<OrgRole, number> = { OWNER: 4, ADMIN: 3, EDITOR: 2, VIEWER: 1 };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export interface ApiContext {
  supabase: SupabaseClient;
  user: User;
  workspaceId: string;
  organizationId: string;
  role: OrgRole;
}

/**
 * Authenticates the request and verifies the caller's membership + role for
 * the given workspace. Every API route must go through this.
 */
export async function requireWorkspace(workspaceId: string | null, minRole: OrgRole = "VIEWER"): Promise<ApiContext> {
  if (!workspaceId) throw new ApiError(400, "workspaceId is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Not authenticated");

  // RLS already guarantees visibility; this also gives us the org + role.
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", workspaceId)
    .single();
  if (!workspace) throw new ApiError(404, "Workspace not found");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", workspace.organization_id)
    .eq("user_id", user.id)
    .single();
  if (!membership) throw new ApiError(403, "Not a member of this workspace");

  const role = membership.role as OrgRole;
  if (ROLE_ORDER[role] < ROLE_ORDER[minRole]) {
    throw new ApiError(403, `Requires ${minRole} role`);
  }

  return { supabase, user, workspaceId, organizationId: workspace.organization_id, role };
}

/**
 * Contexto para trabalhos automáticos (cron), que não têm usuário logado.
 *
 * Usa o cliente de serviço, então RLS não se aplica — por isso o workspace é
 * resolvido explicitamente e tudo o que roda em cima recebe esse escopo. O
 * "usuário" é o dono da organização, para que auditoria e eventos de uso
 * apontem para alguém real em vez de um id inventado.
 *
 * Nunca chame isto a partir de uma rota que atende o navegador: quem decide
 * o workspace aqui é o servidor, não o pedido.
 */
export async function systemWorkspaceContext(workspaceId: string): Promise<ApiContext> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", workspaceId)
    .single();
  if (!workspace) throw new ApiError(404, "Workspace not found");

  const { data: owner } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", workspace.organization_id)
    .in("role", ["OWNER", "ADMIN"])
    .order("role")
    .limit(1)
    .maybeSingle();
  if (!owner) throw new ApiError(404, "Organization has no owner");

  return {
    supabase,
    user: { id: owner.user_id as string } as User,
    workspaceId,
    organizationId: workspace.organization_id as string,
    role: "OWNER",
  };
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api]", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function auditLog(
  ctx: ApiContext,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata: Record<string, unknown> = {},
  result: "success" | "failure" = "success"
) {
  await ctx.supabase.from("audit_logs").insert({
    organization_id: ctx.organizationId,
    workspace_id: ctx.workspaceId,
    user_id: ctx.user.id,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    result,
    metadata,
  });
}
