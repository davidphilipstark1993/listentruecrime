-- ============================================================
-- AFFILIATE PRODUCTS
-- Editorial affiliate recommendations (Amazon, Audible, future
-- programmes). Products are managed in /admin/affiliates; where they
-- appear is controlled by affiliate_placements; outbound clicks are
-- logged to affiliate_clicks by /api/affiliate-clicks.
--
-- affiliate_url is stored and rendered exactly as supplied — nothing in
-- the codebase generates, rewrites or appends tracking IDs. A product
-- without an affiliate_url is never shown publicly.
-- ============================================================

create table public.affiliate_products (
  id                   uuid primary key default uuid_generate_v4(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Stable identifier used in MDX (<AffiliateProduct slug="..." />) and click tracking
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Validated against lib/affiliates/providers.ts rather than a DB check, so a
  -- new programme needs a code change only, not a migration
  provider             text not null,
  title                text not null,
  creator              text,          -- author / narrator, e.g. "Vincent Bugliosi"
  description          text,
  destination_url      text,          -- plain product page, for reference only
  affiliate_url        text,          -- exactly as supplied by the programme
  link_text            text,          -- falls back to the provider default
  image_url            text,          -- only from the programme's approved tools
  category             text,          -- e.g. 'book', 'audiobook', 'subscription'
  active               boolean not null default false,
  disclosure_required  boolean not null default true,
  admin_notes          text
);

create index affiliate_products_active_idx on public.affiliate_products (active);

create trigger affiliate_products_set_updated_at
  before update on public.affiliate_products
  for each row execute procedure public.set_updated_at();

-- Where a product appears. page_key is the blog slug, podcast slug or case slug.
create table public.affiliate_placements (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  product_id  uuid not null references public.affiliate_products(id) on delete cascade,
  page_type   text not null check (page_type in ('blog', 'podcast', 'case')),
  page_key    text not null,
  position    integer not null default 0,
  unique (product_id, page_type, page_key)
);

create index affiliate_placements_page_idx on public.affiliate_placements (page_type, page_key);

-- One row per outbound click. Deliberately no IP address, user agent,
-- user ID or any other personal data.
create table public.affiliate_clicks (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  product_id    uuid references public.affiliate_products(id) on delete set null,
  product_slug  text,
  provider      text not null,
  page_path     text not null,
  placement     text
);

create index affiliate_clicks_product_idx on public.affiliate_clicks (product_id, created_at desc);
create index affiliate_clicks_created_at_idx on public.affiliate_clicks (created_at desc);

-- Per-product click totals for the admin list. security_invoker so the
-- view respects affiliate_clicks' admin-only RLS.
create view public.affiliate_product_click_stats
with (security_invoker = true) as
select
  product_id,
  count(*)::int                                                        as total_clicks,
  (count(*) filter (where created_at > now() - interval '30 days'))::int as clicks_30d,
  max(created_at)                                                      as last_click_at
from public.affiliate_clicks
where product_id is not null
group by product_id;

-- RLS: the site reads and writes these tables server-side with the
-- service role; admins get full access through the normal client.
alter table public.affiliate_products enable row level security;
alter table public.affiliate_placements enable row level security;
alter table public.affiliate_clicks enable row level security;

create policy "Admins can do everything on affiliate_products"
  on public.affiliate_products for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can do everything on affiliate_placements"
  on public.affiliate_placements for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can read affiliate_clicks"
  on public.affiliate_clicks for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
