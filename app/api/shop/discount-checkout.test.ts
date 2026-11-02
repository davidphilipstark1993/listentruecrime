import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeDb } from '@/lib/shop/test-utils/fake-supabase'

// Checkout validation for discount codes, run through the real quote route, checkout route
// and order module. Only the outside world (Stripe, Printify, email) is mocked.

const db = vi.hoisted(() => ({ current: null as any }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => db.current.client }))

vi.mock('@/lib/shop/printify', () => ({
  printifyConfigured: () => true,
  calculateShipping: async () => ({ standard: 400 }),
  createOrder: vi.fn(async () => ({ id: 'pf_1' })),
  PrintifyError: class extends Error {},
}))
vi.mock('@/lib/email/adminNotify', () => ({ notifyAdmin: vi.fn(async () => {}) }))

const stripe = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(async (..._args: any[]) => ({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' })),
  expireCheckoutSession: vi.fn(async (..._args: any[]) => {}),
  getStripe: () => ({ paymentIntents: { retrieve: async () => ({ latest_charge: null }) } }),
  stripeConfigured: () => true,
}))
vi.mock('@/lib/shop/stripe', () => stripe)
vi.mock('@/lib/shop/email', async () => ({ ...(await vi.importActual<any>('@/lib/shop/email')), sendShopEmail: vi.fn(async () => {}) }))

import { POST as quote } from './quote/route'
import { POST as checkout } from './checkout/route'
import { handleCheckoutExpired, handleCheckoutPaid } from '@/lib/shop/orders'

