# On-Page SEO & GEO Checklist

Run through this before publishing anything new — a blog post, a case page, a new category. Paired with [PAGE_TEMPLATES.md](./PAGE_TEMPLATES.md) for the exact code shape of each page type.

---

## Every new page — technical baseline

- [ ] Title tag is unique, under ~60 characters, does **not** include `| ListenTrueCrime` (the site template in `app/layout.tsx` appends that automatically — including it manually double-brands the tag)
- [ ] Meta description is unique, ≤160 characters, and is a real sentence a human would want to read — not keyword stuffing
- [ ] Exactly one `<h1>` per page, matching (or near-matching) the title tag's intent
- [ ] `alternates: { canonical: ... }` set to the canonical `https://www.listentruecrime.com/...` URL (apex `listentruecrime.com` redirects to `www` — always link/canonicalize to `www`)
- [ ] Page is reachable from at least one internal link (orphan pages don't get crawled reliably) and appears in `app/sitemap.ts` (dynamic content — podcasts, cases, blog posts — picks this up automatically; a genuinely new *page type* needs a manual entry)
- [ ] If the page reads from Supabase for public data only (no auth), use `createAdminClient()` — never the cookie-based `lib/supabase/server.ts` client, which forces the whole route to render dynamically with zero caching. Add `export const revalidate = 3600` (or a sensible window) alongside it.
- [ ] Images use `next/image`, real `alt` text (not the filename), and `priority` only on above-the-fold/LCP images — not on every image in a grid

## Classic SEO

- [ ] Target a specific long-tail phrase, not a generic head term — "podcasts like Casefile" beats "true crime podcasts"
- [ ] H2s reflect real sub-questions a reader has, not just section labels for their own sake
- [ ] At least 2–3 contextual internal links to related pages (podcast → similar podcasts, blog post → related podcasts/cases, category → related categories) — link because it's genuinely useful to the reader, not to hit a quota
- [ ] No duplicate content — if two pages could plausibly rank for the same query, one should canonicalize to the other or they need clearly distinct angles

## AI SEO / GEO (this is what actually differs from classic SEO)

- [ ] **First paragraph is the answer**, not a wind-up. 40–60 words, directly answers "what is this," fully self-contained (would still make sense pasted into a chat with zero surrounding context). This paragraph is what gets lifted into AI Overviews/Perplexity — write it knowing that.
- [ ] Every major section can stand alone. If an AI system extracts just that one paragraph or list, does it still make sense without "as mentioned above" or "see the previous section"?
- [ ] Concrete and specific: real numbers (episode counts, ratings, years, download figures), named shows/hosts/cases — not "some podcasts" or "many listeners." Vague claims don't get cited; specific ones do.
- [ ] Claims are attributable — either to your own review methodology (`/how-we-review`) or to a checkable public fact. Don't state something as fact that you can't point to a source for.
- [ ] FAQ section covers the actual questions people type into ChatGPT/Perplexity/Google, not just "What is X?" — check "best X for Y," "is X worth it," "X vs Y," "how many episodes does X have"
- [ ] FAQ schema (`FAQPage` JSON-LD) content **matches the visible FAQ text exactly** — mismatched schema vs. visible content risks a manual action, and AI crawlers reading the rendered page will see the visible text anyway, not the schema
- [ ] Lists and comparisons use actual `<ul>`/`<ol>`/table markup, not prose pretending to be a list — structured markup extracts more reliably than prose

## E-E-A-T

- [ ] Author byline present and links to `/authors/david-stark` (or whichever real person wrote/reviewed it) — never leave it unattributed or attributed only to "the editorial team"
- [ ] `Person` schema for the author (not `Organization`) on `Review`/`Article`/`BlogPosting` types — see the Aug 2026 fix in commit `3926193` / `8c04060` for the reference pattern
- [ ] Publish date set; update date changed whenever the content is meaningfully revised (not just typo fixes) — `dateModified` in schema should reflect real edits
- [ ] For case pages specifically: no claims beyond what's publicly established, no naming unconvicted suspects, sourced and non-sensational — this is the site's biggest legal/reputational exposure, treat it as a hard gate, not a nice-to-have
- [ ] For review content: verdict/score reflects the stated methodology (`/how-we-review`), not vibes — if the six dimensions don't obviously support the verdict, something's off

## Per-content-type quick checks

**New blog post** (`content/blog/*.mdx`) — frontmatter has `title`, `slug`, `date`, `description`, `category`, `tags`, 3+ `faqs`; `relatedPodcasts` populated if the post discusses specific shows (auto-generates a "podcasts mentioned" section); don't manually hyperlink podcast names in body text, the autolinker (`lib/podcast-autolink.ts`) handles it.

**New case page** (`content/cases/data.ts`) — start with `published: false`, fill `summary` (2–3 paragraphs, factual), link real `podcasts.slug` values, add `aliases` covering how people actually search for the case, review the summary for accuracy/sensitivity, only then flip `published: true`.

**New category/country/platform** — add the slug to `lib/types/database.ts`, then a full `PageSeoContent` entry (H1, 2-paragraph intro, 4–6 FAQs, related links) to the matching record in `lib/seo/content.ts`. Nothing else needed.

**New podcast entry** — insert into the Supabase `podcasts` table with `is_published: true`. Fill `short_description`, `case_types`, `platforms`, `if_you_liked_this` (drives the "similar podcasts" internal linking) — the more structured fields are filled in, the better the auto-generated pros/cons/FAQ/who's-it-for content on that podcast's page will be, since those are all derived from the data, not hand-written.
