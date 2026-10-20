import { sanitizeEnv } from '@/lib/utils'

// ─── Feature flags ───────────────────────────────────────────────────────────
// Three independent switches, all off by default, so merging this code never
// exposes the shop, takes a payment, or spends supplier money:
//
//   NEXT_PUBLIC_SHOP_ENABLED          shop pages + nav links are visible
//   SHOP_CHECKOUT_ENABLED             /api/shop/checkout will create Stripe sessions
//   SHOP_PRINTIFY_SEND_TO_PRODUCTION  paid orders are sent to production (otherwise
//                                     the Printify order is created but left unsent)
//
// Set NEXT_PUBLIC_SHOP_ENABLED=true on Vercel *Preview* only to review the shop
// before launch.

const isTrue = (v: string | undefined) => (v ? sanitizeEnv(v).toLowerCase() === 'true' : false)

export const shopEnabled = () => isTrue(process.env.NEXT_PUBLIC_SHOP_ENABLED)
export const checkoutEnabled = () => isTrue(process.env.SHOP_CHECKOUT_ENABLED)

/**
 * Whether a paid order may be sent to production. Hard-stops when Stripe is in
 * test mode: a test payment must never cause a real production order, however
 * the flag is set. (Printify's own store-level "automatic approval" setting is
 * outside our control — see SHOP_SYSTEM.md before connecting a real store.)
 */
export function sendToProductionEnabled(): boolean {
  if (!isTrue(process.env.SHOP_PRINTIFY_SEND_TO_PRODUCTION)) return false
  const key = process.env.STRIPE_SECRET_KEY ? sanitizeEnv(process.env.STRIPE_SECRET_KEY) : ''
  return key.startsWith('sk_live_') || key.startsWith('rk_live_')
}

export const supportEmail = () =>
  sanitizeEnv(process.env.SHOP_SUPPORT_EMAIL ?? process.env.SENDGRID_FROM_EMAIL ?? 'info@listentruecrime.com')

// ─── Catalogue constants ─────────────────────────────────────────────────────
export const CURRENCY = 'gbp' as const

export const SHOP_CATEGORIES = [
  { slug: 't-shirts', label: 'T-Shirts', blurb: 'Soft, black and quietly obsessive.' },
  { slug: 'hoodies', label: 'Hoodies', blurb: 'For long episodes and longer theories.' },
  { slug: 'mugs', label: 'Mugs', blurb: 'Every investigation needs a brew.' },
  { slug: 'accessories', label: 'Accessories', blurb: 'The finishing touches.' },
] as const

export type ShopCategory = (typeof SHOP_CATEGORIES)[number]['slug']

export const categoryLabel = (slug: string) => SHOP_CATEGORIES.find(c => c.slug === slug)?.label ?? slug

// Countries we currently ship to. Adding a country here (plus a Printify shipping
// check) is all that is needed to open international delivery — everything
// downstream (Stripe address collection, shipping quote, Printify order) takes
// the country from this list.
export const SHIPPING_COUNTRIES = ['GB'] as const
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number]

export const MAX_LINE_QUANTITY = 10
export const MAX_BASKET_LINES = 20

// Stripe Checkout Sessions expire after this many minutes if unpaid.
export const CHECKOUT_EXPIRY_MINUTES = 60

// Fulfilment retry policy
export const MAX_FULFILMENT_ATTEMPTS = 5
export const RETRY_BACKOFF_MINUTES = [2, 10, 30, 120, 360]
// A "submitting" claim older than this means a worker died mid-request; we
// cannot know whether Printify received it, so a human checks (no blind retry).
export const SUBMITTING_STALE_MINUTES = 10
