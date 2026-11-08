import { BASE, ORG_ID, WEBSITE_ID, personId } from '@/lib/seo/config'
import type { BestPodcast, Faq } from '@/lib/best-page'

interface Args {
  url: string
  name: string
  description: string
  dateModified: string
  authorSlug: string
  topPicks: { podcast: BestPodcast; summary: string }[]
  faqs: Faq[]
  breadcrumb: { name: string; url: string }[]
}

/**
 * One JSON-LD graph for the page. Everything in it is also visible on the page:
 * the ItemList is the numbered "Editor's top picks" list, the FAQPage is the
 * visible FAQ, and no Review or AggregateRating is emitted (there is no
 * per-show editor rating and community ratings are too sparse to aggregate).
 */
export function buildBestPageGraph(a: Args) {
  const listId = `${a.url}#top-picks`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${a.url}#webpage`,
        url: a.url,
        name: a.name,
        description: a.description,
        inLanguage: 'en-GB',
        dateModified: a.dateModified,
        isPartOf: { '@id': WEBSITE_ID },
        publisher: { '@id': ORG_ID },
        author: { '@id': personId(a.authorSlug) },
        breadcrumb: { '@id': `${a.url}#breadcrumb` },
        mainEntity: { '@id': listId },
      },
      {
        '@type': 'ItemList',
        '@id': listId,
        name: `Editor's top picks: best true crime podcasts`,
        numberOfItems: a.topPicks.length,
        itemListElement: a.topPicks.map(({ podcast, summary }, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${BASE}/podcasts/${podcast.slug}`,
          name: podcast.title,
          ...(podcast.image_url && { image: podcast.image_url }),
          ...(summary && { description: summary }),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${a.url}#breadcrumb`,
        itemListElement: a.breadcrumb.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: b.url })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${a.url}#faq`,
        mainEntity: a.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  }
}
