-- ============================================================================
-- Atlas Insight AI — 0001 Foundation
-- Extensions, helper schema, tenancy (profiles, organizations, workspaces),
-- RBAC and RLS helpers.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
-- Vector store for document knowledge (RAG). Available on Supabase by default.
create extension if not exists vector;

create schema if not exists app;

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------
do $$ begin
  create type app.org_role as enum ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Profiles (mirror of auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ----------------------------------------------------------------------------
-- Organizations / members / workspaces
-- ----------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'FREE' check (plan in ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role app.org_role not null default 'VIEWER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_org_members_user on public.organization_members (user_id);
create index if not exists idx_org_members_org on public.organization_members (organization_id);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, slug)
);

create index if not exists idx_workspaces_org on public.workspaces (organization_id);

-- ----------------------------------------------------------------------------
-- RBAC helpers (SECURITY DEFINER to avoid RLS recursion)
-- ----------------------------------------------------------------------------
create or replace function app.is_org_member(org uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function app.org_role(org uuid)
returns app.org_role
language sql stable
security definer set search_path = public
as $$
  select m.role from public.organization_members m
  where m.organization_id = org and m.user_id = auth.uid()
  limit 1;
$$;

-- True when the current user's role in the org is at least `required`.
create or replace function app.has_org_role(org uuid, required app.org_role)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select case app.org_role(org)
    when 'OWNER' then true
    when 'ADMIN' then required in ('ADMIN', 'EDITOR', 'VIEWER')
    when 'EDITOR' then required in ('EDITOR', 'VIEWER')
    when 'VIEWER' then required = 'VIEWER'
    else false
  end;
$$;

create or replace function app.workspace_org(ws uuid)
returns uuid
language sql stable
security definer set search_path = public
as $$
  select organization_id from public.workspaces where id = ws;
$$;

create or replace function app.is_workspace_member(ws uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select app.is_org_member(app.workspace_org(ws));
$$;

create or replace function app.has_workspace_role(ws uuid, required app.org_role)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select app.has_org_role(app.workspace_org(ws), required);
$$;

-- updated_at trigger
create or replace function app.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Bootstrap: create org + workspace + OWNER membership atomically
-- ----------------------------------------------------------------------------
create or replace function public.bootstrap_organization(
  org_name text,
  org_slug text,
  workspace_name text default 'Default'
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  new_org uuid;
  new_ws uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (org_name, org_slug, auth.uid())
  returning id into new_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org, auth.uid(), 'OWNER');

  insert into public.workspaces (organization_id, name, slug, created_by)
  values (new_org, workspace_name, 'default', auth.uid())
  returning id into new_ws;

  return jsonb_build_object('organization_id', new_org, 'workspace_id', new_ws);
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspaces enable row level security;

-- Profiles: users manage their own profile; members of shared orgs can read.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.organization_members me
      join public.organization_members them on them.organization_id = me.organization_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Organizations
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations for select
  using (app.is_org_member(id));

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations for update
  using (app.has_org_role(id, 'ADMIN')) with check (app.has_org_role(id, 'ADMIN'));

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations for delete
  using (app.org_role(id) = 'OWNER');

-- Members
drop policy if exists org_members_select on public.organization_members;
create policy org_members_select on public.organization_members for select
  using (app.is_org_member(organization_id));

drop policy if exists org_members_insert on public.organization_members;
create policy org_members_insert on public.organization_members for insert
  with check (app.has_org_role(organization_id, 'ADMIN'));

drop policy if exists org_members_update on public.organization_members;
create policy org_members_update on public.organization_members for update
  using (app.has_org_role(organization_id, 'ADMIN'))
  with check (app.has_org_role(organization_id, 'ADMIN'));

drop policy if exists org_members_delete on public.organization_members;
create policy org_members_delete on public.organization_members for delete
  using (app.has_org_role(organization_id, 'ADMIN') or user_id = auth.uid());

-- Workspaces
drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces for select
  using (app.is_org_member(organization_id));

drop policy if exists workspaces_insert on public.workspaces;
create policy workspaces_insert on public.workspaces for insert
  with check (app.has_org_role(organization_id, 'ADMIN'));

drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update on public.workspaces for update
  using (app.has_org_role(organization_id, 'ADMIN'))
  with check (app.has_org_role(organization_id, 'ADMIN'));

drop policy if exists workspaces_delete on public.workspaces;
create policy workspaces_delete on public.workspaces for delete
  using (app.has_org_role(organization_id, 'ADMIN'));

-- updated_at triggers
drop trigger if exists set_updated_at on public.organizations;
create trigger set_updated_at before update on public.organizations
  for each row execute function app.set_updated_at();
drop trigger if exists set_updated_at on public.workspaces;
create trigger set_updated_at before update on public.workspaces
  for each row execute function app.set_updated_at();
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function app.set_updated_at();
