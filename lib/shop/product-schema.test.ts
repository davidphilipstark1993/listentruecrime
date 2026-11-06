import { describe, it, expect } from 'vitest'
import { productJsonLd, shippingDetailsJsonLd, returnPolicyJsonLd } from './product-schema'
import { DELIVERY_ESTIMATE, DELIVERY_TIMES, RETURN_WINDOW_DAYS, RETURNS_SUMMARY } from './copy'
import type { PublicProduct } from './types'

const product = (overrides: Partial<PublicProduct> = {}): PublicProduct => ({
  id: '1', slug: 'x-t-shirt', title: 'X T-Shirt', category: 't-shirts' as PublicProduct['category'],
  shortDescription: 'Short.', description: 'Long.', images: [{ url: 'https://img/x.jpg', alt: 'x' }],
  specs: [], sizeGuide: null, isFeatured: false, isBestSeller: false, isNew: true, isPlaceholder: false,
  collection: null, design: null, seoTitle: null, seoDescription: null,
  variants: [{ pricePence: 2499, purchasable: true } as PublicProduct['variants'][number]],
  fromPricePence: 2499, purchasable: true, colours: [], sizes: [], ...overrides,
})

describe('shop product schema', () => {
  it('adds UK shipping details and a return policy pointing at the policy pages', () => {
    const offer = (productJsonLd(product()) as { offers: Record<string, any> }).offers
    expect(offer.shippingDetails.shippingDestination.addressCountry).toBe('GB')
    expect(offer.shippingDetails.url).toMatch(/\/shop\/shipping-policy$/)
    expect(offer.hasMerchantReturnPolicy.merchantReturnLink).toMatch(/\/shop\/returns-and-refunds$/)
    expect(offer.hasMerchantReturnPolicy.merchantReturnDays).toBe(RETURN_WINDOW_DAYS)
  })
  it('does not claim a fixed shipping price', () => {
    expect(shippingDetailsJsonLd()).not.toHaveProperty('shippingRate')
  })
  it('emits no offer (and so no shipping/returns) when there is no price', () => {
    expect(productJsonLd(product({ variants: [], fromPricePence: null }))).not.toHaveProperty('offers')
  })
  it('round-trips through JSON', () => {
    const j = productJsonLd(product())
    expect(JSON.parse(JSON.stringify(j))).toEqual(j)
  })
})

describe('structured data agrees with the policy wording', () => {
  it('delivery times match DELIVERY_ESTIMATE', () => {
    expect(DELIVERY_ESTIMATE).toContain(`${DELIVERY_TIMES.productionMaxDays} days`)
    expect(DELIVERY_ESTIMATE).toContain(`${DELIVERY_TIMES.transitMinDays}–${DELIVERY_TIMES.transitMaxDays} working days`)
  })
  it('return window matches RETURNS_SUMMARY', () => {
    expect(RETURNS_SUMMARY[0]).toContain(`${RETURN_WINDOW_DAYS} days`)
    expect(returnPolicyJsonLd().merchantReturnDays).toBe(RETURN_WINDOW_DAYS)
  })
})
