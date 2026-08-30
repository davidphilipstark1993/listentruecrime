-- ============================================================
-- PODCAST DISCOVERIES
-- Weekly automated discovery/research/scoring candidates.
-- Never exposed to the public — admin-only via RLS.
-- ============================================================

create table public.podcast_discoveries (
  id                    uuid primary key default uuid_generate_v4(),
  podcast_name          text not null,
  normalized_name       text not null,
  rss_url               text,
  website_url           text,
  apple_url             text,
  spotify_url           text,
  youtube_url           text,
  artwork_url           text,
  hosts                 jsonb,          -- [{ "name": "...", "verified": true|false }]
  description           text,
  country                text,
  language               text,
  episode_count          integer,
  launch_date            date,
  latest_episode_date    date,
  format                 text,
  case_focus             text[],
  research_notes         text,
  sources                jsonb,          -- [{ "url": "...", "note": "..." }]
  pros                    text[],
  cons                    text[],
  editorial_verdict       text,
  score                   numeric(3, 1) check (score between 0 and 10),
  matched_podcast_id      uuid references public.podcasts(id),
  discovered_at           timestamptz not null default now(),
  researched_at           timestamptz,
  status                  text not null default 'discovered'
    check (status in ('discovered', 'researching', 'researched', 'shortlisted', 'approved', 'rejected', 'featured')),
  newsletter_id           uuid,
  rejection_reason        text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index podcast_discoveries_rss_url_idx on public.podcast_discoveries (rss_url) where rss_url is not null;
create index podcast_discoveries_normalized_name_idx on public.podcast_discoveries (normalized_name);
create index podcast_discoveries_status_idx on public.podcast_discoveries (status);

alter table public.podcast_discoveries enable row level security;

create policy "Admins can do everything on podcast_discoveries"
  on public.podcast_discoveries for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create trigger podcast_discoveries_set_updated_at
  before update on public.podcast_discoveries
  for each row execute procedure public.set_updated_at();
