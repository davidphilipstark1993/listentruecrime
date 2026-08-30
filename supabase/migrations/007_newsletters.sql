-- ============================================================
-- NEWSLETTERS
-- Weekly issue records + the 5 featured podcast slots per issue.
-- Public can view issues once sent/archived (website archive pages).
-- ============================================================

create table public.newsletters (
  id                    uuid primary key default uuid_generate_v4(),
  title                 text not null,
  slug                  text not null unique,
  issue_number          integer not null unique,
  publication_date      date not null default current_date,
  intro                 text,
  status                text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'sent', 'archived')),
  html_content          text,
  plain_text_content    text,
  created_at            timestamptz not null default now(),
  sent_at               timestamptz,
  sendgrid_campaign_id  text,
  updated_at            timestamptz not null default now()
);

create table public.newsletter_podcasts (
  id                     uuid primary key default uuid_generate_v4(),
  newsletter_id          uuid not null references public.newsletters(id) on delete cascade,
  podcast_discovery_id   uuid references public.podcast_discoveries(id),
  podcast_id             uuid references public.podcasts(id),
  position               smallint not null check (position between 1 and 5),
  blurb                  text,
  created_at             timestamptz not null default now(),
  unique (newsletter_id, position)
);

alter table public.podcast_discoveries
  add constraint podcast_discoveries_newsletter_id_fkey
  foreign key (newsletter_id) references public.newsletters(id);

alter table public.newsletters enable row level security;

create policy "Admins can do everything on newsletters"
  on public.newsletters for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Sent newsletters are viewable by everyone"
  on public.newsletters for select using (status in ('sent', 'archived'));

alter table public.newsletter_podcasts enable row level security;

create policy "Admins can do everything on newsletter_podcasts"
  on public.newsletter_podcasts for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Newsletter podcasts viewable when parent newsletter is public"
  on public.newsletter_podcasts for select using (
    exists (
      select 1 from public.newsletters n
      where n.id = newsletter_id and n.status in ('sent', 'archived')
    )
  );

create trigger newsletters_set_updated_at
  before update on public.newsletters
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- NEWSLETTER EVENTS
-- Basic SendGrid engagement tracking (opens/clicks/unsubscribes/bounces)
-- fed by the SendGrid event webhook. Admin-only.
-- ============================================================

create table public.newsletter_events (
  id            uuid primary key default uuid_generate_v4(),
  newsletter_id uuid references public.newsletters(id) on delete cascade,
  event_type    text not null check (event_type in ('open', 'click', 'bounce', 'unsubscribe', 'group_unsubscribe', 'spamreport')),
  email         text not null,
  podcast_id    uuid references public.podcasts(id),
  url           text,
  created_at    timestamptz not null default now()
);

create index newsletter_events_newsletter_id_idx on public.newsletter_events (newsletter_id);
create index newsletter_events_event_type_idx on public.newsletter_events (event_type);

alter table public.newsletter_events enable row level security;

create policy "Admins can do everything on newsletter_events"
  on public.newsletter_events for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
