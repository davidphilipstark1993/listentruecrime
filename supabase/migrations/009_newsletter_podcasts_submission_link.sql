-- ============================================================
-- Links newsletter_podcasts to newsletter_submissions, so a manually
-- curated newsletter can render (archive page, email) entirely from the
-- curator's own supplied fields WITHOUT requiring the podcast to be
-- published into the main podcasts directory. Directory publication is a
-- separate, explicit admin action ("Add to Directory"), not automatic.
-- ============================================================

alter table public.newsletter_podcasts
  add column if not exists newsletter_submission_id uuid references public.newsletter_submissions(id);
