-- One automatic reminder for subscribers who haven't confirmed (double opt-in).
-- Additive and nullable: existing rows are untouched, and null means "no reminder sent yet".
alter table public.newsletter_subscribers
  add column if not exists confirm_reminder_sent_at timestamptz;

create index if not exists newsletter_subscribers_pending_reminder_idx
  on public.newsletter_subscribers (confirm_sent_at)
  where status = 'pending' and confirm_reminder_sent_at is null;
