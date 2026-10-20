import { describe, expect, it } from 'vitest'
import { calculateProfit, shippingChargePence, toPublicProduct, validateCart } from './pricing'
import { mapPrintifyStatus } from './orders'
import { parseSettings, printifyToPence } from './settings'
import { verifyPrintifySignature } from './signature'
import { createHmac } from 'crypto'
import type { ShopProductRow, ShopVariantRow } from './types'

const product = (over: Partial<ShopProductRow> = {}): ShopProductRow => ({
  id: 'p1', slug: 'tee', title: 'Tee', category: 't-shirts', short_description: null, description: null,
  images: [], specs: [], size_guide: null, printify_product_id: 'pf_1', is_published: true, is_featured: false,
  is_best_seller: false, is_new: false, is_placeholder: false, sort_order: 0, seo_title: null, seo_description: null,
  admin_notes: null, created_at: '', updated_at: '', ...over,
})
const variant = (over: Partial<ShopVariantRow> = {}): ShopVariantRow => ({
  id: 'v1', product_id: 'p1', printify_variant_id: 111, sku: null, colour: 'Black', colour_hex: null, size: 'M',
  price_pence: 2500, cost_minor: 1200, is_enabled: true, sort_order: 0, ...over,
})
const cat = (...rows: [ShopProductRow, ShopVariantRow][]) => new Map(rows.map(([product, variant]) => [variant.id, { product, variant }]))

describe('validateCart', () => {
  it('prices every line from the catalogue, ignoring anything else', () => {
    const r = validateCart([{ variantId: 'v1', quantity: 2 }], cat([product(), variant()]))
    expect(r.problems).toEqual([])
    expect(r.lines[0]).toMatchObject({ unitPricePence: 2500, linePence: 5000, printifyVariantId: 111, printifyProductId: 'pf_1' })
    expect(r.subtotalPence).toBe(5000)
  })

  it.each([
    ['placeholder variant with no Printify id', variant({ printify_variant_id: null })],
    ['variant with no price', variant({ price_pence: null })],
    ['disabled variant', variant({ is_enabled: false })],
  ])('rejects %s', (_n, v) => {
    const r = validateCart([{ variantId: 'v1', quantity: 1 }], cat([product(), v]))
    expect(r.lines).toHaveLength(0)
    expect(r.problems).toHaveLength(1)
  })

  it('rejects unpublished products and products with no Printify product id', () => {
    expect(validateCart([{ variantId: 'v1', quantity: 1 }], cat([product({ is_published: false }), variant()])).lines).toHaveLength(0)
    expect(validateCart([{ variantId: 'v1', quantity: 1 }], cat([product({ printify_product_id: null }), variant()])).lines).toHaveLength(0)
  })

  it('rejects unknown variants', () => {
    expect(validateCart([{ variantId: 'nope', quantity: 1 }], cat()).problems).toHaveLength(1)
  })

  it('merges repeated lines so the per-item quantity cap cannot be dodged', () => {
    const r = validateCart([{ variantId: 'v1', quantity: 6 }, { variantId: 'v1', quantity: 6 }], cat([product(), variant()]))
    expect(r.lines).toHaveLength(0)
    expect(r.problems[0].reason).toMatch(/up to 10/)
  })

  it('rejects zero, negative and fractional quantities', () => {
    for (const q of [0, -1]) expect(validateCart([{ variantId: 'v1', quantity: q }], cat([product(), variant()])).lines).toHaveLength(0)
  })
})

describe('toPublicProduct', () => {
  it('exposes no costs or Printify ids and marks placeholders unpurchasable', () => {
    const pub = toPublicProduct(product({ printify_product_id: null, is_placeholder: true }), [variant({ printify_variant_id: null, price_pence: null })])
    expect(pub.purchasable).toBe(false)
    expect(pub.fromPricePence).toBeNull()
    expect(JSON.stringify(pub)).not.toMatch(/printify|cost/i)
  })
  it('computes the from-price over purchasable variants only', () => {
    const pub = toPublicProduct(product(), [variant({ id: 'a', price_pence: 3000 }), variant({ id: 'b', size: 'L', price_pence: 2500 }), variant({ id: 'c', size: 'S', price_pence: 1000, printify_variant_id: null })])
    expect(pub.fromPricePence).toBe(2500)
    expect(pub.sizes).toEqual(['M', 'L', 'S'])
  })
})

