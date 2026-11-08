# Keyword Strategy — ListenTrueCrime

**Prepared:** 8 November 2026 · **Baseline:** [SEO-AUDIT-BEFORE.md](./SEO-AUDIT-BEFORE.md)

> **Data caveat.** No keyword-volume, difficulty or Search Console data was available to this work. **Priority reflects commercial/editorial fit, intent match and the strength of the page we already have, not measured search volume.** Validate against Search Console (Performance → Queries) and a keyword tool before committing editorial time. Nothing here is a ranking promise.

## 1. Principles

1. **One primary keyword/intent per indexable URL.** Where two URLs answer the same query, one is the owner and the other is consolidated (canonical) or re-angled.
2. **The existing blog guides are already strong, specific "best X podcasts" pages** (22 guides, 1,000–1,750 words each, updated Jul–Nov 2026). The strategy is to make `/best-true-crime-podcasts` the **hub** that links to them, not to compete with them.
3. **Fact, not hype.** Only claims supported by the database or published pages. No download, listener, award or ranking claims.
4. **UK English**, existing editorial voice.

## 2. Page-to-intent map (owner pages)

| Priority | Primary keyword | Intent | Owner URL | Supporting URLs (internal links in) | Cannibalisation / notes |
|---|---|---|---|---|---|
| **High** | best true crime podcasts (2026) | Commercial investigation / list | `/best-true-crime-podcasts` | Home, nav, every guide, every category | Owner. `/browse` must not target "best". Year kept in title/H1 and refreshed with the page's real review date. |
| **High** | true crime podcasts | Navigational/informational head term | `/` (home) | `/browse` | Home owns the head term and brand; `/best-true-crime-podcasts` owns "best". Home → best link must be prominent. |
| **High** | true crime podcast recommendations | Commercial investigation | `/best-true-crime-podcasts` (secondary on page) | `/podcasts-like/*`, newsletter, guides | Answered by the best page's "How to choose" and "start here" blocks. Do not create a duplicate "recommendations" URL. |
| **High** | best cold case podcasts | Commercial investigation | `/blog/best-cold-case-podcasts` | `/category/cold-cases` (browse intent: "cold case podcasts") | `/best/cold-case` already canonicalises to the category → re-point to the guide. |
| **High** | best serial killer podcasts | Commercial investigation | `/blog/best-serial-killer-podcasts` | `/category/serial-killers` | `/best/serial-killer` duplicates the intent → canonical to the guide. |
| **High** | best UK true crime podcasts | Commercial investigation | `/blog/best-british-true-crime-podcasts` | `/country/UK` ("UK true crime podcasts" directory), `/category/uk-crime` (canonical → country) | Two UK-intent owners exist. Guide owns "best British/UK … podcasts"; country page owns "UK true crime podcasts" (browse). `/best/uk-true-crime` → canonical to guide. |
| **High** | best true crime podcasts for beginners | Commercial investigation | `/blog/best-true-crime-podcasts-for-beginners` | Best page "Beginners" section | `/best/beginners` → canonical to guide. |
| **Medium** | best investigative true crime podcasts | Commercial investigation | `/blog/best-investigative-journalism-podcasts` | `/category/investigative` | `/best/investigative` → canonical to guide. |
| **Medium** | best murder mystery podcasts | Commercial investigation | `/blog/best-murder-mystery-podcasts` | `/browse` (no murder category exists) | `/best/murder-mystery` → canonical to guide. |
| **Medium** | best true crime podcasts on Spotify | Commercial investigation | `/blog/true-crime-podcasts-spotify` | `/platform/Spotify` | Guide = "best … on Spotify"; platform page = directory. Distinct enough; cross-link both ways. |
| **Medium** | best true crime podcasts on Apple Podcasts | Commercial investigation | `/platform/apple-podcasts` | Best page "Apple Podcasts" section | No guide exists. See §5 (gap). |
| **Medium** | best true crime podcasts to binge | Commercial investigation | `/blog/best-true-crime-podcasts-binge-weekend` | `/category/binge-worthy`, best page "Binge" section | `/best/binge-worthy` → canonical to `/category/binge-worthy`. |
| **Medium** | best limited-series / serialised true crime podcasts | Commercial investigation | `/best-true-crime-podcasts` (section) | `/browse?format=…` | `/best/serialized` thin and unlinked → canonical to best page section target. |
| **Medium** | best Australian true crime podcasts | Commercial investigation | `/blog/best-australian-true-crime-podcasts` | `/country/AU`, `/category/australian-crime` (→ country) | `/best/australian-true-crime` → canonical to guide. |
| **Medium** | best fraud / scam podcasts | Commercial investigation | `/blog/best-fraud-scam-podcasts` | `/category/fraud-scams` | `/best/fraud-and-scams` → canonical to guide. |
| **Medium** | best courtroom true crime podcasts | Commercial investigation | `/blog/best-courtroom-true-crime-podcasts` | `/category/courtroom` | `/best/courtroom-drama` → canonical to guide. |
| **Medium** | podcasts like Serial / Crime Junkie / Casefile / My Favorite Murder / RedHanded | Informational/commercial | `/blog/podcasts-like-<show>` | `/podcasts-like/<show>` (noindex except proven) | Already de-duplicated by `lib/seo/indexability.ts`. Keep. |
| **Medium** | Serial vs Casefile; Crime Junkie vs Casefile vs MFM | Comparison | `/blog/serial-vs-casefile`, `/blog/crime-junkie-vs-casefile-vs-my-favorite-murder` | Podcast pages | Strengthen with real fields (format, binge factor). |
| **Medium** | true crime podcast directory / list | Navigational | `/browse` | Home | Do not optimise for "best". Title already "Browse True Crime Podcasts". |
| **Low** | scariest true crime podcasts | Informational/commercial | `/blog/scariest-true-crime-podcasts` | | Seasonal (Oct). Leave. |
| **Low** | best short true crime podcasts | Commercial | `/blog/best-short-true-crime-podcasts` | | Leave. |
| **Low** | wrongful conviction podcasts | Informational/commercial | `/blog/wrongful-conviction-podcasts` | `/category/courtroom` (wrongful-conviction shows are filed under Courtroom) | Leave. |
| **Low** | best true crime podcasts for women | Commercial | `/blog/best-true-crime-podcasts-for-women` | | Leave; keep factual, avoid generalisations. |
| **Low** | best true crime books | Commercial | `/blog/best-true-crime-books-2026` | | Affiliate content; out of scope. |

