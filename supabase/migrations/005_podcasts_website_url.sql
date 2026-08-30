-- ============================================================
-- PODCASTS — add website_url column.
-- App code (components/admin/podcast-form.tsx, app/api/import/route.ts)
-- already reads/writes this column but no prior migration created it
-- (schema drift, likely added manually in the Supabase dashboard).
-- IF NOT EXISTS makes this safe whether or not it already exists live.
-- ============================================================

alter table public.podcasts add column if not exists website_url text;