describe('shipping', () => {
  it('passes GBP through and rounds a converted rate up', () => {
    expect(shippingChargePence(399, { printifyCostCurrency: 'GBP', printifyToGbpRate: null })).toBe(399)
    expect(shippingChargePence(399, { printifyCostCurrency: 'USD', printifyToGbpRate: 0.79 })).toBe(Math.ceil(399 * 0.79))
  })
  it('refuses to guess when a non-GBP account has no exchange rate', () => {
    expect(shippingChargePence(399, { printifyCostCurrency: 'USD', printifyToGbpRate: null })).toBeNull()
    expect(printifyToPence(100, { printifyCostCurrency: 'USD', printifyToGbpRate: 0 })).toBeNull()
  })
})

describe('calculateProfit', () => {
  const settings = parseSettings([
    { key: 'printify_cost_currency', value: 'GBP' }, { key: 'stripe_fee_percent', value: '1.5' },
    { key: 'stripe_fee_fixed_pence', value: '20' }, { key: 'vat_percent', value: '0' },
  ])
  const base = {
    totalPence: 3000, refundedPence: 0, subtotalPence: 2500, items: [{ quantity: 1, estCostMinor: 1200 }],
    estShippingMinor: 400, printifyCostMinor: null, printifyShippingMinor: null, printifyTaxMinor: null, stripeFeePence: null,
  }
  it('is an estimate until Printify and Stripe have reported real figures', () => {
    const r = calculateProfit(base, settings)
    expect(r.confirmed).toBe(false)
    // 3000 − 1200 − 400 − (3000×1.5% + 20 = 65)
    expect(r.profitPence).toBe(1335)
  })
  it('is confirmed once actual costs and the actual Stripe fee are known', () => {
    const r = calculateProfit({ ...base, printifyCostMinor: 1250, printifyShippingMinor: 420, printifyTaxMinor: 0, stripeFeePence: 71 }, settings)
    expect(r.confirmed).toBe(true)
    expect(r.profitPence).toBe(3000 - 1250 - 420 - 71)
  })
  it('has no profit figure when a cost is unknown rather than assuming zero', () => {
    expect(calculateProfit({ ...base, items: [{ quantity: 1, estCostMinor: null }] }, settings).profitPence).toBeNull()
  })
  it('removes VAT and refunds, but keeps the Stripe fee', () => {
    const s = parseSettings([{ key: 'printify_cost_currency', value: 'GBP' }, { key: 'vat_percent', value: '20' }])
    const r = calculateProfit({ ...base, printifyCostMinor: 1000, printifyShippingMinor: 0, stripeFeePence: 50, refundedPence: 600 }, s)
    expect(r.revenuePence).toBe(2400)
    expect(r.vatPence).toBe(400)
    expect(r.profitPence).toBe(2400 - 1000 - 0 - 0 - 50 - 400)
  })
})

describe('mapPrintifyStatus', () => {
  it('maps lifecycle and problem statuses', () => {
    expect(mapPrintifyStatus('in-production')).toBe('in_production')
    expect(mapPrintifyStatus('fulfilled')).toBe('shipped')
    expect(mapPrintifyStatus('canceled')).toBe('cancelled')
    expect(mapPrintifyStatus('has-issues')).toBe('needs_review')
    expect(mapPrintifyStatus('payment-not-received')).toBe('needs_review')
    expect(mapPrintifyStatus('something-new')).toBeNull()
  })
})

describe('verifyPrintifySignature', () => {
  const body = '{"type":"order:shipment:created"}'
  const sig = 'sha256=' + createHmac('sha256', 's3cret').update(body).digest('hex')
  it('accepts a correct signature', () => expect(verifyPrintifySignature(body, sig, 's3cret')).toBe(true))
  it('rejects tampered bodies, wrong secrets and missing headers', () => {
    expect(verifyPrintifySignature(body + ' ', sig, 's3cret')).toBe(false)
    expect(verifyPrintifySignature(body, sig, 'other')).toBe(false)
    expect(verifyPrintifySignature(body, null, 's3cret')).toBe(false)
    expect(verifyPrintifySignature(body, 'sha256=short', 's3cret')).toBe(false)
  })
})
