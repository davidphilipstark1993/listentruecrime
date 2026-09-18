# Podcast Artwork Recovery System

Finds, validates, and stores genuine podcast artwork for podcasts in the
directory that have none or have broken artwork — automatically where the
evidence is strong, and via admin review where it isn't. Never replaces
existing good artwork, never assigns artwork from a different podcast, and
never uses AI-generated or scraped-search-engine images.

## How it works

`lib/artwork/resolve.ts`'s `resolvePodcastArtwork(admin, podcastId, { force })`
is the single entry point. For one podcast it:

1. Skips entirely if `artwork_manual_override` is set.
2. Skips if `artwork_status = 'verified'` already (unless `force: true`).
3. If `image_url` is already set, downloads and genuinely decodes it
   (`lib/artwork/validate.ts`) — HTTP 200 alone is never trusted. If it's a
   real, adequately-sized image, it's left alone and marked verified. If
   it's broken (404, HTML error page, tiny/corrupt file), recovery proceeds.
4. Tries sources in priority order — **Podcast Index → Apple Podcasts → RSS
   feed → official website** — stopping at the first one that produces an
   auto-acceptable match. One source failing (rate limit, timeout, API
   down) never stops the others (`lib/artwork/resolve.ts`'s per-source
   try/catch).
5. Every candidate is scored against the target podcast
   (`lib/artwork/match.ts`) and independently validated as a genuine image
   before being considered.
6. An auto-acceptable match is downloaded and cached to the
   `podcast-artwork` Supabase Storage bucket under a deterministic
   `{podcastId}.{ext}` path, and `podcasts.image_url` is updated.
7. A promising-but-not-auto-acceptable match is stored in
   `podcasts.artwork_candidate` with `artwork_status = 'needs_review'` for
   an admin to approve/reject in `/admin/artwork/[id]` — nothing is
   auto-applied.
8. If nothing is found, `artwork_status` becomes `missing` (never had
   artwork) or `failed` (had artwork, it broke, nothing to replace it with)
   — with exponential backoff (`artwork_next_retry_at`) so a permanently
   broken source doesn't get hammered every run.

## Matching / confidence scoring

`lib/artwork/match.ts`, weights per the spec: title 40, author 25,
publisher 15, website 10 (feed/GUID identifiers short-circuit straight to
a 100/high match, since an identical Podcast Index feed ID, Apple
collection ID, or RSS URL is conclusive on its own).

- **90-100 (high)** → auto-accept.
- **75-89 (medium)** → auto-accept only when at least 2 independent
  categories corroborate (e.g. title + author, not title alone at a lucky
  score); otherwise held for review.
- **Below 75** → never auto-accepted.
- **Below `MIN_SCORE_TO_SURFACE` (= 40, exactly `TITLE_POINTS`)** → not even
  surfaced for review — title alone can score at most 40, so this is the
  floor for "worth a human's time," not "worth auto-accepting."

Title comparison (`lib/artwork/normalize-title.ts`) normalizes case,
ampersands, apostrophes, a leading "The", and a trailing "Podcast"/"Show",
then does exact-match / subset-containment / bigram-similarity comparison.
Deliberately conservative: `"Crime Stories"` vs `"Crime Stories Daily"` (a
real extra word) scores 0 on title, not a fuzzy near-match. An identical
Podcast Index feed ID / Apple collection ID / RSS URL match, once
discovered, is cached on the podcast row (`podcast_index_feed_id`,
`apple_collection_id`, `rss_url`) so future re-checks use the strong
identifier path instead of re-doing a title search.

## Validation

`lib/artwork/validate.ts` fetches (SSRF-guarded — `lib/artwork/ssrf.ts`
blocks non-https, private/loopback/link-local IPs, and unsafe redirect
targets), caps the download at 8MB with a 10s timeout, and only accepts
the file if `lib/artwork/image-probe.ts` (hand-rolled PNG/JPEG/GIF/WebP
header parser — no new dependency) can read real width/height ≥300×300. A
200 response with an HTML error page, a truncated file, or an
undersized/zero-byte image is rejected regardless of its declared
`Content-Type`.

