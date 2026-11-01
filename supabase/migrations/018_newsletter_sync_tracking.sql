-- ============================================================
-- NEWSLETTER SUBSCRIBERS — record why a SendGrid contact sync failed.
-- Until now a failed sync was only console.error'd, so a subscriber
-- just showed "Pending" with no reason. These columns make the state
-- and the last error visible in /admin/newsletter.
-- Safe to re-run; non-destructive; no existing value is altered.
-- Apply BEFORE deploying the code that reads these columns.
-- ============================================================

alter table public.newsletter_subscribers
  -- Last error from a SendGrid sync attempt; NULL after a success or
  -- before any attempt. Truncated by the app; never contains secrets.
  add column if not exists sync_error text,
  -- When we last tried (or are still waiting on) a SendGrid sync.
  add column if not exists last_sync_attempt timestamptz;
