import { describe, expect, it, vi } from 'vitest'

// Runs the REAL Stripe calls (coupon + Checkout Session + expire) against Stripe's official
// stripe-mock server, which validates every request against Stripe's published OpenAPI spec.
// Skipped unless the mock is running:
//   go install github.com/stripe/stripe-mock@latest && ~/go/bin/stripe-mock -http-port 12111 &
//   STRIPE_MOCK_PORT=12111 npx vitest run lib/shop/stripe-mock.test.ts
const PORT = process.env.STRIPE_MOCK_PORT

vi.mock('stripe', async () => {
  const Actual = (await vi.importActual<any>('stripe')).default
  return {
    default: class extends Actual {
      constructor(key: string, cfg: any) {
        super(key, { ...cfg, host: 'localhost', port: Number(process.env.STRIPE_MOCK_PORT), protocol: 'http', maxNetworkRetries: 0 })
      }
    },
  }
})

import { createCheckoutSession, expireCheckoutSession } from './stripe'

const order = (over: Record<string, any> = {}): any => ({
  id: 'order_1', order_number: 'LTC-10001', shipping_pence: 400, subtotal_pence: 5000, total_pence: 5400,
  discount_pence: 0, discount_code: null, discount_percent: null, ...over,
})
const items: any[] = [{ variant_id: 'v1', product_title: 'Tee', colour: 'Black', size: 'M', quantity: 2, unit_price_pence: 2500 }]

describe.skipIf(!PORT)('Stripe API contract (stripe-mock)', () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'

  it('creates a normal Checkout Session', async () => {
    const s = await createCheckoutSession(order(), items, new Map())
    expect(s.id).toMatch(/^cs_/)
  })

  it('creates a Checkout Session with the one-off discount coupon attached', async () => {
    const s = await createCheckoutSession(order({ discount_pence: 1000, discount_code: 'REF-ABCD2345', discount_percent: 20, total_pence: 4400 }), items, new Map())
    expect(s.id).toMatch(/^cs_/)
  })

  it('expires a session (used when a customer retries with a single-use code)', async () => {
    await expect(expireCheckoutSession('cs_test_123')).resolves.toBeUndefined()
  })
})
