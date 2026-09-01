-- ============================================================================
-- Atlas Insight AI — 0025 Loja de modelos Power BI: fundação.
--
-- O que esta migração cria é a parte cujo erro é caro: quem comprou o quê,
-- quem pode baixar, e em que estado está cada pedido. A vitrine e o checkout
-- vêm depois e mudam com facilidade; isto aqui, não — um pedido que libera
-- download sem pagamento confirmado, ou um cliente que enxerga a compra de
-- outro, não se conserta com um deploy.
--
-- Três decisões que valem explicar:
--
-- 1. ESTILO É VARIAÇÃO, NÃO PRODUTO. "Executive Sales · BLACK" e o mesmo
--    modelo em WHITE são a mesma peça com outro acabamento. Tratá-los como
--    produtos separados duplicaria descrição, preço e histórico, e faria o
--    catálogo crescer por multiplicação.
--
-- 2. O DIREITO DE BAIXAR É UMA LINHA PRÓPRIA (store_entitlements), não uma
--    consulta ao pedido. Reembolso, cortesia, revogação e acesso vitalício a
--    atualizações são estados do DIREITO, não do pagamento — e amarrar um ao
--    outro é como um estorno acaba apagando o acesso de quem tinha direito.
--
-- 3. O ARQUIVO NUNCA É PÚBLICO. Fica num bucket privado; o download sai por
--    URL assinada de vida curta, emitida só depois de conferir o direito.
--
-- Idempotente: pode rodar de novo sem efeito.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bucket privado dos arquivos vendidos.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('store-assets', 'store-assets', false, 524288000)  -- 500 MiB por arquivo
on conflict (id) do update set public = false;

-- Sem política de leitura para o cliente: NINGUÉM lê este bucket com o
-- próprio token. O download passa obrigatoriamente pelo servidor, que confere
-- o direito e só então assina uma URL temporária.

-- ----------------------------------------------------------------------------
-- Produtos
-- ----------------------------------------------------------------------------
create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  -- Slug é a URL indexável (/templates/executive-sales) e não muda depois de
  -- publicado: link quebrado perde o tráfego que a página levou meses a ganhar.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  subtitle text,
  description text,
  category text,
  -- draft nunca aparece na vitrine; archived some da vitrine mas continua
  -- baixável por quem já comprou.
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  -- Preço base; cada estilo pode sobrescrever.
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'BRL',
  compatibility text,
  license text,
  seo_title text,
  seo_description text,
  cover_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Estilos: a variação que o cliente escolhe antes de comprar.
-- ----------------------------------------------------------------------------
create table if not exists public.store_product_styles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete cascade,
  style text not null check (style in ('BLACK', 'MODERN', 'CLEAN', 'WHITE', 'EXECUTIVE', 'DARK', 'LIGHT')),
  name text not null,
  description text,
  pages integer,
  components integer,
  -- Nulo = usa o preço do produto.
  price_cents integer check (price_cents >= 0),
  preview_urls text[] not null default '{}',
  -- Caminho do .pbix no bucket privado. Nunca vai para o cliente.
  asset_path text,
  asset_bytes bigint,
  -- Revisão interna. O cliente vê "Executive Sales Dashboard", nunca "V5".
  revision integer not null default 1 check (revision >= 1),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, style)
);

create index if not exists store_product_styles_product_idx
  on public.store_product_styles (product_id);

-- Vitrine é pública por definição: a página precisa ser indexável, e visitante
-- sem conta tem de conseguir ver o que está à venda.
alter table public.store_products enable row level security;
alter table public.store_product_styles enable row level security;

drop policy if exists store_products_read on public.store_products;
create policy store_products_read on public.store_products
  for select using (status = 'active');

drop policy if exists store_product_styles_read on public.store_product_styles;
create policy store_product_styles_read on public.store_product_styles
  for select using (
    published and exists (
      select 1 from public.store_products p
      where p.id = product_id and p.status = 'active'
    )
  );

-- Escrita só pelo service role: catálogo se edita pela área administrativa.

-- ----------------------------------------------------------------------------
-- Pedidos
-- ----------------------------------------------------------------------------
create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  -- Número curto para o cliente citar em suporte. O uuid não serve para isso.
  reference text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED')),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'BRL',
  method text check (method in ('pix', 'card')),
  -- Qual provedor processou. Guardado no PEDIDO, não numa configuração global:
  -- trocar de gateway não pode reescrever a história de quem já comprou.
  gateway text,
  gateway_reference text,
  -- Nada de dado de cartão aqui. Só o que o gateway devolve sobre a transação.
  gateway_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  paid_at timestamptz,
  failed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_orders_org_idx
  on public.store_orders (organization_id, created_at desc);
