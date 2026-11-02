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

  // The discount was validated and priced by our own code (lib/discounts). Stripe is only told
  // the final amount, as a one-off fixed-amount coupon, so its page and receipt show the
  // saving and amount_total matches the order total the webhook checks against.
  // `allow_promotion_codes` stays false below, so Stripe-side codes can never be stacked on top.
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
  if (order.discount_pence > 0 && order.discount_code) {
    const coupon = await stripe.coupons.create(
      {
        amount_off: order.discount_pence,
        currency: CURRENCY,
        duration: 'once',
        max_redemptions: 1,
        name: `${order.discount_code} (${order.discount_percent ?? ''}% off)`.slice(0, 40),
        metadata: { order_id: order.id, discount_code: order.discount_code },
      },
      { idempotencyKey: `shop-coupon-${order.id}` },
    )
    discounts = [{ coupon: coupon.id }]
  }

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
      ...(discounts ? { discounts } : {}),
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRY_MINUTES * 60,
      success_url: `${BASE}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE}/shop/basket?cancelled=1`,
  }
  return stripe.checkout.sessions.create(params, { idempotencyKey: `shop-checkout-${order.id}` })
}

/** Expires an unpaid Checkout Session so it can never be paid. Throws if it already completed. */
export async function expireCheckoutSession(sessionId: string): Promise<void> {
  await getStripe().checkout.sessions.expire(sessionId)
}
