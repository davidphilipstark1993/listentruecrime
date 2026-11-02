import { BASE } from '@/lib/seo/config'
import type { PublicProduct } from './types'
import { DELIVERY_ESTIMATE, DELIVERY_TIMES, RETURN_WINDOW_DAYS } from './copy'

export const productUrl = (slug: string) => `${BASE}/shop/${slug}`

const days = (min: number, max: number) => ({ '@type': 'QuantitativeValue', minValue: min, maxValue: max, unitCode: 'DAY' })

/**
 * UK-only, made to order. No shippingRate: delivery is charged at the supplier's
 * quoted rate and varies by basket (see the Shipping Policy), so no fixed price is claimed.
 */
export function shippingDetailsJsonLd() {
  return {
    '@type': 'OfferShippingDetails',
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'GB' },
    ...(DELIVERY_ESTIMATE && {
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: days(0, DELIVERY_TIMES.productionMaxDays),
        transitTime: days(DELIVERY_TIMES.transitMinDays, DELIVERY_TIMES.transitMaxDays),
      },
    }),
    url: `${BASE}/shop/shipping-policy`,
  }
}

/** 14-day change-of-mind window, customer pays return postage (see the Returns and Refunds Policy). */
export function returnPolicyJsonLd() {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'GB',
    returnPolicyCountry: 'GB',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: RETURN_WINDOW_DAYS,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnShippingFees',
    merchantReturnLink: `${BASE}/shop/returns-and-refunds`,
  }
}

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
      shippingDetails: shippingDetailsJsonLd(),
      hasMerchantReturnPolicy: returnPolicyJsonLd(),
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
