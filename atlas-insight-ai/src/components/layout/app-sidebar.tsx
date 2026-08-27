"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookText,
  Bot,
  Check,
  ChevronsUpDown,
  Compass,
  CreditCard,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Network,
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

const NAV = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/dashboards", label: "Dashboards", icon: LayoutDashboard },
  { href: "/data-sources", label: "Data Sources", icon: Database },
  { href: "/data-model", label: "Data Model", icon: Network },
  { href: "/metrics", label: "Metrics", icon: Sigma },
  { href: "/business-rules", label: "Business Rules", icon: BookText },
  { href: "/ai-analyst", label: "AI Analyst", icon: Bot },
  { href: "/files", label: "Files", icon: FileText },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface AppSidebarProps {
  profile: Profile;
  organization: Organization;
  workspaces: Workspace[];
  workspace: Workspace;
  role: OrgRole;
}

export function AppSidebar({ profile, organization, workspaces, workspace, role }: AppSidebarProps) {
  const pathname = usePathname();
  const initials =
    (profile.full_name || profile.email)
      .split(/[\s@.]+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "U";

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        <Compass className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight text-foreground">Atlas Insight AI</span>
      </div>

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
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((w) => (
              <DropdownMenuItem key={w.id} onSelect={() => switchWorkspace(w.id)}>
                <span className="flex-1 truncate">{w.name}</span>
                {w.id === workspace.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          // Longest matching href wins so /settings/billing doesn't also
          // highlight /settings.
          const matches = NAV.filter(
            (o) => pathname === o.href || pathname.startsWith(`${o.href}/`)
          );
          const best = matches.reduce((a, b) => (b.href.length > (a?.href.length ?? 0) ? b : a), matches[0]);
          const active = best?.href === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent/60">
            <Avatar className="h-8 w-8">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {profile.full_name || profile.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {role}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
