-- Add website_url column to podcasts
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/knmgspcpnijsgsknvfte/sql

ALTER TABLE public.podcasts ADD COLUMN IF NOT EXISTS website_url text;
