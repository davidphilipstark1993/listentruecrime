# Page Templates — SEO & GEO Structure Reference

How each page type on ListenTrueCrime is actually built, so new pages follow the same pattern. Everything here describes real, live code — not a proposal. If you're adding a new category, case, or blog post, copy the pattern for the matching section below.

Related: [ON_PAGE_SEO_CHECKLIST.md](./ON_PAGE_SEO_CHECKLIST.md) for the pre-publish checklist, [CONTENT_PLAN.md](./CONTENT_PLAN.md) for what to write next.

---

## 1. Podcast listing / directory pages

**Files:** `app/category/[slug]/page.tsx`, `app/country/[country]/page.tsx`, `app/platform/[platform]/page.tsx` (all three share one pattern), plus `app/best-true-crime-podcasts/page.tsx` as the flagship/pillar variant. `app/browse/page.tsx` is a deliberate exception — see note at the end.

### Title tag

```
{H1} ({year})
```
Example: `Best Cold Case Podcasts (2026)` — for the category page, the fuller form `— Curated Picks` is appended: `Best Cold Case Podcasts (2026) — Curated Picks`.
The site-wide template in `app/layout.tsx` (`'%s | ListenTrueCrime'`) appends the brand automatically — **never** put `| ListenTrueCrime` in a page-level title, it'll double up.

### Meta description

First sentence of the page's `intro` copy, hard-capped at 160 characters:
```ts
description: (baseDescription + descriptionSuffix).slice(0, 160)
```

### H1 + intro (this is your BLUF/GEO block)

`h1` and `intro[0..1]` come from `lib/seo/content.ts` (`CATEGORY_SEO`, `COUNTRY_SEO`, `PLATFORM_SEO` — a `Record<slug, PageSeoContent>`):
```ts
export interface PageSeoContent {
  h1: string
  intro: string[]   // 2 paragraphs — intro[0] doubles as the meta description
  faqs: { q: string; a: string }[]
  relatedLinks?: { href: string; label: string }[]
}
```
**`intro[0]` must stand alone** — it's reused as the meta description, the visible lede under the H1, and it's the paragraph most likely to get lifted verbatim into an AI Overview or Perplexity citation. Write it as a 40–60 word direct answer to "what is this category," not a teaser.

### Schema stack

- `BreadcrumbList` — `buildBreadcrumbSchema([{name, url}, ...])` from `lib/seo/content.ts`
- `FAQPage` — `buildFAQSchema(seo.faqs)`, only rendered if `faqs` exist
- `ItemList` — `buildItemListSchema(name, description, items)`, top 20 podcasts on the page, only rendered if the page has results

```ts
const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: BASE },
  { name: 'Browse', url: `${BASE}/browse` },
  { name: h1, url: `${BASE}/category/${slug}` },
])
const itemListSchema = podcasts.length > 0 ? buildItemListSchema(
  h1, seo?.intro[0] ?? cat.description,
  podcasts.slice(0, 20).map(p => ({ name: p.title, url: `${BASE}/podcasts/${p.slug}` }))
) : null
```

### Page structure

1. Breadcrumb nav
2. H1 + intro paragraphs
3. Result count line ("N podcasts — expert-reviewed and community-rated")
4. Podcast grid (`PodcastCard`, first row gets `priority` for image LCP)
5. Newsletter CTA
6. FAQ section (`<details>` accordion, only if `seo.faqs` exists — **must match the FAQPage schema content exactly**, word for word)
7. Related-category links (internal linking — `seo.relatedLinks`)

### Caching

`export const revalidate = 3600` + `createAdminClient()` (never the cookie-based `lib/supabase/server.ts` client for plain public reads — see the Aug 2026 caching fix, commit `209205d`). Cookie-based clients force full dynamic rendering with zero caching, even on routes with `generateStaticParams`.

### To add a new category/country/platform page

