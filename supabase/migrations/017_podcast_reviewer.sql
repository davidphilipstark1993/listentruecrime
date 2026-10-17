-- ============================================================
-- PODCASTS — record who reviewed a show and when.
-- Podcast pages show "Reviewed by [name] on [date]" and feed the same
-- values into the Review schema (author, datePublished).
--
-- Until these are filled in, the app falls back to the site's one
-- author (david-stark, lib/authors.ts) and to created_at for the date.
-- TODO(owner): confirm the reviewer on each show, then backfill
-- reviewed_at with the real review date (the created_at fallback is the
-- import date, not necessarily the day the review was written).
-- ============================================================

alter table public.podcasts
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

comment on column public.podcasts.reviewed_by is 'Author slug of the reviewer (lib/authors.ts), e.g. david-stark';
comment on column public.podcasts.reviewed_at is 'When the editorial review was written; falls back to created_at when null';