## 3. Long-tail and AI-query set (used for FAQs, headings and the monitoring checklist)

These phrases shape FAQ questions and H2/H3 wording on the best page and relevant guides. Each answer must be sourced from the database or published guides.

| Query pattern | Where answered |
|---|---|
| "what is the best true crime podcast to start with" | Best page → "Where to start" / Beginners; FAQ |
| "best true crime podcast for beginners" | Best page (Beginners) → beginners guide |
| "best true crime podcasts like Serial" | Best page (Limited series) → `/blog/podcasts-like-serial` |
| "best true crime podcasts with no gore / for sensitive listeners" | **Not claimed.** The database has no content-intensity field; the site will not make this claim. Logged as an editorial gap. |
| "best investigative true crime podcasts" | Best page section → guide |
| "best true crime podcasts about cold cases / missing persons" | Best page section → guide + category |
| "best UK true crime podcasts / British true crime podcasts" | Best page UK section → guide + country page |
| "best serialised vs episodic true crime podcasts" | Best page FAQ (format explained from `format_type`) |
| "which true crime podcasts are on Spotify / Apple Podcasts / BBC Sounds" | Best page platform sections → platform pages |
| "how are true crime podcasts rated / ranked here" | Best page "How we choose" → `/how-we-review` |
| "new true crime podcasts 2026" | `/blog/new-true-crime-podcasts-july-2026` (dated); see §5 |

## 4. Cannibalisation register

| # | Conflict | Evidence | Resolution |
|---|---|---|---|
| C1 | `/best/*` (12 pages) vs blog "best-…" guides vs category pages | Same intents; `/best/*` titles say "2025"; not in sitemap; no inbound links; indexable | Canonical each `/best/*` page to its owner (table §2). Remove hard-coded year from titles. No new pages created. |
| C2 | `/country/UK` vs `/blog/best-british-true-crime-podcasts` vs `/category/uk-crime` | UK intent split three ways | Category already canonicalises to country; guide owns "best", country owns "UK true crime podcasts" directory. Cross-link and differentiate titles. |
| C3 | `/` vs `/best-true-crime-podcasts` vs `/browse` for "true crime podcasts" | All three could match the head term | Home owns head term/brand; best owns "best"; browse owns "browse/list". Titles already differ. |
| C4 | `/platform/Spotify` vs `/blog/true-crime-podcasts-spotify` | Both mention Spotify true crime | Distinct intents (directory vs "best"); cross-link. |
| C5 | `/podcasts-like/<slug>` vs `/blog/podcasts-like-<show>` | Same intent | Already resolved in `lib/seo/indexability.ts` (blog wins). |
| C6 | `/authors/<any>` | Infinite duplicates of David Stark's page | Fixed in implementation (404 for unknown slugs). |

## 5. Gaps and recommended (not mass-produced) content

Only add pages where verified data already supports them.

1. **"Best true crime podcasts on Apple Podcasts"** — 763 of 775 podcasts list Apple Podcasts, so a "best on Apple" list would be nearly identical to the main list. **Do not create a page.** The best page's Apple Podcasts section links to `/platform/apple-podcasts` and explains why.
2. **"New true crime podcasts 2026"** — one dated July guide exists. Refresh it periodically using `created_at` in the database. Editorial task, not automated.
3. **Content-intensity / sensitive-listener guidance** — no field exists. Recommend adding an editor-entered field before publishing such a page.
4. **Case-based pages** (e.g. a specific murder) — the 22 `/cases/*` pages already exist; extend only with verified podcast mappings from `lib/cases.ts`. Distinguish fact from allegation (existing house style).

## 6. On-page rules for the primary page

- Title (≤ 60 chars): `Best True Crime Podcasts (2026): Expert-Reviewed` style, year driven by the same constant used for the visible "last reviewed" date.
- H1 = primary keyword; one `<h1>`; H2 per sub-intent using the long-tail phrasing in §3.
- First paragraph answers the query directly and names the top picks (all links to review pages).
- Visible **"Last reviewed"** date derived from real data (see implementation notes), not the render time.
- `ItemList` + `FAQPage` JSON-LD must match visible content 1:1.
