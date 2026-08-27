-- =====================================================================
-- Atlas Insight AI — 0001_core
-- Identidade, multi-tenancy (Organization → Workspace) e RBAC com RLS.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type public.org_role as enum ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
create type public.plan_tier as enum ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE');

-- ---------- Profiles (espelho de auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Organizations ----------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  plan public.plan_tier not null default 'FREE',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'VIEWER',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index idx_org_members_user on public.organization_members (user_id);

-- ---------- Workspaces ----------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  description text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_workspaces_org on public.workspaces (organization_id);

-- ---------- Audit log ----------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete set null,
  workspace_id uuid references public.workspaces (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  result text not null default 'SUCCESS',
  detail jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_org_time on public.audit_logs (organization_id, created_at desc);

-- ---------- Helpers de autorização (SECURITY DEFINER evita recursão de RLS) ----------
create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role_of(org uuid)
returns public.org_role language sql stable security definer set search_path = public as $$
  select m.role from public.organization_members m
  where m.organization_id = org and m.user_id = auth.uid();
$$;

create or replace function public.has_org_role(org uuid, min_role public.org_role)
returns boolean language sql stable security definer set search_path = public as $$
  select case public.org_role_of(org)
    when 'OWNER' then true
    when 'ADMIN' then min_role in ('ADMIN', 'EDITOR', 'VIEWER')
    when 'EDITOR' then min_role in ('EDITOR', 'VIEWER')
    when 'VIEWER' then min_role = 'VIEWER'
    else false
  end;
$$;

create or replace function public.workspace_org(ws uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select w.organization_id from public.workspaces w where w.id = ws;
$$;

-- ---------- Trigger: perfil automático + updated_at ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_orgs_touch before update on public.organizations
  for each row execute function public.touch_updated_at();
create trigger trg_workspaces_touch before update on public.workspaces
  for each row execute function public.touch_updated_at();

-- ---------- RPC: criar organização + membership OWNER + workspace inicial ----------
create or replace function public.create_organization(org_name text, org_slug text, ws_name text default 'Principal')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_org uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.organizations (name, slug, created_by)
  values (org_name, org_slug, auth.uid())
  returning id into new_org;
  insert into public.organization_members (organization_id, user_id, role)
  values (new_org, auth.uid(), 'OWNER');
  insert into public.workspaces (organization_id, name, created_by)
  values (new_org, ws_name, auth.uid());
  insert into public.audit_logs (organization_id, user_id, action, resource_type, resource_id)
  values (new_org, auth.uid(), 'CREATE', 'organization', new_org::text);
  return new_org;
end;
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: cada usuário vê e edita o próprio
create policy profiles_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid());

-- Organizations: membros leem; OWNER/ADMIN atualizam; criação via RPC
create policy orgs_select on public.organizations
  for select using (public.is_org_member(id) and deleted_at is null);
create policy orgs_update on public.organizations
  for update using (public.has_org_role(id, 'ADMIN'));

-- Members: membros veem o time; ADMIN gerencia
create policy members_select on public.organization_members
  for select using (public.is_org_member(organization_id));
create policy members_insert on public.organization_members
  for insert with check (public.has_org_role(organization_id, 'ADMIN'));
create policy members_update on public.organization_members
  for update using (public.has_org_role(organization_id, 'ADMIN'));
create policy members_delete on public.organization_members
  for delete using (
    public.has_org_role(organization_id, 'ADMIN') or user_id = auth.uid()
  );

-- Workspaces: membros leem; EDITOR+ cria/edita; ADMIN+ exclui
create policy ws_select on public.workspaces
  for select using (public.is_org_member(organization_id) and deleted_at is null);
create policy ws_insert on public.workspaces
  for insert with check (public.has_org_role(organization_id, 'EDITOR'));
create policy ws_update on public.workspaces
  for update using (public.has_org_role(organization_id, 'EDITOR'));
create policy ws_delete on public.workspaces
  for delete using (public.has_org_role(organization_id, 'ADMIN'));

-- Audit: membros leem, ninguém edita (insert via service role/definer)
create policy audit_select on public.audit_logs
  for select using (organization_id is not null and public.is_org_member(organization_id));
