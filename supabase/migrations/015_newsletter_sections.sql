-- ============================================================
-- NEWSLETTER SECTIONS
-- Three optional free-text sections around the five podcast slots:
--   editors_note  shown first, under the title banner
--   body          shown before the five podcasts (replaces the old,
--                 never-editable `intro`, which is still used as a
--                 fallback for issues that have no body)
--   conclusion    shown after the five podcasts: wrap-up / preview of
--                 the next issue
-- All optional, so existing issues and the Sunday send are unaffected.
-- ============================================================

alter table public.newsletters
  add column editors_note text,
  add column body         text,
  add column conclusion   text;
