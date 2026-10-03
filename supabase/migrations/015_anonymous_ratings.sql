-- ============================================================
-- ANONYMOUS RATINGS
-- Visitors who aren't signed in can rate a podcast. Previously those
-- ratings only lived in the visitor's browser (localStorage) and never
-- counted. They're now written here by POST /api/ratings/anonymous,
-- which runs with the service role — there are no public policies, so
-- the browser can't read or write this table directly.
--
-- One rating per browser per podcast: visitor_id is a random id the
-- browser generates and keeps in localStorage. ip_hash is a salted
-- SHA-256 of the client IP, used only to rate-limit writes.
-- ============================================================
create table if not exists public.anonymous_ratings (
  id                     uuid primary key default uuid_generate_v4(),
  visitor_id             uuid not null,
  podcast_id             uuid not null references public.podcasts(id) on delete cascade,
  storytelling_score     smallint check (storytelling_score between 1 and 10),
  research_score         smallint check (research_score between 1 and 10),
  host_quality_score     smallint check (host_quality_score between 1 and 10),
  production_score       smallint check (production_score between 1 and 10),
  binge_factor_score     smallint check (binge_factor_score between 1 and 10),
  factual_accuracy_score smallint check (factual_accuracy_score between 1 and 10),
  overall_score          smallint check (overall_score between 1 and 10),
  ip_hash                text not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (visitor_id, podcast_id)
);

alter table public.anonymous_ratings enable row level security;

create index if not exists anonymous_ratings_podcast_idx on public.anonymous_ratings (podcast_id);
create index if not exists anonymous_ratings_ip_recent_idx on public.anonymous_ratings (ip_hash, updated_at);

-- This migration originally also rebuilt podcast_rating_stats as a UNION
-- over ratings and anonymous_ratings. That broke PostgREST's
-- podcasts -> podcast_rating_stats embed and took every podcast page down,
-- so it was removed. Anonymous ratings are counted by 016 instead, which
-- mirrors them into public.ratings and leaves the view untouched.
