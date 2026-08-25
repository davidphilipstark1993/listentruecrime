import { BASE } from '@/lib/seo/config'

export async function GET() {
  const content = `# ListenTrueCrime

> The internet's most comprehensive true crime podcast database. Expert-reviewed and community-rated.

## What this site is

ListenTrueCrime is a discovery and review platform for true crime podcasts. We help listeners find, rate, and discuss true crime shows through expert editorial reviews and community ratings.

## How ratings work

Each podcast is scored 1–10 across six dimensions by our editorial team and by registered community members:

- **Storytelling** — narrative structure, pacing, how the case is told
- **Research Quality** — depth of sourcing, use of primary documents and interviews
- **Host Quality** — presentation, authority, trustworthiness
- **Production / Audio** — sound quality, editing, professional finish
- **Binge Factor** — how compulsively listenable the show is (our most-weighted metric)
- **Factual Accuracy** — accuracy of claims, responsible use of evidence
- **Overall Score** — aggregate community rating

Editorial verdicts: **Must Listen** (exceptional across all dimensions) or **Worth a Listen**.

Our methodology is fully explained at: ${BASE}/how-we-review

## Key hub pages

- Browse all podcasts (with filters): ${BASE}/browse
- Best true crime podcasts (ranked): ${BASE}/best-true-crime-podcasts
- Cold case podcasts: ${BASE}/category/cold-cases
- Missing persons podcasts: ${BASE}/category/missing-persons
- Investigative podcasts: ${BASE}/category/investigative
- Serial killer podcasts: ${BASE}/category/serial-killers
- Binge-worthy podcasts: ${BASE}/category/binge-worthy
- UK true crime: ${BASE}/country/UK
- Australian true crime: ${BASE}/country/AU
- US true crime: ${BASE}/country/US
- Canadian true crime: ${BASE}/country/CA
- True crime on Spotify: ${BASE}/platform/Spotify
- True crime on Apple Podcasts: ${BASE}/platform/Apple%20Podcasts

## Case deep-dive articles and blog

Beyond podcast reviews, we publish original editorial coverage of major true crime cases — fact-checked, sourced, and clearly distinguishing established facts from allegations and unproven claims.

- All true crime cases (overview + podcast guide per case): ${BASE}/cases
- Full article blog: ${BASE}/blog
- Christian Brueckner / Madeleine McCann case (10-article series): ${BASE}/cases/madeleine-mccann and ${BASE}/blog/tag/madeleine-mccann
  - Start here: ${BASE}/blog/who-is-christian-brueckner-madeleine-mccann
- Lucy Letby case (4-article series): ${BASE}/cases/lucy-letby and ${BASE}/blog/tag/lucy-letby
  - Start here: ${BASE}/blog/lucy-letby-timeline

## Full podcast listing

A compact listing of every podcast in our database (name, verdict, binge score, description, URL) is available at: ${BASE}/llms-full.txt

## About us

ListenTrueCrime was built to cut through the noise of podcast discovery. Every show in our database is reviewed on consistent dimensions — giving listeners the signal, not the noise.

Contact: info@listentruecrime.com
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  })
}