## Running a recovery batch

- **Admin dashboard**: `/admin/artwork` → "Recover all" (scoped to the
  current status filter). Calls `POST /api/admin/artwork/recover`
  repeatedly (20 podcasts/call, 5 concurrent) until nothing's left,
  showing running totals. Never processes the whole catalogue in one
  request — each call is bounded so it can't hit a serverless timeout.
- **CLI** (same underlying resolver): 
  `npx tsx scripts/artwork/backfill.ts --limit=50 --concurrency=5 --scope=broken [--force]`
  — `--scope` is `missing | needs_review | failed | broken`. Resumable by
  construction: it always picks the rows with the oldest (or null)
  `artwork_checked_at` first, so an interrupted run's leftovers are simply
  picked up next time, and already-verified rows are never reprocessed.
- **Scheduled**: `.github/workflows/artwork-recovery.yml` runs the CLI
  daily at 06:00 UTC (`--scope=broken --limit=50`), or on-demand via
  `workflow_dispatch`.

## Reviewing candidates

`/admin/artwork` → filter to "Needs review" → **Review**. Shows the
current podcast (title/author/website/RSS) next to the candidate
(image/source/candidate title & author/confidence/score/reasons). Buttons:
**Approve** (re-validates and promotes the candidate to `image_url`),
**Reject** (discards it, status reverts to missing/failed so a future run
tries again), **Search again** (re-runs recovery now), **Mark as missing**
(status → `skipped`, a terminal state future batch runs never touch —
distinct from Reject, which stays eligible for retry).

## Manual artwork / overrides

Same review page → "Manual artwork URL". Still goes through the full
validation pipeline (SSRF check, genuine-image check, size floor) — being
admin-supplied doesn't exempt it. Sets `artwork_manual_override = true`,
which every future automated run skips unconditionally until "Reset manual
override" is clicked.

## Database

Migration `supabase/migrations/010_podcast_artwork.sql` adds (all
nullable/defaulted, non-destructive) to `public.podcasts`:
`artwork_status`, `artwork_source`, `artwork_confidence`, `artwork_score`,
`artwork_original_url`, `artwork_match_reason`, `artwork_error`,
`artwork_manual_override`, `artwork_checked_at`, `artwork_verified_at`,
`artwork_attempts`, `artwork_last_attempt_at`, `artwork_next_retry_at`,
`artwork_candidate` (jsonb — the pending review candidate), plus general
identity columns `podcast_index_feed_id`, `apple_collection_id`, `rss_url`
(useful beyond artwork — e.g. faster future Podcast Index/Apple lookups).
It also creates a public-read `podcast-artwork` Supabase Storage bucket
and backfills existing rows: any row with `image_url` already set becomes
`artwork_status = 'verified', artwork_source = 'existing'` without
re-downloading anything; rows without one default to `'missing'`.

## Environment variables

No new required variables. Reuses `PODCASTINDEX_API_KEY` /
`PODCASTINDEX_API_SECRET` (already used by `scripts/discovery/`),
`NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Apple search
uses the public iTunes Search API — no key needed.

## Integration with podcast creation

`app/api/newsletter-submissions/[id]/add-to-directory/route.ts` and
`app/api/newsletter-issues/[id]/approve/route.ts` (the two places that
create a `podcasts` row) call `resolvePodcastArtwork` right after
insertion, best-effort — wrapped in try/catch so an artwork failure never
fails podcast creation or blocks sending the newsletter.
`app/api/import/route.ts` (bulk CSV import) does **not** call it inline
(could be dozens of rows per request) — it just sets
`artwork_status = 'verified'` for rows that already ship an `image_url`,
same as any other pre-existing artwork, and leaves the rest at the
`'missing'` default for a background recovery pass to pick up.
