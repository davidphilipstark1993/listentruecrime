-- ============================================================
-- PODCAST ARTWORK RECOVERY — metadata columns on the existing
-- podcasts table (not a separate table: artwork is 1:1 with a
-- podcast and the dashboard needs it joined on every list query).
-- Safe to re-run: every change is IF NOT EXISTS / idempotent.
-- Non-destructive: no existing column, row, or value is altered.
-- ============================================================

alter table public.podcasts
  -- Lifecycle status of the CURRENT accepted artwork (image_url).
  add column if not exists artwork_status text not null default 'missing'
    check (artwork_status in ('verified', 'found', 'needs_review', 'missing', 'failed', 'skipped')),

  -- Where the current image_url came from.
  add column if not exists artwork_source text
    check (artwork_source in ('existing', 'podcast_index', 'apple', 'rss', 'website', 'manual', 'placeholder')),

  -- Confidence tier of the match that produced the current image_url.
  add column if not exists artwork_confidence text
    check (artwork_confidence in ('high', 'medium', 'low')),

  -- Raw 0-100 match score behind artwork_confidence (see lib/artwork/match.ts).
  add column if not exists artwork_score numeric(5,1),

  -- The original external URL the current image_url was cached/downloaded
  -- from (Apple/PodcastIndex/RSS/website), kept even after it's mirrored
  -- into Supabase Storage — needed to detect "source changed" on re-check.
  add column if not exists artwork_original_url text,

  -- Human-readable reasons the match was accepted, e.g.
  -- "Title matched; Author matched; RSS feed matched".
  add column if not exists artwork_match_reason text,

  -- Last error encountered resolving artwork for this podcast, if any.
  add column if not exists artwork_error text,

  -- Admin-supplied artwork is never touched by automated recovery again
  -- unless an admin explicitly resets this flag.
  add column if not exists artwork_manual_override boolean not null default false,

  -- Last time a recovery attempt ran (success, failure, or skip).
  add column if not exists artwork_checked_at timestamptz,

  -- Last time the current image_url was confirmed to be genuine, correct
  -- artwork (either pre-existing and accepted as-is, or a high-confidence
  -- automated match, or a manual admin approval).
  add column if not exists artwork_verified_at timestamptz,

  add column if not exists artwork_attempts integer not null default 0,
  add column if not exists artwork_last_attempt_at timestamptz,

  -- Failures back off exponentially; recovery runs skip rows until this
  -- passes. Never retried indefinitely — resolve.ts caps artwork_attempts.
  add column if not exists artwork_next_retry_at timestamptz,

  -- Pending needs_review candidate (or null once approved/rejected):
  -- { url, originalUrl, source, confidence, score, reasons: string[],
  --   candidateTitle, candidateAuthor, candidatePublisher, foundAt }
  add column if not exists artwork_candidate jsonb,

  -- Strong identifiers, cached once discovered so future recovery runs can
  -- prefer them over a title/author search (see lib/artwork/sources/).
  add column if not exists podcast_index_feed_id bigint,
  add column if not exists apple_collection_id bigint,
  add column if not exists rss_url text;

create index if not exists podcasts_artwork_status_idx on public.podcasts (artwork_status);
create index if not exists podcasts_artwork_next_retry_idx on public.podcasts (artwork_next_retry_at)
  where artwork_status = 'failed';
create index if not exists podcasts_podcast_index_feed_id_idx on public.podcasts (podcast_index_feed_id)
  where podcast_index_feed_id is not null;
create index if not exists podcasts_apple_collection_id_idx on public.podcasts (apple_collection_id)
  where apple_collection_id is not null;

comment on column public.podcasts.artwork_status is 'Lifecycle status of the current image_url — see lib/artwork/types.ts ArtworkStatus';
comment on column public.podcasts.artwork_source is 'Where the current image_url was sourced from — see lib/artwork/types.ts ArtworkSource';
comment on column public.podcasts.artwork_candidate is 'Pending needs_review candidate awaiting admin approve/reject — see lib/artwork/types.ts ArtworkCandidate';

-- ============================================================
-- BACKFILL EXISTING ROWS
-- Never re-downloads or re-validates existing artwork — just
-- classifies what's already there so recovery only targets rows
-- that actually need it. An admin can force a re-check per-podcast.
-- ============================================================

update public.podcasts
set
  artwork_status = 'verified',
  artwork_source = 'existing',
  artwork_verified_at = coalesce(artwork_verified_at, now())
where image_url is not null
  and trim(image_url) <> ''
  and artwork_status = 'missing'; -- only touch untouched rows; re-running this migration is a no-op

update public.podcasts
set artwork_status = 'missing'
where (image_url is null or trim(image_url) = '')
  and artwork_status = 'missing'; -- no-op, kept for clarity/documentation of intent

-- ============================================================
-- SUPABASE STORAGE — podcast-artwork bucket
-- Public read (artwork is public site content anyway), writes only
-- via the service-role client used server-side in API routes/scripts
-- (which bypasses RLS entirely), so these policies exist as
-- defense-in-depth for any future client-side/authenticated access.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('podcast-artwork', 'podcast-artwork', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "Podcast artwork is publicly readable" on storage.objects;
create policy "Podcast artwork is publicly readable"
  on storage.objects for select
  using (bucket_id = 'podcast-artwork');

drop policy if exists "Admins can manage podcast artwork" on storage.objects;
create policy "Admins can manage podcast artwork"
  on storage.objects for all
  using (
    bucket_id = 'podcast-artwork'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    bucket_id = 'podcast-artwork'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