1. Add the slug to `CATEGORIES` / `COUNTRIES` / `PLATFORMS` in `lib/types/database.ts`
2. Add its `PageSeoContent` entry to the matching `_SEO` record in `lib/seo/content.ts` — H1, 2-paragraph intro (first paragraph self-contained), 4–6 FAQs, related links
3. Nothing else — the page component reads these records dynamically

### Exception: `/browse`

`app/browse/page.tsx` is `'use client'` — a live-filtering search tool (query, case type, country, platform, binge factor, sort), fetched client-side via the anon Supabase client. It is **not** meant to be a crawlable content page per filter combination (no filter URLs are in the sitemap) — it's UI, not indexed long-tail content. Don't try to SSR/ISR it or add per-filter schema; that's what the category/country/platform pages are for.

---

## 2. Individual podcast pages

**File:** `app/podcasts/[slug]/page.tsx`

### Title tag
```
{podcast.title} Review — Is It Worth Listening To?
```

### Meta description
`podcast.short_description ?? podcast.description?.slice(0, 160)`

### OG image
Uses the podcast's real cover art (`podcast.image_url`) when available, falls back to a branded dynamic OG image (`/og?title=...&verdict=...&score=...`) — always prefer real cover art, it performs better on social and is what a listener actually recognizes.

### Schema stack (five types on one page)

