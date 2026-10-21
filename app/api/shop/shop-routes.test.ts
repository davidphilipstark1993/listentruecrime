import { beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { createFakeDb } from '@/lib/shop/test-utils/fake-supabase'

const db = vi.hoisted(() => ({ current: null as any }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => db.current.client }))

const printify = vi.hoisted(() => ({
  printifyConfigured: vi.fn(() => true),
  calculateShipping: vi.fn(async () => ({ standard: 399 })),
  PrintifyError: class extends Error {},
}))
vi.mock('@/lib/shop/printify', () => printify)

const handlers = vi.hoisted(() => ({
  handleCheckoutPaid: vi.fn(async () => {}), handleAsyncPaymentFailed: vi.fn(), handleCheckoutExpired: vi.fn(),
  handleChargeRefunded: vi.fn(), handleDispute: vi.fn(), logEvent: vi.fn(async () => {}),
  createPendingOrder: vi.fn(), attachCheckoutSession: vi.fn(),
  findOrderByPrintifyId: vi.fn(), syncFromPrintify: vi.fn(),
}))
vi.mock('@/lib/shop/orders', () => handlers)

const stripeMock = vi.hoisted(() => ({ createCheckoutSession: vi.fn(async () => ({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' })) }))
vi.mock('@/lib/shop/stripe', async () => {
  const actual = await vi.importActual<any>('@/lib/shop/stripe')
  return { ...actual, createCheckoutSession: stripeMock.createCheckoutSession }
})

import { POST as stripeWebhook } from './webhooks/stripe/route'
import { POST as printifyWebhook } from './webhooks/printify/route'
import { POST as quote } from './quote/route'
import { POST as checkout } from './checkout/route'
import { POST as cron } from './cron/retry/route'
import { createHmac } from 'crypto'

const SECRET = 'whsec_test_secret'
const stripe = new Stripe('sk_test_x')

function stripeReq(payload: object, opts: { sign?: boolean; secret?: string } = {}) {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.sign !== false) headers['stripe-signature'] = stripe.webhooks.generateTestHeaderString({ payload: body, secret: opts.secret ?? SECRET })
  return new Request('http://localhost/api/shop/webhooks/stripe', { method: 'POST', body, headers })
}
const event = (id: string, type = 'checkout.session.completed') => ({ id, object: 'event', type, data: { object: { id: 'cs_test_1', object: 'checkout.session' } } })

const VARIANT = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  db.current = createFakeDb()
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = SECRET
  process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'
  process.env.SHOP_CHECKOUT_ENABLED = 'true'
  db.current.tables.shop_settings = [{ key: 'printify_cost_currency', value: 'GBP' }]
  db.current.tables.shop_products = [{ id: 'p1', slug: 'tee', title: 'Tee', category: 't-shirts', images: [], printify_product_id: 'pf_1', is_published: true }]
  db.current.tables.shop_variants = [{ id: VARIANT, product_id: 'p1', printify_variant_id: 555, colour: 'Black', size: 'M', price_pence: 2500, cost_minor: 1000, is_enabled: true }]
})

describe('Stripe webhook', () => {
  it('rejects a request with no signature', async () => {
    const res = await stripeWebhook(stripeReq(event('evt_1'), { sign: false }))
    expect(res.status).toBe(400)
    expect(handlers.handleCheckoutPaid).not.toHaveBeenCalled()
  })

  it('rejects a request signed with the wrong secret', async () => {
    const res = await stripeWebhook(stripeReq(event('evt_1'), { secret: 'whsec_attacker' }))
    expect(res.status).toBe(400)
    expect(handlers.handleCheckoutPaid).not.toHaveBeenCalled()
  })

  it('processes a correctly signed event once, however many times Stripe sends it', async () => {
    const payload = event('evt_dup')
    expect((await stripeWebhook(stripeReq(payload))).status).toBe(200)
    const again = await stripeWebhook(stripeReq(payload))
    expect(await again.json()).toMatchObject({ duplicate: true })
    await stripeWebhook(stripeReq(payload))
    expect(handlers.handleCheckoutPaid).toHaveBeenCalledTimes(1)
  })

  it('returns 500 on a handler failure so Stripe redelivers, and then processes the redelivery', async () => {
    handlers.handleCheckoutPaid.mockRejectedValueOnce(new Error('db down'))
    const payload = event('evt_retry')
    expect((await stripeWebhook(stripeReq(payload))).status).toBe(500)
    expect((await stripeWebhook(stripeReq(payload))).status).toBe(200)
    expect(handlers.handleCheckoutPaid).toHaveBeenCalledTimes(2)
  })

  it('acknowledges unrelated event types without acting', async () => {
    expect((await stripeWebhook(stripeReq(event('evt_x', 'customer.created')))).status).toBe(200)
    expect(handlers.handleCheckoutPaid).not.toHaveBeenCalled()
  })
})

describe('Printify webhook', () => {
  const body = JSON.stringify({ id: 'pfy_evt_1', type: 'order:shipment:created', resource: { id: 'pf_order_1', type: 'order' } })
  const sig = (b: string, s = 'printify-secret-123456') => 'sha256=' + createHmac('sha256', s).update(b).digest('hex')
  const req = (b: string, signature: string | null) =>
    new Request('http://localhost/api/shop/webhooks/printify', { method: 'POST', body: b, headers: signature ? { 'x-pfy-signature': signature } : {} })

  beforeEach(() => { process.env.PRINTIFY_WEBHOOK_SECRET = 'printify-secret-123456' })

  it('rejects missing and wrong signatures', async () => {
    expect((await printifyWebhook(req(body, null))).status).toBe(401)
    expect((await printifyWebhook(req(body, sig(body, 'other-secret-xxxxxxxx')))).status).toBe(401)
    expect(handlers.syncFromPrintify).not.toHaveBeenCalled()
  })

  it('syncs the matching order once and ignores a replay', async () => {
    handlers.findOrderByPrintifyId.mockResolvedValue({ id: 'order_1' })
    expect((await printifyWebhook(req(body, sig(body)))).status).toBe(200)
    const again = await printifyWebhook(req(body, sig(body)))
    expect(await again.json()).toMatchObject({ duplicate: true })
    expect(handlers.syncFromPrintify).toHaveBeenCalledTimes(1)
    expect(handlers.syncFromPrintify).toHaveBeenCalledWith('order_1')
  })
})

describe('quote and checkout never trust the browser', () => {
  const post = (url: string, body: unknown) => new Request(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

  it('prices from the database even when the client sends its own price and shipping', async () => {
    const res = await quote(post('/api/shop/quote', { items: [{ variantId: VARIANT, quantity: 2, unitPricePence: 1, pricePence: 1, shippingPence: 0 }], totalPence: 1 }))
    const data = await res.json()
    expect(data.lines[0]).toMatchObject({ unitPricePence: 2500, linePence: 5000 })
    expect(data).toMatchObject({ subtotalPence: 5000, shippingPence: 399, totalPence: 5399 })
  })

  it('reports shipping as unavailable rather than guessing when Printify cannot price it', async () => {
    printify.calculateShipping.mockRejectedValueOnce(new Error('boom'))
    const data = await (await quote(post('/api/shop/quote', { items: [{ variantId: VARIANT, quantity: 1 }] }))).json()
    expect(data.shippingPence).toBeNull()
    expect(data.shippingError).toBeTruthy()
  })

  it('reports a USD Printify account as unpriceable until an exchange rate is set', async () => {
    db.current.tables.shop_settings = [{ key: 'printify_cost_currency', value: 'USD' }]
    const data = await (await quote(post('/api/shop/quote', { items: [{ variantId: VARIANT, quantity: 1 }] }))).json()
    expect(data.shippingPence).toBeNull()
    db.current.tables.shop_settings.push({ key: 'printify_to_gbp_rate', value: '0.8' })
    const priced = await (await quote(post('/api/shop/quote', { items: [{ variantId: VARIANT, quantity: 1 }] }))).json()
    expect(priced.shippingPence).toBe(Math.ceil(399 * 0.8))
  })

  it('rejects malformed baskets', async () => {
    expect((await quote(post('/api/shop/quote', { items: [{ variantId: 'not-a-uuid', quantity: 1 }] }))).status).toBe(400)
    expect((await quote(post('/api/shop/quote', { items: [{ variantId: VARIANT, quantity: 999 }] }))).status).toBe(400)
    expect((await quote(post('/api/shop/quote', { items: [] }))).status).toBe(400)
  })

  it('checkout creates the order from server-side figures', async () => {
    handlers.createPendingOrder.mockResolvedValue({ order: { id: 'o1', order_number: 'LTC-1' }, items: [] })
    const res = await checkout(post('/api/shop/checkout', { items: [{ variantId: VARIANT, quantity: 1, pricePence: 1 }], totalPence: 1 }))
    expect(res.status).toBe(200)
    const quoteArg = handlers.createPendingOrder.mock.calls[0][0]
    expect(quoteArg).toMatchObject({ subtotalPence: 2500, shippingPence: 399, totalPence: 2899 })
    expect((await res.json()).url).toContain('checkout.stripe.com')
  })

  it('checkout refuses an unavailable variant and a closed shop', async () => {
    db.current.tables.shop_variants[0].printify_variant_id = null
    expect((await checkout(post('/api/shop/checkout', { items: [{ variantId: VARIANT, quantity: 1 }] }))).status).toBe(409)
    expect(handlers.createPendingOrder).not.toHaveBeenCalled()
    process.env.SHOP_CHECKOUT_ENABLED = 'false'
    expect((await checkout(post('/api/shop/checkout', { items: [{ variantId: VARIANT, quantity: 1 }] }))).status).toBe(503)
  })

  it('returns 404 for everything when the shop is switched off', async () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'false'
    expect((await quote(post('/api/shop/quote', { items: [{ variantId: VARIANT, quantity: 1 }] }))).status).toBe(404)
    expect((await checkout(post('/api/shop/checkout', { items: [{ variantId: VARIANT, quantity: 1 }] }))).status).toBe(404)
  })
})

describe('retry cron endpoint', () => {
  it('requires the shared secret', async () => {
    process.env.SHOP_CRON_SECRET = 'a'.repeat(32)
    const call = (auth?: string) => cron(new Request('http://localhost/api/shop/cron/retry', { method: 'POST', headers: auth ? { authorization: auth } : {} }))
    expect((await call()).status).toBe(401)
    expect((await call('Bearer wrong')).status).toBe(401)
    delete process.env.SHOP_CRON_SECRET
    expect((await call('Bearer ')).status).toBe(401)
  })
})
