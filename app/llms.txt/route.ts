import { BASE } from '@/lib/seo/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthor } from '@/lib/authors'

export const revalidate = 86400

export async function GET() {
  const editor = getAuthor('david-stark')
  const { count } = await createAdminClient()
    .from('podcasts')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
  const total = count ? `${count} true crime podcasts` : 'a large directory of true crime podcasts'

  const content = `# ListenTrueCrime

> ListenTrueCrime is an independent true crime podcast guide. It lists ${total}, each with an editorial verdict and an editorial Binge Factor score (1–10), alongside separate community ratings. Edited by ${editor.name}, ${editor.role}. UK English.

Editorial verdicts and Binge Factor scores are the editor's opinion, informed by public listener and critic reviews; the site does not claim to have listened to every episode of every show. Community ratings are shown separately and do not replace the editorial verdict. Paid promotion and affiliate links never decide which podcasts are reviewed or how they are rated.

## Start here

- [Best true crime podcasts](${BASE}/best-true-crime-podcasts): Editor's top picks, plus the best shows for beginners, investigative journalism, cold cases, serial killers, the UK, binge-listening, limited series, Spotify and Apple Podcasts. Includes a visible last-updated date and FAQs.
- [How we review](${BASE}/how-we-review): How the editorial verdict, Binge Factor and community ratings work and how they differ.
- [About ListenTrueCrime](${BASE}/about): Who runs the site, how it is funded and how independence is handled.
- [${editor.name}, ${editor.role}](${BASE}/authors/${editor.slug}): The editor who sets verdicts and Binge Factor scores.
- [Browse all podcasts](${BASE}/browse): The full directory with filters for case type, country, platform and Binge Factor.

## Best-of guides

- [Best true crime podcasts for beginners](${BASE}/blog/best-true-crime-podcasts-for-beginners)
- [Best cold case podcasts](${BASE}/blog/best-cold-case-podcasts)
- [Best serial killer podcasts](${BASE}/blog/best-serial-killer-podcasts)
- [Best British true crime podcasts](${BASE}/blog/best-british-true-crime-podcasts)
- [Best Australian true crime podcasts](${BASE}/blog/best-australian-true-crime-podcasts)
- [Best investigative true crime podcasts](${BASE}/blog/best-investigative-journalism-podcasts)
- [Best murder mystery podcasts](${BASE}/blog/best-murder-mystery-podcasts)
- [Best courtroom true crime podcasts](${BASE}/blog/best-courtroom-true-crime-podcasts)
- [Best fraud and scam podcasts](${BASE}/blog/best-fraud-scam-podcasts)
- [Best true crime podcasts to binge in a weekend](${BASE}/blog/best-true-crime-podcasts-binge-weekend)
- [Best true crime podcasts on Spotify](${BASE}/blog/true-crime-podcasts-spotify)

## Comparisons and "podcasts like"

- [Podcasts like Serial](${BASE}/blog/podcasts-like-serial)
- [Podcasts like Crime Junkie](${BASE}/blog/podcasts-like-crime-junkie)
- [Podcasts like Casefile](${BASE}/blog/podcasts-like-casefile)
- [Serial vs Casefile](${BASE}/blog/serial-vs-casefile)
- [Crime Junkie vs Casefile vs My Favorite Murder](${BASE}/blog/crime-junkie-vs-casefile-vs-my-favorite-murder)

## Categories, countries and platforms

- [Cold case podcasts](${BASE}/category/cold-cases)
- [Missing persons podcasts](${BASE}/category/missing-persons)
- [Investigative podcasts](${BASE}/category/investigative)
- [Serial killer podcasts](${BASE}/category/serial-killers)
- [Binge-worthy podcasts](${BASE}/category/binge-worthy)
- [UK true crime podcasts](${BASE}/country/UK)
- [Australian true crime podcasts](${BASE}/country/AU)
- [US true crime podcasts](${BASE}/country/US)
- [Canadian true crime podcasts](${BASE}/country/CA)
- [True crime podcasts on Spotify](${BASE}/platform/Spotify)
- [True crime podcasts on Apple Podcasts](${BASE}/platform/apple-podcasts)

## Case coverage

Original articles on major cases that separate established facts from allegations and unproven claims.

- [True crime cases and podcast guides](${BASE}/cases)
- [Lucy Letby case](${BASE}/cases/lucy-letby): start with [the timeline](${BASE}/blog/lucy-letby-timeline)
- [Madeleine McCann case](${BASE}/cases/madeleine-mccann): start with [who is Christian Brueckner](${BASE}/blog/who-is-christian-brueckner-madeleine-mccann)

## Optional

- [Full podcast listing](${BASE}/llms-full.txt): compact list of every podcast with its verdict, Binge Factor, description and URL
- [Blog](${BASE}/blog)
- [Newsletter archive](${BASE}/newsletter)
- [Sitemap](${BASE}/sitemap.xml)

Contact: info@listentruecrime.com
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  })
}
