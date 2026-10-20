-- ============================================================
-- NEWSLETTER DOUBLE OPT-IN
-- New signups start as 'pending' and only become 'active' (and receive
-- the weekly issue) after clicking the emailed confirmation link.
-- Sends already filter on status = 'active', so pending rows are never mailed.
-- Existing rows are left untouched and labelled as legacy single opt-in.
-- ============================================================

-- Allow the new 'pending' status (drop whatever check constraint covers status).
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.newsletter_subscribers'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.newsletter_subscribers drop constraint %I', c);
  end loop;
end $$;

alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_status_check
  check (status in ('pending', 'active', 'unsubscribed', 'bounced', 'suppressed'));

-- Consent record + confirmation state.
alter table public.newsletter_subscribers
  add column if not exists consent_method    text,         -- 'single_opt_in' (legacy) | 'double_opt_in'
  add column if not exists consent_at        timestamptz,  -- when the form was submitted
  add column if not exists consent_text      text,         -- the wording shown next to the form
  add column if not exists consent_ip_hash   text,         -- salted SHA-256 of the client IP (rate limiting + audit)
  add column if not exists confirm_token_hash text,        -- SHA-256 of the emailed token (token itself is never stored)
  add column if not exists confirm_sent_at   timestamptz,
  add column if not exists confirmed_at      timestamptz;

update public.newsletter_subscribers
   set consent_method = 'single_opt_in'
 where consent_method is null;

create index if not exists newsletter_subscribers_confirm_token_idx
  on public.newsletter_subscribers (confirm_token_hash);
create index if not exists newsletter_subscribers_consent_ip_idx
  on public.newsletter_subscribers (consent_ip_hash, consent_at);
