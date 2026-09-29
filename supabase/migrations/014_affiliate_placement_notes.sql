-- ============================================================
-- AFFILIATE PLACEMENTS: standalone pages + per-placement notes
-- - page_type 'page' covers fixed routes such as
--   /best-true-crime-podcasts (page_key = the path without its slash).
-- - note is optional editorial context shown with the products on that
--   page, e.g. making clear a book is about a different case.
-- ============================================================

alter table public.affiliate_placements
  drop constraint affiliate_placements_page_type_check;

alter table public.affiliate_placements
  add constraint affiliate_placements_page_type_check
  check (page_type in ('blog', 'podcast', 'case', 'page'));

alter table public.affiliate_placements
  add column note text;
