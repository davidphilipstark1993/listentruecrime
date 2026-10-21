import { BASE } from '@/lib/seo/config'
import type { PublicProduct } from './types'

export const productUrl = (slug: string) => `${BASE}/shop/${slug}`

/** Product structured data. Offers are emitted only for real, priced, purchasable products. */
export function productJsonLd(p: PublicProduct) {
  const images = p.images.filter(i => !i.placeholder).map(i => i.url)
  const prices = p.variants.filter(v => v.purchasable && v.pricePence != null).map(v => (v.pricePence as number) / 100)
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.shortDescription ?? p.description?.split('\n')[0] ?? p.title,
    url: productUrl(p.slug),
    brand: { '@type': 'Brand', name: 'Listen True Crime' },
    category: p.category,
    ...(images.length ? { image: images } : {}),
  }
  if (!prices.length) return base
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  return {
    ...base,
    offers: {
      '@type': low === high ? 'Offer' : 'AggregateOffer',
      priceCurrency: 'GBP',
      ...(low === high ? { price: low.toFixed(2) } : { lowPrice: low.toFixed(2), highPrice: high.toFixed(2), offerCount: prices.length }),
      availability: 'https://schema.org/InStock', // print-on-demand: made to order, no stock levels
      url: productUrl(p.slug),
      itemCondition: 'https://schema.org/NewCondition',
    },
  }
}

export function itemListJsonLd(name: string, products: PublicProduct[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: productUrl(p.slug), name: p.title })),
  }
}

export function JsonLd({ data }: { data: unknown }) {
  // JSON.stringify output is safe in a script tag except for "</script"; escape "<".
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
