import { CATEGORIES, COUNTRIES, PLATFORMS, countryHref, platformHref } from '@/lib/types/database'

export interface LlmsGuide {
  slug: string
  title: string
  featured?: boolean
}

const FEATURED_COUNTRIES = ['UK', 'US', 'AU', 'CA', 'IE']
const FEATURED_PLATFORMS = ['Spotify', 'Apple Podcasts', 'Audible', 'BBC Sounds']

/**
 * Markdown for /llms.txt: what the site is, how its ratings work, and where
 * the best entry points are (llmstxt.org format).
 */
export function buildLlmsTxt(base: string, guides: LlmsGuide[]): string {
  const topGuides = [...guides.filter(g => g.featured), ...guides.filter(g => !g.featured && g.slug.startsWith('best-'))]
    .filter((g, i, all) => all.findIndex(x => x.slug === g.slug) === i)
    .slice(0, 12)

  const lines = [
    '# ListenTrueCrime',
    '',
    '> ListenTrueCrime is a UK-based true crime podcast discovery and review site. Every podcast has an editor score out of 10 and a short verdict from our reviewer; listener ratings are shown separately.',
    '',
    '## How ratings work',
    '',
    '- **Editor score** (out of 10): our reviewer\'s own score for the podcast, shown on every podcast card and page. Podcast pages say who reviewed the show and when.',
    '- **Community rating**: the average of listener ratings. It is only shown once a podcast has at least 5 ratings; below that the site says "Not enough ratings yet". Editor scores and community ratings are never blended.',
    '- Methodology and what each verdict means: ' + `${base}/how-we-review`,
    '',
    '## Start here',
    '',
    `- [Best true crime podcasts](${base}/best-true-crime-podcasts): the ranked list of our top-scored shows`,
    `- [How we review](${base}/how-we-review): scoring criteria and verdicts`,
    `- [Browse all podcasts](${base}/browse): search and filter the full database`,
    `- [Editor's choice](${base}/editors-choice): five hand-picked standouts`,
    '',
    '## Categories',
    '',
    ...CATEGORIES.map(c => `- [${c.label}](${base}/category/${c.slug}): ${c.description}`),
    '',
    '## By country and platform',
    '',
    ...FEATURED_COUNTRIES.filter(code => COUNTRIES[code]).map(code => `- [${COUNTRIES[code]} true crime podcasts](${base}${countryHref(code)})`),
    ...FEATURED_PLATFORMS.filter(name => PLATFORMS.includes(name)).map(name => `- [True crime podcasts on ${name}](${base}${platformHref(name)})`),
    '',
    '## Top guides',
    '',
    ...topGuides.map(g => `- [${g.title}](${base}/blog/${g.slug})`),
    `- [All guides and articles](${base}/blog)`,
    `- [True crime case pages](${base}/cases): case overviews with the podcasts that cover them`,
    '',
    '## Optional',
    '',
    `- [Full podcast listing](${base}/llms-full.txt): every reviewed podcast with its verdict, score and URL`,
    `- [Sitemap](${base}/sitemap.xml)`,
    `- [About](${base}/about) and [contact](${base}/contact)`,
    '',
  ]
  return lines.join('\n')
}
