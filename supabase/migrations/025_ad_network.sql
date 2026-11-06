-- ============================================================
-- AD NETWORK (cross-promotion)  [already applied to production as "021" before renumbering]
-- Admin-managed adverts promoting the owner's other sites. Managed in
-- /admin/ads; rendered by <AdSlot placement="..."/>; impressions and
-- clicks are logged to ad_events by /api/ads/track.
--
-- Safe to re-run: everything is IF NOT EXISTS / drop-and-recreate.
-- Additive only: no existing table, row or policy is altered.
-- ============================================================

create table if not exists public.ads (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  title            text not null check (char_length(title) between 1 and 80),
  description      text check (description is null or char_length(description) <= 220),
  destination_url  text not null check (destination_url ~* '^https?://'),
  button_text      text not null default 'Discover more' check (char_length(button_text) between 1 and 30),
  -- Object path inside the public 'ad-images' storage bucket. The public
  -- URL is derived in code, so nothing here depends on the project URL.
  image_path       text not null,
  image_alt        text check (image_alt is null or char_length(image_alt) <= 200),
  -- Stored so the slot can reserve its space before the image loads (no layout shift)
  image_width      integer not null check (image_width > 0),
  image_height     integer not null check (image_height > 0),
  -- Placement keys are validated against lib/ads/placements.ts rather than a
  -- DB check, so a new placement needs a code change only, not a migration
  placements       text[] not null check (cardinality(placements) > 0),
  -- Lower numbers are shown first
  sort_order       integer not null default 10,
  is_active        boolean not null default false,
  starts_at        timestamptz,
  ends_at          timestamptz,
  utm_campaign     text check (utm_campaign is null or utm_campaign ~ '^[a-z0-9_-]{1,60}$'),
  archived_at      timestamptz,
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists ads_live_idx on public.ads (is_active, archived_at);

drop trigger if exists ads_set_updated_at on public.ads;
create trigger ads_set_updated_at
  before update on public.ads
  for each row execute procedure public.set_updated_at();

-- One row per counted impression / click. Deliberately no IP address,
-- user agent, user id or session id: dedupe_key is a one-way hash.
create table if not exists public.ad_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  ad_id       uuid not null references public.ads(id) on delete cascade,
  event_type  text not null check (event_type in ('impression', 'click')),
  placement   text not null,
  page_path   text not null,
  dedupe_key  text not null
);

create unique index if not exists ad_events_dedupe_idx on public.ad_events (dedupe_key);
create index if not exists ad_events_ad_idx on public.ad_events (ad_id, created_at desc);
create index if not exists ad_events_created_idx on public.ad_events (created_at desc);
create index if not exists ad_events_placement_idx on public.ad_events (placement, created_at desc);

-- ------------------------------------------------------------
-- RLS. The site reads/writes with the service role server-side; admins
-- get full access through the normal client; the public can only ever
-- read adverts that are live right now.
-- ------------------------------------------------------------
alter table public.ads enable row level security;
alter table public.ad_events enable row level security;

drop policy if exists "Admins can do everything on ads" on public.ads;
create policy "Admins can do everything on ads"
  on public.ads for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

drop policy if exists "Public can read live ads" on public.ads;
create policy "Public can read live ads"
  on public.ads for select
  using (
    is_active
    and archived_at is null
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "Admins can read ad_events" on public.ad_events;
create policy "Admins can read ad_events"
  on public.ad_events for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
-- No insert/update/delete policy: events are written only by the service role.

-- ------------------------------------------------------------
-- Aggregations for the admin dashboard (PostgREST can't GROUP BY).
-- Callable only by the service role, after an application-level admin check.
-- p_since = null means all time. Days are grouped in UK time.
-- ------------------------------------------------------------
create or replace function public.ad_stats_by_ad(p_since timestamptz default null)
returns table (ad_id uuid, impressions bigint, clicks bigint)
language sql stable security invoker as $$
  select e.ad_id,
         count(*) filter (where e.event_type = 'impression'),
         count(*) filter (where e.event_type = 'click')
  from public.ad_events e
  where p_since is null or e.created_at >= p_since
  group by e.ad_id
$$;

create or replace function public.ad_stats_by_placement(p_since timestamptz default null)
returns table (placement text, impressions bigint, clicks bigint)
language sql stable security invoker as $$
  select e.placement,
         count(*) filter (where e.event_type = 'impression'),
         count(*) filter (where e.event_type = 'click')
  from public.ad_events e
  where p_since is null or e.created_at >= p_since
  group by e.placement
$$;

create or replace function public.ad_stats_daily(p_since timestamptz default null, p_ad_id uuid default null)
returns table (day date, impressions bigint, clicks bigint)
language sql stable security invoker as $$
  select (e.created_at at time zone 'Europe/London')::date,
         count(*) filter (where e.event_type = 'impression'),
         count(*) filter (where e.event_type = 'click')
  from public.ad_events e
  where (p_since is null or e.created_at >= p_since)
    and (p_ad_id is null or e.ad_id = p_ad_id)
  group by 1
  order by 1
$$;

revoke execute on function public.ad_stats_by_ad(timestamptz) from public, anon, authenticated;
revoke execute on function public.ad_stats_by_placement(timestamptz) from public, anon, authenticated;
revoke execute on function public.ad_stats_daily(timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.ad_stats_by_ad(timestamptz) to service_role;
grant execute on function public.ad_stats_by_placement(timestamptz) to service_role;
grant execute on function public.ad_stats_daily(timestamptz, uuid) to service_role;

-- ------------------------------------------------------------
-- STORAGE: public-read 'ad-images' bucket. Uploads go through
-- /api/admin/ads/upload (service role, admin-checked, magic-byte
-- validated); the bucket limits are defence-in-depth. SVG is excluded.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-images', 'ad-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Ad images are publicly readable" on storage.objects;
create policy "Ad images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'ad-images');

drop policy if exists "Admins can manage ad images" on storage.objects;
create policy "Admins can manage ad images"
  on storage.objects for all
  using (
    bucket_id = 'ad-images'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    bucket_id = 'ad-images'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
