# SEO, GEO & AI Search Audit — AFTER

**Date:** 8 November 2026 · **Branch:** `seo/master-seo-geo-nov2026` (not yet merged or deployed) · **Compared with:** [SEO-AUDIT-BEFORE.md](./SEO-AUDIT-BEFORE.md)

> **How these "after" figures were obtained.** The changes are on a branch and **not live**, so nothing here was re-crawled on production. Figures come from the local dev server (`next dev`, production database), unit tests and type-checking. A full `next build` was not run (it is OOM-killed locally on this ~1,000-page site; Vercel builds it fine). **Re-run the live crawl after deploy** (method in the baseline). Dev-server HTML size is approximate. A visual/browser check was **not done**: the Chrome extension was not connected.

## Before vs after

| Area | Before | After |
|---|---|---|
| Best page: answer-first intro, names real picks | Generic paragraph; FAQ named shows from memory | Intro names the top three from the database, with links |
| Best page: unsupported claims | "hundreds of millions of downloads", "millions of listeners", unlisted shows, "community's… score" for an editorial score | None. Unit test bans "million", "downloads", "most popular", "award", "chart" in generated FAQs |
| Best page: freshness | "Updated <render month>" (always today) | "Last updated 8 November 2026", an editorial constant shared by title year, visible date, JSON-LD and sitemap |
| Best page: structure | Card grids, no per-show text | Quick answers, How we choose, 10 ranked top picks, 10 sub-intent sections (beginners, investigative, cold cases, serial killers, UK, binge, limited series, episodic, Spotify, Apple Podcasts), guides, categories, countries, 14 FAQs |
| Best page: per-show detail | Cover + 2 lines | Verdict, Binge Factor, country, format, case types, summary, who it's for, start-with episode, review link |
| Best page size (dev) | ~324 KB (live) | ~233 KB markup, ~59 KB gzipped, ~6,500 words |
| Best page: schema | FAQPage, BreadcrumbList, ItemList (names only) | One `@graph`: CollectionPage, ItemList (position, url, image, description), BreadcrumbList, FAQPage, all matching visible content |
| Podcast page | No editorial Binge Factor; render-year label; "Episodic" text shown for Serialised shows | Binge Factor in hero and quick facts; "Listing updated" date; shared case-insensitive format/case-type logic; link to best page |
| Organization / WebSite / Person | Unlinked blocks | `@id` graph; founder; `publisher`/`author`/`isPartOf` by reference |
| About | No schema; "no ads" claim; superlative | `AboutPage` + breadcrumb; who runs it; how it is funded (from Terms); claims aligned |
| How We Review | `Article` by Organization, no date | Author = named editor, `dateModified`, signals table, Binge Factor assignment, visible date, breadcrumb |
| Author page | Any `/authors/<x>` = 200 duplicate | Unknown slugs 404; `ProfilePage` + `Person` |
| `/best/*` (12) | Indexable, "2025", unlinked, overlapping guides | Each canonicalises to its owner page; year removed |
| Sitemap `lastmod` | Regeneration time on most hubs | Real dates (newest record / post / editorial constant); omitted when unknown |
| Layout canonical | Default = homepage for any page that forgot its own | Removed; homepage sets its own |
| robots.txt | AI-bot groups lacked disallows | Shared disallow list in every group |
| llms.txt | Plain URL list | Standard format, ~45 verified links (all 200), live podcast count, independence statement |
| Breadcrumb schema | Missing on About, How We Review, Browse, Blog index | Added |
| Homepage | Best page only inside a link grid; "Community" label on an editorial block | Hero link to best page; block labelled "Editor's picks" and links to the hub |

## Verified locally

- 20 new unit tests pass; full suite 381 passed. 3 shop test files fail to load because the `stripe` package is absent from the shared `node_modules`: unrelated, present before.
- `tsc --noEmit`: no errors in changed files.
- Dev-server render checks: best page (10 sections, JSON-LD parses, FAQ text equals markup), About, How We Review, Author, `/authors/not-a-real-person` → 404, robots, sitemap (1,005 URLs locally; shop excluded because the shop flag is off), `llms.txt` (every link 200), canonicals.

## Not changed on purpose / still open

- `Review` and `AggregateRating` remain unemitted: no editor `rating` exists (0/775) and no podcast has ≥3 community ratings (max 2). Adding them now would mark up data that is not there.
- Core Web Vitals, Search Console and GA4 reporting could not be accessed.
- The Apple Podcasts guide page was not created (763 of 775 shows are on Apple; it would duplicate the main list).
- Podcast data gaps are reported, not filled: see [INCOMPLETE-PODCAST-RECORDS.md](./INCOMPLETE-PODCAST-RECORDS.md).
