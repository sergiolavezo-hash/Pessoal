"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookText,
  Bot,
  Boxes,
  Check,
  ChevronsUpDown,
  Compass,
  CreditCard,
  Database,
  FileUp,
  Gauge,
  LayoutDashboard,
  LogOut,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sigma,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgRole, Organization, Profile, Workspace } from "@/types";
import { switchWorkspace, signOut } from "@/app/actions/workspace";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * O menu segue a ordem de trabalho, não a ordem alfabética: primeiro os
 * dados entram, depois ganham significado, e só então viram painéis. Quem
 * abre a ferramenta pela primeira vez lê o menu de cima para baixo e sabe
 * o que fazer.
 */
const NAV_GROUPS: Array<{ label: string | null; items: Array<{ href: string; label: string; icon: typeof Gauge }> }> = [
  {
    label: null,
    items: [
      // Primeiro item de propósito: quem chega sem saber por onde começar
      // encontra o caminho antes de encontrar as telas técnicas.
      { href: "/como-usar", label: "Como usar o Atlas", icon: Compass },
      { href: "/dashboard", label: "Início", icon: Gauge },
    ],
  },
  {
    label: "1 · Seus dados",
    items: [
      { href: "/files", label: "Enviar dados", icon: FileUp },
      { href: "/data-sources", label: "Fontes de dados", icon: Database },
      { href: "/data-model", label: "Modelo de dados", icon: Network },
      { href: "/modelos", label: "Modelos", icon: Boxes },
    ],
  },
  {
    label: "2 · Definições",
    items: [
      { href: "/metrics", label: "Indicadores", icon: Sigma },
      { href: "/business-rules", label: "Regras de negócio", icon: BookText },
    ],
  },
  {
    label: "3 · Análise",
    items: [
      { href: "/dashboards", label: "Painéis", icon: LayoutDashboard },
      { href: "/ai-analyst", label: "Perguntar à IA", icon: Bot },
    ],
  },
  {
    label: "Conta",
    items: [
      { href: "/settings/billing", label: "Cobrança", icon: CreditCard },
      { href: "/settings", label: "Configurações", icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

interface AppSidebarProps {
  profile: Profile;
  organization: Organization;
  workspaces: Workspace[];
  workspace: Workspace;
  role: OrgRole;
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({
  profile,
  organization,
  workspaces,
  workspace,
  role,
  collapsed,
  onToggle,
}: AppSidebarProps) {
  const pathname = usePathname();
  const initials =
    (profile.full_name || profile.email)
      .split(/[\s@.]+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "U";

  // O href mais longo que casa vence, para /settings/billing não acender
  // também /settings.
  const matches = ALL_ITEMS.filter(
    (o) => pathname === o.href || pathname.startsWith(`${o.href}/`)
  );
  const activeHref = matches.reduce(
    (a, b) => (b.href.length > (a?.href.length ?? 0) ? b : a),
    matches[0]
  )?.href;

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex items-center gap-2 pb-2 pt-4", collapsed ? "justify-center px-2" : "px-4")}>
        <Compass className="h-5 w-5 shrink-0 text-primary" />
        {!collapsed && (
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
            Atlas Insight AI
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-accent">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{workspace.name}</p>
                <p className="truncate text-xs text-muted-foreground">{organization.name}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>Áreas de trabalho</DropdownMenuLabel>
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id} onSelect={() => switchWorkspace(w.id)}>
                  <span className="flex-1 truncate">{w.name}</span>
                  {w.id === workspace.id && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? "root"} className={index > 0 ? "mt-4" : undefined}>
            {group.label &&
              (collapsed ? (
                <div className="mx-2 mb-2 border-t" aria-hidden />
              ) : (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
              ))}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2" : "gap-2.5 px-3",
                    activeHref === item.href
                      ? "bg-sidebar-accent text-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t", collapsed ? "p-2" : "p-3")}>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
          className={cn(
            "mb-2 flex w-full items-center rounded-md py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground",
            collapsed ? "justify-center px-2" : "gap-2.5 px-3"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Recolher menu</span>
            </>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex w-full items-center rounded-md py-1.5 text-left transition-colors hover:bg-sidebar-accent/60",
              collapsed ? "justify-center px-1" : "gap-2.5 px-2"
            )}
            title={collapsed ? (profile.full_name || profile.email) : undefined}
          >
            <Avatar className="h-8 w-8 shrink-0">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {profile.full_name || profile.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {role}
                </Badge>
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut()}>
              <LogOut />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
