-- ============================================================
-- COUNT ANONYMOUS RATINGS
-- Migration 015 tried to count anonymous ratings by rebuilding
-- podcast_rating_stats as a UNION view. PostgREST can't trace a UNION
-- view's podcast_id back to the ratings -> podcasts foreign key, so every
-- `podcasts?select=*,rating_stats:podcast_rating_stats(*)` embed failed
-- (PGRST200) and all podcast pages returned 404. The view was put back as
-- it was, and 015 no longer touches it.
--
-- Instead, each anonymous rating is mirrored into public.ratings with a
-- null user_id. podcast_rating_stats stays exactly as it is (a plain
-- aggregate over ratings), so the embed keeps working and anonymous
-- ratings count towards every average.
--
-- anonymous_ratings stays the source of truth for anonymous ratings: it
-- holds visitor_id and ip_hash, which must not be exposed. ratings is
-- publicly readable, so the mirror row carries only the scores and a link
-- back to its source row.
-- ============================================================

alter table public.ratings
  alter column user_id drop not null,
  add column if not exists anonymous_rating_id uuid unique
    references public.anonymous_ratings(id) on delete cascade;

-- Every rating is either a signed-in user's or a mirrored anonymous one.
alter table public.ratings
  drop constraint if exists ratings_owner_check,
  add constraint ratings_owner_check
    check ((user_id is null) <> (anonymous_rating_id is null));

-- Keep the mirror in step with anonymous_ratings on insert and update.
-- Deletes cascade through the anonymous_rating_id foreign key.
create or replace function public.mirror_anonymous_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ratings (
    anonymous_rating_id, podcast_id,
    storytelling_score, research_score, host_quality_score, production_score,
    binge_factor_score, factual_accuracy_score, overall_score
  ) values (
    new.id, new.podcast_id,
    new.storytelling_score, new.research_score, new.host_quality_score, new.production_score,
    new.binge_factor_score, new.factual_accuracy_score, new.overall_score
  )
  on conflict (anonymous_rating_id) do update set
    podcast_id             = excluded.podcast_id,
    storytelling_score     = excluded.storytelling_score,
    research_score         = excluded.research_score,
    host_quality_score     = excluded.host_quality_score,
    production_score       = excluded.production_score,
    binge_factor_score     = excluded.binge_factor_score,
    factual_accuracy_score = excluded.factual_accuracy_score,
    overall_score          = excluded.overall_score;
  return new;
end;
$$;

-- Only the trigger should run this.
revoke all on function public.mirror_anonymous_rating() from public, anon, authenticated;

drop trigger if exists anonymous_ratings_mirror on public.anonymous_ratings;
create trigger anonymous_ratings_mirror
  after insert or update on public.anonymous_ratings
  for each row execute procedure public.mirror_anonymous_rating();

-- Backfill anonymous ratings saved since 015 was applied.
insert into public.ratings (
  anonymous_rating_id, podcast_id,
  storytelling_score, research_score, host_quality_score, production_score,
  binge_factor_score, factual_accuracy_score, overall_score
)
select
  id, podcast_id,
  storytelling_score, research_score, host_quality_score, production_score,
  binge_factor_score, factual_accuracy_score, overall_score
from public.anonymous_ratings
on conflict (anonymous_rating_id) do nothing;