- `BreadcrumbList`
- `Review` — **author is `Person` (David Stark), not `Organization`** (fixed Aug 2026 — Google's review rich-results favor a named critic over a brand):
  ```ts
  {
    '@context': 'https://schema.org', '@type': 'Review',
    itemReviewed: { '@type': 'PodcastSeries', name: podcast.title, url },
    author: { '@type': 'Person', name: getAuthor('david-stark').name, url: `${BASE}/authors/david-stark` },
    reviewRating: { '@type': 'Rating', ratingValue: podcast.binge_factor, bestRating: 10, worstRating: 1 },
    reviewBody: podcast.newsletter_worthy_summary,
    datePublished, dateModified,
  }
  ```
- `AggregateRating` + community `Rating` (from `podcast_rating_stats`)
- `Person` for the host — `getPodcastPersonSchema(podcast)` in `lib/seo/podcast-analysis.ts`
- `FAQPage` — auto-generated Q&A from the podcast's own data (verdict, score, description) via `getPros`/`getCons`/`getHostDescription`

### Content structure (GEO-relevant)

- **Quick Verdict block** — the `newsletter_worthy_summary` field is a deliberate BLUF: one blockquoted sentence, above the fold, self-contained enough to be lifted as an AI citation on its own
- **Who it's for** — `getWhoIsItFor()` derives 2–4 bullet audience-fit lines from structured podcast attributes (format, case types, binge factor, host style) — always self-contained sentences, never "see above"
- **Pros / cons** — `getPros()` / `getCons()` in `lib/seo/podcast-analysis.ts`, generated from the same structured fields
- **Byline** — "By [David Stark](/authors/david-stark)" linking to the author page, next to a "How we review →" link to methodology (`/how-we-review`)
- **Similar podcasts** — internal linking via `if_you_liked_this` (explicit) falling back to shared `case_types` (algorithmic), 6 cards
- Auto-linked case references where a case page exists (`getCasesForPodcast`)

### Caching
`export const revalidate = 3600`, `createAdminClient()`. This page was already correct before the Aug 2026 audit — it's the reference pattern the other listing pages were brought in line with.

### To add a new podcast
No code changes — insert a row in the `podcasts` Supabase table (`is_published: true`). The page, schema, and sitemap entry all generate from the data.

---

## 3. Case / topic pages

Two flavors: **case pages** (`app/cases/[slug]/page.tsx`) for a specific real crime, and **blog posts** (`app/blog/[slug]/page.tsx`) for everything else (comparisons, guides, best-of lists, deep dives — see `CONTENT_PLAN.md`'s 21 clusters).

### 3a. Case pages

**Data:** `content/cases/data.ts` — no CMS, no markdown, a typed array:
```ts
export interface CaseData {
  slug: string
  name: string
  aliases: string[]     // alternative search terms — people search "Adnan Syed", not "The Murder of Hae Min Lee"
  year: number
  location: string
  country: string        // 2-letter: US, UK, AU, CA
  status: 'solved' | 'cold' | 'ongoing' | 'partial'
  published: boolean     // flip true after review — false hides it from sitemap/site
  summary: string[]      // 2-3 factual paragraphs; sensitive, no sensationalism
  podcasts: { slug: string; note?: string; bestStart?: boolean }[]
  faqs: { q: string; a: string }[]
}
```

**Title:** `{case.name} — Podcasts and Overview`
**Description:** `summary[0].slice(0, 160)` — same self-contained-first-paragraph rule as listing pages.

**Schema:** `BreadcrumbList`, `Article` (author = `Person`/David Stark as of commit `8c04060`), `FAQPage`, `ItemList` of the podcasts covering the case.

**Content rule — this is the one place E-E-A-T and editorial responsibility matter most:** `summary` must be factual, sourced, non-sensational, and must not name unconvicted suspects or make claims beyond what's publicly established. `published: false` is the safety valve — draft it, review it properly, then flip the flag.

**To add a case:** append a `CaseData` object to `content/cases/data.ts` with `published: false`, fill in `podcasts` referencing real `podcasts.slug` values, write the summary, review, flip to `true`.

### 3b. Blog posts (comparisons, guides, best-of lists, deep dives)

**Data:** MDX files in `content/blog/*.mdx`, frontmatter-driven:
```yaml
---
title: "Best BBC True Crime Podcasts: The Corporation's Essential Crime Output"
slug: "best-bbc-true-crime-podcasts"
date: "2026-07-05"
updated: "2026-07-05"
description: "..."           # meta description, self-contained
category: "Podcast Recommendations"
tags: ["BBC", "British", "investigative journalism"]
featured: false
author: "david-stark"        # optional, defaults to 'david-stark' — only set if a different author is added later
relatedPodcasts: ["the-missing-cryptoqueen", "hunting-warhead"]  # rendered as cards at the end of the post
faqs:
  - q: "..."
    a: "..."                 # 3+ recommended, becomes FAQPage schema
---
```

**Schema:** `BlogPosting` (author = `Person`, `jobTitle`, OG `article:author`), `FAQPage` from frontmatter `faqs`.

**Auto-linking:** podcast titles mentioned in body text are automatically hyperlinked to their `/podcasts/[slug]` page via `lib/podcast-autolink.ts` — don't manually link podcast names in prose, it's handled for you (and manual links won't be double-linked, the autolinker skips existing markdown links).

**To add a post:** new `.mdx` file in `content/blog/`, follow the frontmatter shape above. No other code changes — `generateStaticParams` picks it up automatically, and it appears in the sitemap on next build.

---

## Copy-paste JSON-LD reference

Minimal versions of the four schema types used across the site, for a genuinely new page type not covered above:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "Question text?", "acceptedAnswer": { "@type": "Answer", "text": "40-60 word self-contained answer." } }
  ]
}
```
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.listentruecrime.com" },
    { "@type": "ListItem", "position": 2, "name": "Section", "item": "https://www.listentruecrime.com/section" }
  ]
}
```
```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "itemReviewed": { "@type": "PodcastSeries", "name": "Show Name", "url": "https://www.listentruecrime.com/podcasts/show-slug" },
  "author": { "@type": "Person", "name": "David Stark", "url": "https://www.listentruecrime.com/authors/david-stark" },
  "reviewRating": { "@type": "Rating", "ratingValue": 8, "bestRating": 10, "worstRating": 1 }
}
```
In code, prefer the builder functions in `lib/seo/content.ts` (`buildFAQSchema`, `buildBreadcrumbSchema`, `buildItemListSchema`) over hand-writing these — they're already used everywhere else and keep the shape consistent.