create index if not exists store_orders_gateway_idx
  on public.store_orders (gateway, gateway_reference);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders (id) on delete cascade,
  product_id uuid not null references public.store_products (id) on delete restrict,
  style_id uuid not null references public.store_product_styles (id) on delete restrict,
  -- Preço e revisão CONGELADOS no momento da compra: mudar a tabela de preços
  -- não pode reescrever o que o cliente pagou, e o recibo tem de bater com o
  -- extrato do cartão para sempre.
  price_cents integer not null check (price_cents >= 0),
  revision integer not null,
  product_name text not null,
  style text not null,
  created_at timestamptz not null default now(),
  unique (order_id, style_id)
);

create index if not exists store_order_items_order_idx
  on public.store_order_items (order_id);

alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

drop policy if exists store_orders_read on public.store_orders;
create policy store_orders_read on public.store_orders
  for select using (app.is_org_member(organization_id));

drop policy if exists store_order_items_read on public.store_order_items;
create policy store_order_items_read on public.store_order_items
  for select using (
    exists (select 1 from public.store_orders o
            where o.id = order_id and app.is_org_member(o.organization_id))
  );

-- ----------------------------------------------------------------------------
-- Direito de baixar
--
-- Tabela própria de propósito: reembolso, cortesia e revogação são estados do
-- DIREITO, não do pagamento. Derivar o acesso do pedido faz um estorno apagar
-- o acesso de quem tinha direito, e faz uma cortesia exigir um pedido falso.
-- ----------------------------------------------------------------------------
create table if not exists public.store_entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.store_products (id) on delete restrict,
  style_id uuid not null references public.store_product_styles (id) on delete restrict,
  order_id uuid references public.store_orders (id) on delete set null,
  source text not null default 'purchase' check (source in ('purchase', 'grant', 'bundle')),
  -- Revisão em que a compra aconteceu. O cliente recebe atualizações, mas
  -- guardar isto é o que permite dizer "há versão nova" e voltar atrás.
  purchased_revision integer not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  -- Uma organização não compra o mesmo estilo duas vezes.
  unique (organization_id, style_id)
);

create index if not exists store_entitlements_org_idx
  on public.store_entitlements (organization_id) where revoked_at is null;

alter table public.store_entitlements enable row level security;

drop policy if exists store_entitlements_read on public.store_entitlements;
create policy store_entitlements_read on public.store_entitlements
  for select using (app.is_org_member(organization_id));

-- ----------------------------------------------------------------------------
-- Downloads: quem baixou o quê e quando.
-- ----------------------------------------------------------------------------
create table if not exists public.store_downloads (
  id bigint generated always as identity primary key,
  entitlement_id uuid not null references public.store_entitlements (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  revision integer not null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists store_downloads_entitlement_idx
  on public.store_downloads (entitlement_id, created_at desc);

alter table public.store_downloads enable row level security;

drop policy if exists store_downloads_read on public.store_downloads;
create policy store_downloads_read on public.store_downloads
  for select using (
    exists (select 1 from public.store_entitlements e
            where e.id = entitlement_id and app.is_org_member(e.organization_id))
  );

-- ----------------------------------------------------------------------------
-- Funil: cada passo que leva (ou não) à compra.
-- ----------------------------------------------------------------------------
create table if not exists public.store_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in (
    'catalog_view', 'product_view', 'preview_open', 'style_select',
    'checkout_start', 'payment_start', 'payment_paid', 'payment_failed', 'download'
  )),
  product_id uuid references public.store_products (id) on delete set null,
  style_id uuid references public.store_product_styles (id) on delete set null,
  order_id uuid references public.store_orders (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists store_events_kind_idx on public.store_events (kind, created_at desc);
alter table public.store_events enable row level security;
-- Sem política de leitura: funil é dado do negócio, lido pelo service role.

-- ----------------------------------------------------------------------------
-- Liberar o pedido pago.
--
-- Idempotente e atômica: o webhook do gateway repete, e repetir não pode
-- duplicar direito nem disparar duas vezes o que vier depois. Só um pedido
-- PAID libera — é aqui que "nunca confiar no frontend" vira código.
-- ----------------------------------------------------------------------------
create or replace function public.store_grant_order(order_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  o record;
  granted integer := 0;
begin
  select * into o from public.store_orders where id = order_id for update;
  if o is null then
    raise exception 'pedido % não existe', order_id;
  end if;
  if o.status <> 'PAID' then
    -- Não é erro: o webhook pode chegar antes da confirmação. Liberar aqui é
    -- que seria o defeito.
    return 0;
  end if;

  insert into public.store_entitlements
    (organization_id, product_id, style_id, order_id, source, purchased_revision)
  select o.organization_id, i.product_id, i.style_id, o.id, 'purchase', i.revision
  from public.store_order_items i
  where i.order_id = o.id
  on conflict (organization_id, style_id) do update
    -- Recomprou depois de um estorno: o direito volta, não duplica.
    set revoked_at = null,
        order_id = excluded.order_id,
        purchased_revision = greatest(public.store_entitlements.purchased_revision,
                                      excluded.purchased_revision);

  get diagnostics granted = row_count;
  return granted;
end;
$$;

revoke execute on function public.store_grant_order(uuid) from public, anon, authenticated;
grant execute on function public.store_grant_order(uuid) to service_role;
