"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Table2,
  Network,
  Sigma,
  BookOpenText,
  Sparkles,
  MessageSquareText,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/data-sources", label: "Fontes de dados", icon: Database },
  { href: "/datasets", label: "Datasets", icon: Table2 },
  { href: "/semantic", label: "Modelo semântico", icon: Network },
  { href: "/metrics", label: "Métricas", icon: Sigma },
  { href: "/rules", label: "Regras de negócio", icon: BookOpenText },
  { href: "/dashboards", label: "Dashboards", icon: Sparkles },
  { href: "/analyst", label: "Analista IA", icon: MessageSquareText },
] as const;

const FOOTER_NAV = [
  { href: "/settings/billing", label: "Plano & cobrança", icon: CreditCard },
  { href: "/settings", label: "Configurações", icon: Settings },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent/10 font-semibold text-accent"
          : "text-ink-muted hover:bg-panel-2 hover:text-ink"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function Sidebar({ orgName, userEmail }: { orgName: string; userEmail: string }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-bg-subtle">
      <div className="border-b border-line px-5 py-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            ATLAS<span className="text-accent">.</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Insight AI
          </span>
        </Link>
        <p className="mt-2 truncate text-xs text-ink-dim" title={orgName}>
          {orgName}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-line px-3 py-4">
        {FOOTER_NAV.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </form>
        <p className="truncate px-3 pt-1 text-[11px] text-ink-dim" title={userEmail}>
          {userEmail}
        </p>
      </div>
    </aside>
  );
}
