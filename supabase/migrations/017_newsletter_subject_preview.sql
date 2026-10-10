-- ============================================================
-- NEWSLETTER SUBJECT LINE + PREVIEW TEXT
-- Every weekly issue used to go out with the same subject (the fixed
-- issue title) and no preview text, so inboxes showed the email's header
-- text after the subject. Both are now editable per issue in
-- /admin/weekly-newsletter. Null = generate from that week's podcasts
-- (see lib/newsletter/subject.ts), so existing issues and the Sunday send
-- keep working without anyone filling them in.
--
-- Only adds nullable columns: no views, policies or existing queries are
-- affected. Run this BEFORE deploying the code that saves these fields.
-- ============================================================

alter table public.newsletters
  add column if not exists subject      text,
  add column if not exists preview_text text;
