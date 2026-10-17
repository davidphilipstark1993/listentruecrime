const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://listentruecrime.com'

export { BASE }

export function canonicalUrl(path: string) {
  return `${BASE}${path}`
}

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ListenTrueCrime',
  url: BASE,
  logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` },
  description: 'The best destination for discovering, rating, and discussing true crime podcasts. Expert reviews, community ratings, and curated recommendations.',
}

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ListenTrueCrime',
  url: BASE,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/browse?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function faqSchema(items: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}
