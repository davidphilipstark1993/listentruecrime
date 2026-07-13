-- Add host name and bio fields to podcasts table
ALTER TABLE podcasts
  ADD COLUMN IF NOT EXISTS host_name TEXT,
  ADD COLUMN IF NOT EXISTS host_bio TEXT;

-- Update comment
COMMENT ON COLUMN podcasts.host_name IS 'Name of the host(s), e.g. "Sarah Koenig" or "Casey (anonymous)"';
COMMENT ON COLUMN podcasts.host_bio  IS 'Short bio of the host(s) — 1–3 sentences for the About the host section';
