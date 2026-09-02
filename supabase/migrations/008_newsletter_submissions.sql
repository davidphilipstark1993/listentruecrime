-- ============================================================
-- NEWSLETTER SUBMISSIONS
-- Manually-curated weekly newsletter picks. Independent of the
-- automated discovery system (podcast_discoveries) — this is the
-- "David personally found this" path, not the "the algorithm found
-- this" path. Admin-only via RLS.
-- ============================================================

create table public.newsletter_submissions (
  id                  uuid primary key default uuid_generate_v4(),
  newsletter_id       uuid not null references public.newsletters(id) on delete cascade,
  podcast_name        text not null,
  normalized_name     text not null,
  podcast_url         text,          -- e.g. Apple/Spotify listen link
  website_url         text,
  rss_url             text,
  hosts               text,          -- free text, only what the curator supplies/verifies
  description         text,          -- short description
  recommendation      text,          -- "why I recommend it"
  notes               text,          -- private curator notes — never rendered publicly
  curator_rating      numeric(3, 1) check (curator_rating between 0 and 10),
  artwork_url         text,
  additional_info     text,
  status              text not null default 'draft' check (status in ('draft', 'approved')),
  matched_podcast_id  uuid references public.podcasts(id), -- set if this is confirmed to be an existing LTC podcast
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index newsletter_submissions_newsletter_id_idx on public.newsletter_submissions (newsletter_id);
create index newsletter_submissions_normalized_name_idx on public.newsletter_submissions (normalized_name);

alter table public.newsletter_submissions enable row level security;

create policy "Admins can do everything on newsletter_submissions"
  on public.newsletter_submissions for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create trigger newsletter_submissions_set_updated_at
  before update on public.newsletter_submissions
  for each row execute procedure public.set_updated_at();
