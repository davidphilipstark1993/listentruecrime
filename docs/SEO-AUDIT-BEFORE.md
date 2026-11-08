# SEO, GEO & AI Search Audit — BEFORE

**Site:** https://www.listentruecrime.com  
**Audit date:** 8 November 2026  
**Baseline commit:** `aaf38cc` (`origin/main`, PR #48)  
**Method:** code review of the repository, read-only queries against the production Supabase database, and a live crawl of all 1,048 URLs in the production sitemap (plus the 17 paginated `/browse` pages) on 8 November 2026.

> **What this audit could not measure.** No Google Search Console, Bing Webmaster Tools or GA4 reporting access was available to this audit, so there are **no impression, click, ranking or indexation figures** here. Core Web Vitals field data (CrUX) was also unavailable: the PageSpeed Insights API returned `429 quota exceeded` for unauthenticated calls. Page weight and rendering approach are reported instead, and CWV is listed as a manual task.

---

## 1. Summary

The technical foundations are already strong. Every sitemap URL returns `200`, has a self-referencing canonical, a title, a meta description, exactly one `<h1>`, Open Graph and Twitter tags, and server-rendered content. There are no broken internal links among the targets crawled. The weaknesses are mostly **content-accuracy, entity and structured-data gaps** rather than crawl problems.

### Top findings (ordered by impact)

| # | Finding | Severity |
|---|---|---|
| 1 | **`/best-true-crime-podcasts` (the primary target page) makes claims not backed by site data**: "hundreds of millions of downloads", "millions of listeners per episode", "Real Crimes, Crime & Punishment UK" recommended without database support, "Ranked by our community's… score" for what is an editorial Binge Factor, and a hero line saying every show "has been reviewed for storytelling, research quality, host quality" which contradicts the methodology page ("We do not claim to have listened to every episode"). | High |
| 2 | **"Updated <month year>" on the best page is the render date** (`new Date()`), not a real review date, so the freshness signal is synthetic. | High |
| 3 | **The best page's recommendations are a bare card grid.** Cards carry no strengths, "who it's for" or verdict text and there are no sections for the target sub-intents (beginners, cold cases, serial killers, UK, binge, Spotify, Apple Podcasts). | High |
| 4 | **`Review` schema is emitted on 0 of 775 podcast pages.** It is gated on the editor `rating` column, which is empty for all 775 published podcasts. | Medium (by design, see §7) |
| 5 | **`AggregateRating` is emitted on 0 pages.** Community ratings are too thin: 534 podcasts have exactly 1 rating (2 have 2; maximum 2). No podcast reaches the 3-rating threshold. Anything calling the site "community-rated" needs care. | Medium |
| 6 | **`/authors/<any-slug>` returns `200` with David Stark's page and a self-canonical** (`/authors/not-a-real-person` verified live). `getAuthor()` falls back to David Stark and the `notFound()` guard is dead code. This creates unlimited indexable duplicate URLs. | Medium |
| 7 | **`/best/*` pages (12) are indexable, stamped "2025", absent from the sitemap, and not linked from anywhere in the site.** Several target the same intent as indexed blog guides or category pages (cannibalisation). | Medium |
| 8 | **`/about`, `/browse`, `/` have no page-specific structured data.** Only the global `WebSite` + `Organization` blocks exist. About has no `AboutPage`, no named founder, and the claim "no ads" is now inaccurate (cross-promotion ad slots and affiliate links exist). | Medium |
| 9 | **`robots.txt` per-bot groups omit the disallow rules.** Crawlers with their own `User-agent` group (GPTBot, ClaudeBot, etc.) ignore the `*` group, so `/admin/`, `/api/`, `/auth/` are not disallowed for them. | Low–Medium |
| 10 | **`llms.txt` exists but is thin** (no `llms.txt` link to `/about`, the author page, UK/serial-killer guides; no last-updated; rating language needs alignment). | Low–Medium |
| 11 | **Stale `2025` in the titles of 12 `/best/*` pages**; the best page title uses the current year dynamically (good) but the hard-coded FAQ copy does not reflect real data. | Low |
| 12 | **Podcast meta quality:** 108 of 775 meta descriptions exceed 165 characters, 46 are under 70, and 31 titles exceed 65 characters (truncated in SERPs). | Low |
| 13 | **Data inconsistencies that leak into pages:** case-type labels differ by case (`Cold case` 15 vs `Cold Case` 114; `Missing person` 25 vs `Missing Person` 70; `Serial killer` 7 vs `Serial Killer` 52) and `Serialized` (153) vs `Serialised` (68) format values. Category pages already tolerate the casing variants via `CATEGORY_TO_CASE_TYPES`, but the podcast template's "who it's for" and "best episode" logic and the `/best/*` filters compare exact strings, so the 68 `Serialised` shows and the lower-case variants are silently skipped. | Medium |

---

## 2. Inventory and counts (live crawl, 8 Nov 2026)

| Template | URLs in sitemap | Notes |
|---|---:|---|
| Podcast pages `/podcasts/[slug]` | 775 | all published; none noindexed |
| Blog posts `/blog/[slug]` (+ category/tag) | 98 | 68 `BlogPosting`, 66 with `FAQPage` |
| `/podcasts-like/[slug]` | 64 | selectively indexed subset (of ~775 pages; remainder noindexed by design) |
| Shop | 43 | out of scope for this work |
| Cases `/cases/[slug]` | 22 | 21 case articles + index |
| Newsletter issues | 11 | |
| Country `/country/[code]` | 8 | only countries with ≥5 podcasts |
| Category `/category/[slug]` | 8 | `uk-crime` and `australian-crime` canonicalise to country pages |
| Platform `/platform/[name]` | 6 | only platforms with ≥10 podcasts |
| Core pages (home, best, browse, about, how-we-review, editors-choice, authors, etc.) | ~12 | |
| **Total** | **1,048** | |

**Status codes:** 1,048 × `200`. **Non-self canonicals:** 0. **Noindexed in sitemap:** 0. **Pages without exactly one H1:** 0. **Images without `alt`:** 0.

### Metadata quality (live)

| Check | Count |
|---|---:|
| Pages missing `<title>` | 0 |
| Pages missing meta description | 0 |
| Duplicate titles | 0 |
| Duplicate descriptions | 0 |
| Pages missing `og:image` | 8 (all in `/shop`) |
| Pages missing `twitter:card` | 0 |
| Podcast titles > 65 chars | 31 |
| Podcast descriptions > 165 chars | 108 |
| Podcast descriptions < 70 chars | 46 |
| Blog titles > 65 chars | 41 |
| Newsletter titles > 65 chars | 10 of 11 |

Only 44 of 775 podcast rows have custom `seo_title` / `meta_description` (731 are generated by `lib/seo/podcast-meta.ts`).

### Content depth (visible words, server-rendered HTML)

Median words: podcasts 958 · blog 1,673 · podcasts-like 1,298 · categories 1,561 · countries 1,036 · platforms 1,187 · best page 1,826 · How We Review 823 · About 561 · Contact 268 · Subscribe 297.  
92 URLs have < 700 words; the thinnest are shop category/collection pages, `/blog/category/new-releases` (245), `/blog/category/comparisons` (347), `/blog/category/beginner-guides` (306), `/contact`, `/subscribe`, `/badge`. None are mission-critical for the ranking objective.

---

## 3. Rendering and performance

- **Rendering:** all templates inspected are server-rendered (Next.js 14 App Router). Homepage, best, category, country, platform pages use `createAdminClient()` (no `cookies()`) with `revalidate = 3600`, i.e. static/ISR. Content is fully present in the HTML a crawler receives. `x-vercel-cache: HIT` was observed on the best page.
- **Middleware:** `middleware.ts` runs on essentially every non-asset request (matcher excludes only static assets) and performs `supabase.auth.getUser()` plus a redirect lookup. This is a per-request network call on public pages. It does not affect crawlability but is a latency risk; flagged for manual review rather than changed (auth behaviour is out of scope).
- **HTML weight (uncompressed):** `/country/UK` 404 KB, `/browse` 388 KB, `/authors/david-stark` 344 KB, `/category/binge-worthy` 336 KB, `/best-true-crime-podcasts` 324 KB. These are heavy for what they show (cards + inline RSC payload).
- **Images:** podcast artwork goes through `next/image` with a `remotePatterns` allow-list. `priority` is applied to the first few cards on listing pages.
- **Fonts:** `next/font` self-hosted Inter and Playfair Display with `display: swap`.
- **Core Web Vitals:** **not measured** (see note above). Recommended manual check: Search Console → Core Web Vitals, and PageSpeed Insights with an API key.

---

## 4. Indexation, crawl and canonical review

- **robots.txt (live):** `*` allows `/`, disallows `/admin/`, `/api/`, `/auth/`, `/shop/basket`, `/shop/checkout/`. Explicit `Allow: /` groups exist for GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended and Applebot-Extended. CCBot and Bytespider are blocked. Googlebot and Bingbot fall under `*` (allowed). **Issue:** per-bot groups replace, rather than extend, the `*` group, so the disallows do not apply to the named AI bots.
- **Sitemap:** `/sitemap.xml` is generated, ISR hourly, excludes redirected and noindexed podcasts, thin platform/country pages and non-indexable `podcasts-like` pages. **Issues:** `lastModified` is `now`/`new Date()` for categories, countries, platforms, cases, authors, the best page, browse and many hub pages, i.e. it changes every regeneration and carries no information. Search engines learn to ignore such `lastmod` values. `/best/*` pages and `/editors-choice` freshness are not representative.
- **Canonicals:** the root layout sets `alternates.canonical = BASE` as a default. Any page that does not override it would canonicalise to the homepage. All 1,048 crawled URLs override correctly. Non-indexable utility pages (`/auth/login`, `/newsletter/confirmed`, `/shop/basket`, `/ad-preview`) were not in the crawl; they have no canonical of their own so they inherit the homepage canonical. They are robots-disallowed or noindexed so the risk is low, but the inheritance should be removed.
- **Trailing slash / host:** apex → `308` → `www`. `trailingSlash: false`.
- **Redirects:** admin-managed 301s via middleware plus static redirects in `next.config.js`. Twin podcast pages were consolidated in September 2026.
- **Orphans:** 0 podcast pages are true orphans — all 775 are linked from the 17 paginated `/browse?page=N` pages. However, **163 podcast pages have ≤ 2 inbound links from sitemap pages** and 62 `podcasts-like` pages have ≤ 2. Podcast pages therefore rely on pagination and on `if_you_liked_this` / case-type similarity blocks for discovery. 4 platform pages (`iHeart`, `Patreon`, `NPR`, `bbc-sounds`) have no inbound links in the crawled set.
- **Broken links:** 868 internal link targets that are not in the sitemap were checked (e.g. `/podcasts-like/*`, `/best/*`, `/blog/tag/*`); **0** returned a non-200 status.
- **Duplicate/near-duplicate risk:** `/best/*` vs blog guides (see §6); `/category/uk-crime` and `/category/australian-crime` already canonicalise to country pages; `/authors/<anything>` (finding 6).

---

## 5. Structured data inventory (live, by template)

| Template | Types present |
|---|---|
| All pages (layout) | `WebSite` (+ `SearchAction`), `Organization` (`logo`, `sameAs` = Instagram only) |
| Home | global only |
| Best page | `FAQPage` (7 Q&A), `BreadcrumbList`, `ItemList` (12 items, names + URLs only) |
| Podcast (775) | `PodcastSeries` (775), `BreadcrumbList`, `FAQPage` (775), `Person` host (134), `ListenAction` (44), `Review` **0**, `AggregateRating` **0** |
| Category / country (8 + 8) | `BreadcrumbList`, `FAQPage`, `ItemList` |
| Platform (6) | `BreadcrumbList`, `ItemList`; `FAQPage` on 2 of 6 |
| Podcasts-like (64) | `BreadcrumbList`, `FAQPage`, `ItemList` |
| Blog (98) | `BlogPosting` (68), `Person` author, `FAQPage` (66), `BreadcrumbList`; `Blog` on index |
| Cases (22) | `Article`, `Person`, `FAQPage`, `ItemList`, `BreadcrumbList` |
| Author | `Person`, `BreadcrumbList` |
| How We Review | `Article` (author is `Organization`) |
| About | **none** beyond global |
| Browse | **none** beyond global |

**Gaps:** no `AboutPage`/`ProfilePage` types; `Person` has no `@id` and is not connected to `Organization.founder`; `Organization` has no `@id`, `description` or `founder`; the homepage has no `CollectionPage`/`ItemList`; the best-page `ItemList` lacks `position`/`description`/`image`; `how-we-review` has no `datePublished`/`dateModified` and the `Article` has no `Person`.  
**Not a gap (deliberate):** `Review`/`AggregateRating` are withheld unless an editor rating exists or ≥3 community ratings exist. That is the correct policy given the data.

Two parallel schema helper modules exist (`lib/seo.ts`, whose `BASE` default has no `www`, and `lib/seo/config.ts` + `lib/seo/content.ts`). `lib/seo.ts` is still used by `/best/[slug]`, `/editors-choice` and `/shop/*`; if `NEXT_PUBLIC_SITE_URL` were ever unset in a build, those pages would emit non-canonical-host URLs.

---

## 6. Content, cannibalisation and thin-page notes

- **Primary page** `/best-true-crime-podcasts`: 1,826 words, but most are card text and boilerplate. Single answer paragraph, no editorial reasoning, no per-podcast copy, no sub-intent sections. FAQ answers contain unverifiable claims (finding 1).
- **Competing/overlapping URLs for "best … podcasts" intents:**
  - `/best/serial-killer` ↔ `/blog/best-serial-killer-podcasts` ↔ `/category/serial-killers`
  - `/best/murder-mystery` ↔ `/blog/best-murder-mystery-podcasts` ↔ `/category/murder`
  - `/best/investigative` ↔ `/blog/best-investigative-journalism-podcasts` ↔ `/category/investigative`
  - `/best/uk-true-crime` ↔ `/country/UK` ↔ `/category/uk-crime` (canonical → country)
  - `/best/cold-case`, `/best/missing-persons` already canonicalise to categories and are `noindex`.
  - `/blog/true-crime-podcasts-spotify` ↔ `/platform/Spotify`
- **Title staleness:** all `/best/*` titles hard-code "2025".
- **Case-type taxonomy:** inconsistent casing (finding 13; category pages already normalise it, the podcast template and `/best/*` do not) and 52 podcasts with no `format_type`, 22 with no `case_types`, 15 with empty/missing country.
- **Probable data error found:** `the-trial-of-erin-patterson` is stored with `country = UK` although the case is Australian. Listed in the editorial review report; **not changed**.

---

## 7. Supabase data completeness (775 published podcasts)

| Field | Missing | % |
|---|---:|---:|
| `description` | 0 | 0% |
| `short_description` | 3 | 0.4% |
| `image_url` | 163 | 21% |
| `country` | 15 | 1.9% |
| `case_types` | 22 | 2.8% |
| `format_type` | 54 | 7.0% |
| `host_style` | 71 | 9.2% |
| `factual_style` | 103 | 13.3% |
| `binge_factor` | 70 | 9.0% |
| `episode_length` | 54 | 7.0% |
| `episode_count` | 137 | 17.7% |
| `best_episode_to_start` | 103 | 13.3% |
| `platforms` | 8 | 1.0% |
| `if_you_liked_this` | 282 | 36.4% |
| `newsletter_worthy_summary` | 52 | 6.7% |
| `quick_verdict` | 59 (44 null + 15 empty) | 7.6% |
| `host_name` | 641 | 82.7% |
| `host_bio` | 773 | 99.7% |
| `website_url` | 726 | 93.7% |
| `producer` | 731 | 94.3% |
| **`rating` (editor rating)** | **775** | **100%** |
| `seo_title` / `meta_description` | 731 | 94.3% |

- Editorial verdicts: 122 "Must listen", 25 "Worth a listen", 4 "Worth your time", 4 "Approach with caution", and ~480 free-text audience-fit lines ("Good if UK true crime interests you"). `binge_factor` distribution: 10 → 2, 9 → 23, 8 → 94, 7 → 208, 6 → 353, 5 → 23, 4 → 2.
- Community ratings: 534 podcasts have 1 rating; 2 have 2; **0 have ≥ 3**. Approved reviews: **0**.
- The database has no strengths/weaknesses columns. "Strengths" can only be derived from existing structured fields (format, case types, host style, factual style, country) and the editor-written `newsletter_worthy_summary`, `quick_verdict` and `best_episode_to_start`.

---

## 8. Analytics and Search Console status

- **GA4:** present. `<GoogleAnalytics gaId="G-9EHFH28GZF" />` in the root layout via `@next/third-parties`. Custom events exist for affiliate clicks (`components/affiliates/affiliate-link.tsx`), promotions and ads. There is no documented GA4 conversion list, and no recorded newsletter-signup event was found in the code paths reviewed.
- **Search Console:** **status unknown to this audit.** There is no `google-site-verification` meta tag in the codebase and no verification file in `/public`; verification may be via DNS or a different method. A human must confirm the property, confirm the sitemap has been submitted, and review Page indexing and Core Web Vitals reports.
- **Bing Webmaster Tools / IndexNow:** not referenced in the codebase.

---

## 9. Prioritised issue list (carried into the implementation plan)

**Fix in this project**
1. Rebuild `/best-true-crime-podcasts` with data-driven, honest content, real review dates and richer `ItemList` + `FAQPage` (Phase 3).
2. Podcast template: surface verdict, strengths, who-it's-for, best episode to start, last reviewed, and normalise case-type matching (Phase 4).
3. Structured data: `AboutPage`, `ProfilePage`, linked `@id` graph for `Organization`/`Person`/`WebSite`, richer `ItemList`, `Article` author fix on How We Review (Phase 5).
4. Entity pages: About and How We Review (name the editor, explain editorial vs community vs Binge Factor, remove inaccurate "no ads") (Phase 6).
5. `robots.txt` per-bot disallows; `llms.txt` expansion; AI-visibility checklist (Phase 6).
6. Sitemap `lastmod` accuracy; remove inherited homepage canonical on utility pages; `/authors/<unknown>` → 404; `/best/*` year and cannibalisation handling (Phase 7).
7. Internal links: homepage → best page → categories → podcasts (Phase 7).

**Report for human follow-up (not fabricated)**
- Incomplete podcast records, the `rating` column, thin community ratings, the Erin Patterson country value, GA4/GSC confirmation, CWV measurement.
