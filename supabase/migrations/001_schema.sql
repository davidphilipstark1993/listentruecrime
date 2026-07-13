-- ============================================================
-- ListenTrueCrime.com — Initial Schema
-- Run this in Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";

-- ============================================================
-- PROFILES
-- Extended from auth.users via trigger
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  username    text unique,
  avatar_url  text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PODCASTS
-- ============================================================
create table public.podcasts (
  id                    uuid primary key default uuid_generate_v4(),
  title                 text not null,
  slug                  text not null unique,
  description           text,
  short_description     text,          -- 1-2 sentence teaser for cards
  image_url             text,
  country               text,          -- e.g. 'US', 'UK', 'AU', 'CA'
  case_types            text[],        -- e.g. ['Cold Case', 'Murder', 'Fraud']
  format_type           text,          -- 'Serialized' | 'Episodic' | 'Both'
  host_style            text,          -- 'Single Host' | 'Dual Host' | 'Panel'
  factual_style         text,          -- 'Purely Factual' | 'Host Dialogue' | 'Mixed'
  binge_factor          smallint check (binge_factor between 1 and 10),
  episode_length        text,          -- e.g. '30-45 min', '60-90 min'
  episode_count         text,          -- e.g. '50+', '10 episodes', 'Ongoing'
  best_episode_to_start text,
  platforms             text[],        -- e.g. ['Spotify', 'Apple Podcasts', 'Audible']
  if_you_liked_this     text[],        -- sister podcast slugs
  is_featured           boolean not null default false,
  is_published          boolean not null default true,
  newsletter_worthy_summary text,
  quick_verdict         text,          -- 'Must listen' | 'Good if...' | 'Skip'
  -- Search vector — updated by trigger
  search_vector         tsvector,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.podcasts enable row level security;

create policy "Published podcasts are viewable by everyone"
  on public.podcasts for select using (is_published = true);

create policy "Admins can do everything on podcasts"
  on public.podcasts for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Full-text search trigger
create or replace function public.podcasts_search_trigger()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.case_types, ' '), '')), 'B');
  new.updated_at := now();
  return new;
end;
$$;

create trigger podcasts_search_update
  before insert or update on public.podcasts
  for each row execute procedure public.podcasts_search_trigger();

create index podcasts_search_idx on public.podcasts using gin(search_vector);
create index podcasts_country_idx on public.podcasts (country);
create index podcasts_featured_idx on public.podcasts (is_featured) where is_featured = true;
create index podcasts_case_types_idx on public.podcasts using gin(case_types);

-- Auto updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================
-- RATINGS
-- One rating per user per podcast (upsert-able)
-- ============================================================
create table public.ratings (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  podcast_id            uuid not null references public.podcasts(id) on delete cascade,
  storytelling_score    smallint check (storytelling_score between 1 and 10),
  research_score        smallint check (research_score between 1 and 10),
  host_quality_score    smallint check (host_quality_score between 1 and 10),
  production_score      smallint check (production_score between 1 and 10),
  binge_factor_score    smallint check (binge_factor_score between 1 and 10),
  factual_accuracy_score smallint check (factual_accuracy_score between 1 and 10),
  overall_score         smallint check (overall_score between 1 and 10),
  created_at            timestamptz not null default now(),
  unique (user_id, podcast_id)
);

alter table public.ratings enable row level security;

create policy "Ratings are viewable by everyone"
  on public.ratings for select using (true);

create policy "Users can manage own ratings"
  on public.ratings for all using (auth.uid() = user_id);

-- ============================================================
-- REVIEWS
-- Short reviews (300 chars), require moderation
-- ============================================================
create table public.reviews (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  podcast_id   uuid not null references public.podcasts(id) on delete cascade,
  content      text not null check (char_length(content) <= 300),
  approved     boolean not null default false,
  flagged      boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (user_id, podcast_id)
);

alter table public.reviews enable row level security;

create policy "Approved reviews are viewable by everyone"
  on public.reviews for select using (approved = true);

create policy "Users can insert own reviews"
  on public.reviews for insert with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.reviews for update using (auth.uid() = user_id);

create policy "Admins can manage all reviews"
  on public.reviews for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- FAVOURITES
-- ============================================================
create table public.favourites (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, podcast_id)
);

alter table public.favourites enable row level security;

create policy "Users can manage own favourites"
  on public.favourites for all using (auth.uid() = user_id);

-- ============================================================
-- NEWSLETTER SUBSCRIBERS
-- Simple list — synced to external provider via API route
-- ============================================================
create table public.newsletter_subscribers (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null unique,
  source     text,    -- 'homepage' | 'footer' | 'podcast_page' | etc.
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

create policy "Only admins can view subscribers"
  on public.newsletter_subscribers for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Anyone can subscribe"
  on public.newsletter_subscribers for insert with check (true);

-- ============================================================
-- AGGREGATE RATINGS VIEW
-- Pre-computed averages per podcast — avoids N+1 on browse/list
-- ============================================================
create or replace view public.podcast_rating_stats as
select
  podcast_id,
  count(*)::integer                            as rating_count,
  round(avg(storytelling_score)::numeric, 1)   as avg_storytelling,
  round(avg(research_score)::numeric, 1)       as avg_research,
  round(avg(host_quality_score)::numeric, 1)   as avg_host_quality,
  round(avg(production_score)::numeric, 1)     as avg_production,
  round(avg(binge_factor_score)::numeric, 1)   as avg_binge_factor,
  round(avg(factual_accuracy_score)::numeric, 1) as avg_factual_accuracy,
  round(avg(overall_score)::numeric, 1)        as avg_overall
from public.ratings
group by podcast_id;

-- ============================================================
-- PODCAST REVIEW COUNT VIEW
-- ============================================================
create or replace view public.podcast_review_counts as
select
  podcast_id,
  count(*)::integer as review_count
from public.reviews
where approved = true
group by podcast_id;
