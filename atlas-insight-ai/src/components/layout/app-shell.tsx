"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SIDEBAR_COLLAPSED,
  SIDEBAR_COOKIE,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_EXPANDED,
} from "@/lib/ui-preferences";
import type { OrgRole, Organization, Profile, Workspace } from "@/types";
import type { CreditsSummary } from "@/components/layout/app-sidebar";

/**
 * Guarda o estado do menu e expande a área de conteúdo quando ele é
 * recolhido — sem isso, recolher a barra não ganharia espaço nenhum, porque
 * o conteúdo tem largura máxima própria.
 *
 * A preferência vai para um cookie (não localStorage) para o servidor já
 * renderizar no estado certo, sem piscar na primeira pintura.
 */
export function AppShell({
  profile,
  organization,
  workspaces,
  workspace,
  role,
  initialCollapsed,
  buildRef,
  isStoreAdmin,
  credits,
  banners,
  children,
}: {
  profile: Profile;
  organization: Organization;
  workspaces: Workspace[];
  workspace: Workspace;
  role: OrgRole;
  buildRef?: string | null;
  isStoreAdmin?: boolean;
  credits?: CreditsSummary;
  initialCollapsed: boolean;
  banners?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    const value = next ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
    document.cookie = `${SIDEBAR_COOKIE}=${value};path=/;max-age=${SIDEBAR_COOKIE_MAX_AGE};samesite=lax`;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        profile={profile}
        organization={organization}
        workspaces={workspaces}
        workspace={workspace}
        role={role}
        buildRef={buildRef}
        isStoreAdmin={isStoreAdmin}
        credits={credits}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <main className="min-w-0 flex-1 bg-background">
        {banners}
        <div
          className={cn(
            "mx-auto px-6 py-6 lg:px-8",
            // Menu recolhido: o conteúdo usa a tela toda (com um respiro),
            // que é o ponto de recolher.
            collapsed ? "max-w-[1800px]" : "max-w-7xl"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
