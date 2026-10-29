import { beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.hoisted(() => vi.fn(async (_params: any, _opts: any) => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' })))
vi.mock('stripe', () => ({
  default: class FakeStripe {
    checkout = { sessions: { create } }
    constructor(public key: string, public opts: unknown) {}
  },
}))

import { createCheckoutSession, stripeKeyMode } from './stripe'

const order: any = { id: 'order_1', order_number: 'LTC-10001', shipping_pence: 780 }
const items: any[] = [
  { variant_id: 'v1', product_title: 'Tee', colour: 'Black', size: 'M', quantity: 2, unit_price_pence: 2000 },
  { variant_id: 'v2', product_title: 'Mug', colour: 'Black', size: 'One size', quantity: 1, unit_price_pence: 1399 },
]

describe('createCheckoutSession', () => {
  beforeEach(() => { create.mockClear(); process.env.STRIPE_SECRET_KEY = 'sk_test_x' })

  it('collects a UK delivery address and opts out of Managed Payments (which rejects shipping_address_collection)', async () => {
    const session = await createCheckoutSession(order, items, new Map())
    expect(session.url).toContain('checkout.stripe.com')
    const [params, opts] = create.mock.calls[0]
    expect(params.managed_payments).toEqual({ enabled: false })
    expect(params.shipping_address_collection).toEqual({ allowed_countries: ['GB'] })
    expect(params.phone_number_collection).toEqual({ enabled: true })
    expect(params.mode).toBe('payment')
    expect(opts).toEqual({ idempotencyKey: 'shop-checkout-order_1' })
  })

  it('charges the server-computed amounts in GBP, including delivery', async () => {
    await createCheckoutSession(order, items, new Map())
    const [params] = create.mock.calls[0]
    expect(params.line_items.map((l: any) => [l.quantity, l.price_data.currency, l.price_data.unit_amount])).toEqual([[2, 'gbp', 2000], [1, 'gbp', 1399]])
    expect(params.shipping_options[0].shipping_rate_data.fixed_amount).toEqual({ amount: 780, currency: 'gbp' })
    expect(params.client_reference_id).toBe('order_1')
    expect(params.metadata).toMatchObject({ order_id: 'order_1', order_number: 'LTC-10001' })
  })
})

describe('stripeKeyMode', () => {
  it('reads the mode from the key prefix and never exposes the key', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc'; expect(stripeKeyMode()).toBe('test')
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc'; expect(stripeKeyMode()).toBe('live')
    process.env.STRIPE_SECRET_KEY = 'rk_live_abc'; expect(stripeKeyMode()).toBe('live')
    delete process.env.STRIPE_SECRET_KEY; expect(stripeKeyMode()).toBeNull()
  })
})
