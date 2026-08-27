-- ============================================================================
-- Atlas Insight AI — 0008 Signup profile
-- Full registration data (phone, company) captured at signup, plus a
-- welcome flag so the "cadastro efetivado" email is sent exactly once.
-- ============================================================================

alter table public.profiles
  add column if not exists phone text,
  add column if not exists company text,
  add column if not exists welcomed_at timestamptz;

-- Copy the extra signup metadata into the profile row.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, phone, company)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'company'
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    company = coalesce(excluded.company, public.profiles.company);
  return new;
end;
$$;
