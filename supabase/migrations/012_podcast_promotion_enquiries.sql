-- ============================================================
-- PODCAST PROMOTION ENQUIRIES
-- Enquiries from podcast creators submitted via
-- /promote-your-podcast/contact — free listing requests and paid
-- promotion enquiries alike. Written only by the API route using the
-- service role; readable/editable by admins only via RLS.
-- ============================================================

create table public.podcast_promotion_enquiries (
  id                 uuid primary key default uuid_generate_v4(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  name               text not null,
  email              text not null,
  podcast_name       text not null,
  podcast_website    text,
  rss_feed           text,
  package_interest   text not null
                     check (package_interest in ('featured', 'newsletter', 'package', 'free_listing', 'not_sure')),
  campaign_timing    text,
  message            text,
  newsletter_opt_in  boolean not null default false,
  status             text not null default 'new'
                     check (status in ('new', 'contacted', 'quoted', 'won', 'declined', 'completed')),
  admin_notes        text
);

create index podcast_promotion_enquiries_created_at_idx on public.podcast_promotion_enquiries (created_at desc);
create index podcast_promotion_enquiries_status_idx on public.podcast_promotion_enquiries (status);
create index podcast_promotion_enquiries_email_idx on public.podcast_promotion_enquiries (email);

alter table public.podcast_promotion_enquiries enable row level security;

create policy "Admins can do everything on podcast_promotion_enquiries"
  on public.podcast_promotion_enquiries for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create trigger podcast_promotion_enquiries_set_updated_at
  before update on public.podcast_promotion_enquiries
  for each row execute procedure public.set_updated_at();
