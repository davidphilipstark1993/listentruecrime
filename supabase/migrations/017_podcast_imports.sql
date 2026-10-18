-- ============================================================
-- PODCAST IMPORTS — support for scripts/import (bulk JSON import).
-- Safe to re-run: every change is IF NOT EXISTS / idempotent.
-- Non-destructive: no existing column, row, or value is altered.
--
-- Why a separate table: public.podcasts is world-readable (RLS
-- "Published podcasts are viewable by everyone" exposes every column of
-- a published row), so outreach contact details and editorial
-- verification notes must NOT live there. They go in podcast_imports,
-- which is admin-only, exactly like podcast_discoveries.
-- ============================================================

-- Public-safe additions to podcasts ---------------------------------

alter table public.podcasts
  -- Numeric Apple Podcasts show id (the digits after "/id" in a show URL).
  -- Used to match imports to existing shows. NULL = unknown.
  add column if not exists apple_podcast_id text,
  -- Listing-review state. NULL on every pre-existing row (= legacy, live,
  -- already reviewed). Imports write 'needs_verification' or 'ready'.
  add column if not exists status text
    check (status in ('needs_verification', 'ready'));

create unique index if not exists podcasts_apple_podcast_id_idx
  on public.podcasts (apple_podcast_id) where apple_podcast_id is not null;

-- Admin-only audit/staging record, one row per imported podcast -------

create table if not exists public.podcast_imports (
  id                  uuid primary key default uuid_generate_v4(),
  slug                text not null unique,
  title               text not null,
  normalized_title    text not null,
  apple_podcast_id    text,
  apple_podcasts_url  text,
  podcast_id          uuid references public.podcasts(id) on delete set null,
  import_status       text not null
    check (import_status in ('needs_verification', 'ready')),
  missing_fields      text[] not null default '{}',

  -- Outreach details. NULL unless explicitly present in the source file.
  contact_email       text,
  contact_note        text,
  contact_url         text,
  official_website    text,

  -- Provenance, preserved verbatim from the source file.
  source_urls         jsonb,
  source_checked      date,
  verification_status text,

  -- Activity of the show itself (source "status": "Active", ...). Kept
  -- apart from import_status so the two meanings never get confused.
  show_status         text,
  -- Apple's rating as reported by the source. NOT a site rating; the
  -- site's own ratings live in public.ratings.
  source_rating       numeric,
  source_rating_count integer,

  -- The complete source record, untouched (phone, socials, tags, ...).
  raw                 jsonb not null,
  imported_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists podcast_imports_apple_podcast_id_idx
  on public.podcast_imports (apple_podcast_id) where apple_podcast_id is not null;
create index if not exists podcast_imports_normalized_title_idx
  on public.podcast_imports (normalized_title);
create index if not exists podcast_imports_status_idx
  on public.podcast_imports (import_status);

alter table public.podcast_imports enable row level security;

drop policy if exists "Admins can do everything on podcast_imports" on public.podcast_imports;
create policy "Admins can do everything on podcast_imports"
  on public.podcast_imports for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop trigger if exists podcast_imports_set_updated_at on public.podcast_imports;
create trigger podcast_imports_set_updated_at
  before update on public.podcast_imports
  for each row execute procedure public.set_updated_at();