const VARIANT = '11111111-1111-4111-8111-111111111111'
const items = [{ variantId: VARIANT, quantity: 2 }] // 2 × £25.00 = £50.00 merch, £4.00 delivery
const post = (url: string, body: unknown) => new Request(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
const future = (days: number) => new Date(Date.now() + days * 86400_000).toISOString()

const addCode = (over: Record<string, any> = {}) => {
  const row = { id: `k${db.current.tables.discount_codes.length + 1}`, campaign_id: 'c_ref', code: 'REF-GOOD2345', discount_percent: 20, expires_at: future(30), max_uses: 1, use_count: 0, is_active: true, starts_at: null, ...over }
  db.current.tables.discount_codes.push(row)
  return row
}
const codes = (): any[] => db.current.tables.discount_codes
const orders = (): any[] => db.current.tables.shop_orders ?? []

beforeEach(() => {
  db.current = createFakeDb()
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'
  process.env.SHOP_CHECKOUT_ENABLED = 'true'
  delete process.env.DISCOUNT_MAX_PERCENT
  db.current.tables.shop_settings = [{ key: 'printify_cost_currency', value: 'GBP' }]
  db.current.tables.shop_products = [{ id: 'p1', slug: 'tee', title: 'Tee', category: 't-shirts', images: [], printify_product_id: 'pf_1', is_published: true }]
  db.current.tables.shop_variants = [{ id: VARIANT, product_id: 'p1', printify_variant_id: 555, colour: 'Black', size: 'M', price_pence: 2500, cost_minor: 1000, is_enabled: true }]
  db.current.tables.discount_campaigns = [
    { id: 'c_ref', prefix: 'REF-', type: 'unique', is_active: true, starts_at: null, expires_at: null },
    { id: 'c_bf', prefix: 'BF26-', type: 'public', is_active: true, starts_at: null, expires_at: future(20) },
  ]
  db.current.tables.discount_codes = []
})

describe('quote with a discount code', () => {
  it('takes the percentage off the products only, never off delivery', async () => {
    addCode()
    const data = await (await quote(post('/api/shop/quote', { items, code: 'ref-good2345' }))).json()
    expect(data).toMatchObject({
      subtotalPence: 5000, discount: { code: 'REF-GOOD2345', percent: 20, pence: 1000 }, discountError: null,
      shippingPence: 400, totalPence: 4400, // 5000 - 1000 + 400
    })
  })

  it('applies a public campaign code and a 30% code', async () => {
    addCode({ code: 'BF26-BLACKFRIDAY', campaign_id: 'c_bf', discount_percent: 30, max_uses: null })
    const data = await (await quote(post('/api/shop/quote', { items, code: 'BF26-BLACKFRIDAY' }))).json()
    expect(data.discount).toMatchObject({ percent: 30, pence: 1500 })
    expect(data.totalPence).toBe(3900)
  })

  it('without a code nothing changes', async () => {
    const data = await (await quote(post('/api/shop/quote', { items }))).json()
    expect(data).toMatchObject({ discount: null, discountError: null, totalPence: 5400 })
  })

  it.each([
    ['unknown', { code: 'REF-NOPE2345' }, "don't recognise"],
    ['expired', { expires_at: new Date(Date.now() - 1000).toISOString() }, 'expired'],
    ['already used', { use_count: 1 }, 'already been used'],
    ['over the maximum', { discount_percent: 50 }, "can't be applied"],
    ['switched off', { is_active: false }, 'no longer active'],
  ])('shows a clear error for a code that is %s, and gives no discount', async (_label, over, text) => {
    const { code: typed, ...codeOver } = over as Record<string, any>
    addCode(codeOver)
    const data = await (await quote(post('/api/shop/quote', { items, code: typed ?? 'REF-GOOD2345' }))).json()
    expect(data.discountError).toContain(text)
    expect(data.discount).toBeNull()
    expect(data.totalPence).toBe(5400)
  })

  it('refuses two codes at once: no stacking', async () => {
    addCode(); addCode({ code: 'BF26-BLACKFRIDAY', campaign_id: 'c_bf', max_uses: null })
    const data = await (await quote(post('/api/shop/quote', { items, code: 'REF-GOOD2345 BF26-BLACKFRIDAY' }))).json()
    expect(data.discountError).toMatch(/Only one discount code/)
    expect(data.discount).toBeNull()
    // and the API has no way to send a list of codes at all
    expect((await quote(post('/api/shop/quote', { items, code: ['REF-GOOD2345', 'BF26-BLACKFRIDAY'] }))).status).toBe(400)
    expect((await quote(post('/api/shop/quote', { items, codes: ['REF-GOOD2345', 'BF26-BLACKFRIDAY'] }))).status).toBe(200) // unknown field ignored → no discount
  })

  it('lowering the maximum immediately disables bigger codes', async () => {
    addCode({ discount_percent: 30 })
    process.env.DISCOUNT_MAX_PERCENT = '25'
    expect((await (await quote(post('/api/shop/quote', { items, code: 'REF-GOOD2345' }))).json()).discountError).toContain("can't be applied")
  })
})

describe('checkout with a discount code', () => {
  it('records the code on the order, reserves it, and charges the discounted total', async () => {
    const code = addCode()
    const res = await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))
    expect(res.status).toBe(200)

    expect(orders()).toHaveLength(1)
    expect(orders()[0]).toMatchObject({
      discount_code: 'REF-GOOD2345', discount_code_id: code.id, discount_campaign_id: 'c_ref', discount_campaign_prefix: 'REF-',
      discount_percent: 20, discount_pence: 1000, subtotal_pence: 5000, shipping_pence: 400, total_pence: 4400,
    })
    expect(codes()[0].use_count).toBe(1)
    // Stripe is given the discounted order
    expect(stripe.createCheckoutSession.mock.calls[0][0]).toMatchObject({ discount_pence: 1000, discount_code: 'REF-GOOD2345', total_pence: 4400 })
  })

  it('an order without a code records no discount', async () => {
    await checkout(post('/api/shop/checkout', { items }))
    expect(orders()[0]).toMatchObject({ discount_code: null, discount_campaign_prefix: null, discount_pence: 0, total_pence: 5400 })
  })

  it('refuses an invalid code with a clear message and creates no order (never silently full price)', async () => {
    addCode({ use_count: 1 })
    const res = await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ codeError: true, error: expect.stringContaining('already been used') })
    expect(orders()).toHaveLength(0)
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses an expired code', async () => {
    addCode({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    const res = await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('expired')
  })

  it('a single-use code works for one order only', async () => {
    addCode()
    stripe.expireCheckoutSession.mockRejectedValue(new Error('Session already complete')) // the first customer is mid-payment
    expect((await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))).status).toBe(200)
    const second = await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))
    expect(second.status).toBe(409)
    expect((await second.json()).error).toContain('already been used')
    expect(orders()).toHaveLength(1)
    expect(codes()[0].use_count).toBe(1)
  })

  it('lets the same customer retry after abandoning Stripe: the old session is expired and the code moves over', async () => {
    addCode()
    stripe.expireCheckoutSession.mockResolvedValue(undefined)
    expect((await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))).status).toBe(200)
    // attachCheckoutSession stored cs_1 on the first order; make the second session distinct
    stripe.createCheckoutSession.mockResolvedValueOnce({ id: 'cs_2', url: 'https://checkout.stripe.com/c/pay/cs_2' })
    expect((await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))).status).toBe(200)

    expect(stripe.expireCheckoutSession).toHaveBeenCalledWith('cs_1')
    expect(orders().map(o => o.payment_status).sort()).toEqual(['expired', 'pending'])
    expect(codes()[0].use_count).toBe(1) // held by exactly one live checkout
  })

  it('two checkouts racing for one single-use code: exactly one gets it', async () => {
    addCode()
    stripe.expireCheckoutSession.mockRejectedValue(new Error('in use'))
    const results = await Promise.all([1, 2, 3].map(() => checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))))
    expect(results.filter(r => r.status === 200)).toHaveLength(1)
    expect(codes()[0].use_count).toBe(1)
    expect(orders()).toHaveLength(1)
  })

  it('a public campaign code can be used by any number of orders', async () => {
    addCode({ code: 'BF26-BLACKFRIDAY', campaign_id: 'c_bf', discount_percent: 30, max_uses: null })
    for (let i = 0; i < 3; i++) expect((await checkout(post('/api/shop/checkout', { items, code: 'BF26-BLACKFRIDAY' }))).status).toBe(200)
    expect(orders().filter(o => o.discount_campaign_prefix === 'BF26-')).toHaveLength(3)
  })

  it('gives the code back if Stripe fails to start the session', async () => {
    addCode()
    stripe.createCheckoutSession.mockRejectedValueOnce(new Error('stripe down'))
    expect((await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))).status).toBe(502)
    expect(codes()[0].use_count).toBe(0)
    // and the customer can try again straight away
    expect((await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))).status).toBe(200)
  })
})

