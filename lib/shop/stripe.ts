import Stripe from 'stripe'
import { BASE } from '@/lib/seo/config'
import { sanitizeEnv } from '@/lib/utils'
import { CHECKOUT_EXPIRY_MINUTES, CURRENCY, SHIPPING_COUNTRIES } from './config'
import type { ShopOrderItemRow, ShopOrderRow } from './types'

let client: Stripe | null = null

/** Server-only. The secret key comes from STRIPE_SECRET_KEY and never leaves the server. */
export function getStripe(): Stripe {
  if (client) return client
  const key = process.env.STRIPE_SECRET_KEY ? sanitizeEnv(process.env.STRIPE_SECRET_KEY) : ''
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  client = new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 })
  return client
}

/** Which mode the configured secret key is in, or null when no key is set. */
export function stripeKeyMode(): 'live' | 'test' | null {
  const key = process.env.STRIPE_SECRET_KEY ? sanitizeEnv(process.env.STRIPE_SECRET_KEY) : ''
  if (!key) return null
  return /^(sk|rk)_live_/.test(key) ? 'live' : 'test'
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function webhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET ? sanitizeEnv(process.env.STRIPE_WEBHOOK_SECRET) : ''
  if (!s) throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  return s
}

/**
 * Creates a hosted Stripe Checkout Session from an order whose totals were
 * computed server-side. Amounts come from the order/items rows — never from the
 * request body. Card details are entered on Stripe's page; we never see them.
 * Apple Pay / Google Pay appear automatically when enabled in the Stripe
 * dashboard and the domain is registered (see the launch checklist).
 */
export async function createCheckoutSession(order: ShopOrderRow, items: ShopOrderItemRow[], imageByVariant: Map<string, string | null>) {
  const stripe = getStripe()
  const params: Stripe.Checkout.SessionCreateParams & { managed_payments?: { enabled: boolean } } = {
      mode: 'payment',
      // Stripe accounts can have Managed Payments on by default, which rejects
      // shipping_address_collection. We sell physical goods, so opt out per session.
      managed_payments: { enabled: false },
      locale: 'en-GB',
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_number: order.order_number },
      payment_intent_data: {
        description: `Listen True Crime order ${order.order_number}`,
        metadata: { order_id: order.id, order_number: order.order_number },
      },
      line_items: items.map(i => ({
        quantity: i.quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: i.unit_price_pence,
          product_data: {
            name: i.product_title,
            description: `${i.colour} / ${i.size}`,
            ...(i.variant_id && imageByVariant.get(i.variant_id) ? { images: [imageByVariant.get(i.variant_id) as string] } : {}),
          },
        },
      })),
      shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
      phone_number_collection: { enabled: true },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: 'Delivery',
            fixed_amount: { amount: order.shipping_pence, currency: CURRENCY },
          },
        },
      ],
      allow_promotion_codes: false,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRY_MINUTES * 60,
      success_url: `${BASE}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE}/shop/basket?cancelled=1`,
  }
  return stripe.checkout.sessions.create(params, { idempotencyKey: `shop-checkout-${order.id}` })
}
