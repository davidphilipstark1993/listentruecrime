-- ============================================================
-- NEWSLETTER SUBSCRIBERS — extend in place for SendGrid sync,
-- consent tracking, and unsubscribe/suppression status.
-- Safe to re-run: every change is IF NOT EXISTS / idempotent.
-- ============================================================

alter table public.newsletter_subscribers
  add column if not exists first_name text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'unsubscribed', 'bounced', 'suppressed')),
  add column if not exists consent boolean not null default true,
  add column if not exists subscribed_at timestamptz not null default now(),
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists source_detail text,
  add column if not exists sendgrid_synced boolean not null default false,
  add column if not exists sendgrid_contact_id text,
  add column if not exists welcome_sent boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- Normalize existing rows and enforce lowercase emails going forward.
update public.newsletter_subscribers set email = lower(email) where email <> lower(email);

create or replace function public.normalize_subscriber_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(new.email);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists newsletter_subscribers_normalize on public.newsletter_subscribers;
create trigger newsletter_subscribers_normalize
  before insert or update on public.newsletter_subscribers
  for each row execute procedure public.normalize_subscriber_email();

create index if not exists newsletter_subscribers_status_idx on public.newsletter_subscribers (status);