describe('after checkout', () => {
  it('an unpaid session that expires gives the single-use code back, exactly once', async () => {
    addCode()
    await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))
    expect(codes()[0].use_count).toBe(1)
    await handleCheckoutExpired({ id: 'cs_1' } as any)
    await handleCheckoutExpired({ id: 'cs_1' } as any) // Stripe retries webhooks
    expect(codes()[0].use_count).toBe(0)
  })

  it('a paid session keeps the code used, and the paid amount matches the discounted total', async () => {
    addCode()
    await checkout(post('/api/shop/checkout', { items, code: 'REF-GOOD2345' }))
    await handleCheckoutPaid({
      id: 'cs_1', payment_status: 'paid', amount_total: 4400, currency: 'gbp', payment_intent: 'pi_1',
      metadata: { order_id: orders()[0].id },
      customer_details: { email: 'fan@example.com', name: 'Ada Lovelace', phone: null },
      collected_information: { shipping_details: { name: 'Ada Lovelace', address: { line1: '1 Baker St', city: 'London', postal_code: 'NW1 6XE', country: 'GB' } } },
    } as any)
    expect(orders()[0]).toMatchObject({ payment_status: 'paid', discount_code: 'REF-GOOD2345', fulfilment_status: expect.not.stringMatching(/needs_review/) })
    expect(codes()[0].use_count).toBe(1)
    await handleCheckoutExpired({ id: 'cs_1' } as any) // a late expiry event must not free a paid order's code
    expect(codes()[0].use_count).toBe(1)
  })
})
