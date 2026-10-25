-- ============================================================
-- PODCAST SEO FIELDS, EDITORIAL DATA FIELDS AND REDIRECTS
-- Additive only: nothing is dropped, renamed or backfilled here.
-- Every new column is nullable and NULL means "editor has not entered it",
-- so pages must render nothing (or neutral copy) for it.
-- ============================================================

-- Per-page SEO overrides. When NULL the page generates a title/description
-- from its own verified fields (name, host, producer, format).
alter table public.podcasts
  add column if not exists seo_title         text,
  add column if not exists meta_description  text,
  add column if not exists og_title          text,
  add column if not exists og_description    text,
  add column if not exists canonical_url     text,
  add column if not exists noindex           boolean not null default false;

-- Editorial fields the admin previously lacked (website_url exists since 005).
alter table public.podcasts
  add column if not exists producer               text,
  add column if not exists rating                 numeric(3,1) check (rating is null or (rating >= 0 and rating <= 10)),
  add column if not exists rating_is_provisional  boolean not null default false,
  -- { "Spotify": "https://open.spotify.com/show/...", "CBC Listen": "https://..." }
  -- A platform counts as available only when it has a URL here.
  add column if not exists platform_urls          jsonb not null default '{}'::jsonb,
  -- Full country name for display. `country` keeps the ISO-style code that
  -- drives /country/[code] URLs, so existing routes and rankings are unchanged.
  add column if not exists country_name           text;

-- Same SEO overrides for newsletter issue archive pages.
alter table public.newsletters
  add column if not exists seo_title         text,
  add column if not exists meta_description  text,
  add column if not exists og_title          text,
  add column if not exists og_description    text,
  add column if not exists canonical_url     text,
  add column if not exists noindex           boolean not null default false;

-- 301 redirects managed from the admin. Exact path match, applied in middleware.
create table if not exists public.redirects (
  id          uuid primary key default uuid_generate_v4(),
  from_path   text not null unique check (from_path like '/%' and from_path not like '%?%'),
  to_path     text not null check (to_path like '/%'),
  note        text,
  created_at  timestamptz not null default now(),
  check (from_path <> to_path)
);

alter table public.redirects enable row level security;

-- Middleware reads with the anon key; only admins can change rows.
create policy "Redirects are publicly readable"
  on public.redirects for select using (true);

create policy "Admins manage redirects"
  on public.redirects for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
