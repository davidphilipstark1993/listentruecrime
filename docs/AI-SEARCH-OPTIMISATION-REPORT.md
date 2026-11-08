# AI Search (GEO / AEO) Optimisation Report

**Date:** 8 November 2026. No AI citation or ranking outcome can be guaranteed; this is groundwork and a way to measure it.

## 1. What was done

| Lever | Change |
|---|---|
| Entity identity | One `@id` graph: `Organization` (description, founder), `WebSite`, `Person` (David Stark). Every template references them. `AboutPage`, `ProfilePage`, `Article` (How We Review) point at the same nodes. |
| Plain-language entity facts | About: what the site is, who runs it, how it is funded. How We Review: signals table (editorial verdict, Binge Factor, community ratings), how Binge Factor is assigned, last-updated date. All drawn from existing site statements (Terms, promotion page). |
| Extractable recommendation page | `/best-true-crime-podcasts`: answer in the first paragraph, "Quick answers" list, question-style H2/H3, always-visible FAQs (not collapsed), consistent terms ("Must listen", "Binge Factor"), visible dates. |
| Honesty signals | Page states it has not listened to every episode, how verdicts are set, that paid promotion does not buy a place. Unverifiable award/popularity wording is filtered out of this page. |
| `llms.txt` | Standard format; summary, start-here pages, guides, categories, case coverage, optional block; live podcast count. `llms-full.txt` wording aligned. |
| Crawler access | See policy below; disallows now apply to every named bot group. |

## 2. Crawler policy (decision recorded in `app/robots.ts`)

| Group | Bots | Policy | Why |
|---|---|---|---|
| Search | Googlebot, Bingbot, others (`*`) | Allow, minus admin/api/auth/basket/checkout | Core organic traffic |
| AI search / answer | OAI-SearchBot, Claude-SearchBot, PerplexityBot | Allow | These fetch pages to cite them |
| AI training | GPTBot, ClaudeBot, Google-Extended, Applebot-Extended | **Allow (existing owner choice, kept)** | Presence in model knowledge supports recommendation visibility |
| Bulk scrapers | CCBot, Bytespider | Block | No referral value |

If you prefer to opt out of training only, change the four training bots to `disallow: '/'` (comment in file). Search-bot visibility is unaffected. This is a business decision, so it was not changed.

## 3. Remaining manual tasks

1. Deploy, then confirm `llms.txt` and `robots.txt` on production.
2. Consider adding a `last_reviewed_at` field so podcast pages can show a true review date.
3. Verify or remove the 58 award/popularity claims in podcast summaries.
4. Build more third-party corroboration (press, podcast creators linking to their review): the largest remaining lever for being named by AI systems, and not something code can do.
5. Optionally verify the Instagram `sameAs`; add other profiles only once they exist.

## 4. AI visibility monitoring checklist

Run monthly in a logged-out/private session, per assistant (ChatGPT with search, Claude with search, Gemini, Perplexity, Google AI Overviews). Log date, assistant, whether listentruecrime.com is cited or named, which URL, and what it said.

**Prompts**
1. What are the best true crime podcasts in 2026?
2. Best true crime podcasts for beginners?
3. What are the best cold case podcasts?
4. Best serial killer podcasts?
5. Best UK / British true crime podcasts?
6. True crime podcasts like Serial / Crime Junkie / Casefile?
7. Best investigative true crime podcasts?
8. Short true crime podcasts to binge in a weekend?
9. Where can I find reviews of true crime podcasts? / What is ListenTrueCrime?
10. What is "Binge Factor" for podcasts?

**Check:** cited with link? correct description? any invented claims about the site (report and fix the source page if the cause is ambiguous wording)? which competitor sources appear instead? Also review referrals from chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com and claude.ai in GA4 (see growth dashboard). Referral data undercounts AI use; treat as directional.
