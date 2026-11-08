# SEO Growth Dashboard: what to track

## Current tracking status

| Tool | Status |
|---|---|
| GA4 | Installed (`G-9EHFH28GZF`, root layout). Custom events exist for affiliate clicks, promotions and ads. No documented key-event list; newsletter signup event not confirmed in code reviewed. |
| Search Console | **Unknown from the repo.** No verification tag or file found (could be DNS). Owner to confirm property, ownership and that `/sitemap.xml` is submitted. |
| Bing Webmaster Tools / IndexNow | Not referenced. Recommended: import the site from Search Console. |
| Core Web Vitals | Not measured (PageSpeed API unauthenticated quota exhausted). Use Search Console CWV report or PSI with a key. |

## Metrics (weekly unless noted)

| Metric | Source | Target view |
|---|---|---|
| Organic clicks, impressions, CTR, position | Search Console → Performance | Trend, 28 days vs previous |
| Target queries: "true crime podcasts", "best true crime podcasts (2026)", "true crime podcast recommendations", "best cold case podcasts", "best serial killer podcasts", "best UK true crime podcasts" | Search Console → Queries filter | Position and clicks per query; landing page should be the owner URL in the keyword strategy |
| `/best-true-crime-podcasts` | Search Console page filter + GA4 | Clicks, position, engagement time, scroll, outbound clicks to podcast pages |
| Podcast page visits from organic | GA4 landing page report, organic channel | Top 20 podcasts; share of 775 receiving any organic visit (monthly) |
| Cannibalisation | Search Console: queries with ≥2 URLs | Should shrink for the `/best/*` and UK/category overlaps |
| Newsletter conversions from organic | GA4 key event for signup (create it) by source/medium; signup `source` values `best_page`, `best_page_lead_magnet` | Conversion rate on best page |
| AI referral traffic | GA4 session source: chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai | Sessions, landing pages (undercounted) |
| Indexation | Search Console → Pages | Indexed vs submitted; "Crawled – not indexed" list (monthly) |
| Core Web Vitals | Search Console | Good-URL share, mobile (monthly) |
| AI visibility checklist | See AI report | Monthly log |

**Success measures to set after 4–6 weeks of data (no targets are asserted here, since no baseline exists):** record current position/clicks for the six target queries today, then compare monthly.

## Search Console submission and monitoring checklist

1. Confirm domain property (DNS) for listentruecrime.com; add `www` URL-prefix property if used.
2. Submit `https://www.listentruecrime.com/sitemap.xml`; check "Success" and discovered-URL count (~1,050).
3. After deploy, URL Inspection → `/best-true-crime-podcasts`, `/about`, `/how-we-review`, `/authors/david-stark` → Request indexing.
4. Check Enhancements: Breadcrumbs, FAQ, Podcast/Review (expect no Review items). Fix any errors.
5. Confirm `/best/*` URLs report "Alternate page with proper canonical" (not an error).
6. Confirm `/authors/<unknown>` shows as 404, not indexed.
7. Weekly: Performance (queries above); monthly: Pages, CWV, Links.
8. Create GA4 key events: newsletter signup, affiliate click, outbound listen click; link GA4 to Search Console.
