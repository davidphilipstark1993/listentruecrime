import { createAdminClient } from '@/lib/supabase/admin'
import { calculateShipping, printifyConfigured, PrintifyError } from './printify'
import { SHIPPING_COUNTRIES } from './config'
import { shippingChargePence, validateCart, type CartInput, type ValidatedCart } from './pricing'
import { getShopSettings } from './settings'
import type { ShopProductRow, ShopVariantRow } from './types'

export interface Quote extends ValidatedCart {
  shippingPence: number | null
  /** Printify's quoted shipping in its own minor units (kept for profit tracking). */
  shippingMinor: number | null
  shippingError: string | null
  totalPence: number | null
  country: string
}

/** Loads the DB rows for the submitted variant ids — the only source of truth for prices. */
export async function loadCatalogueFor(variantIds: string[]) {
  const admin = createAdminClient()
  const map = new Map<string, { product: ShopProductRow; variant: ShopVariantRow }>()
  if (!variantIds.length) return map
  const { data: variants } = await admin.from('shop_variants').select('*').in('id', variantIds)
  const productIds = Array.from(new Set((variants ?? []).map(v => v.product_id)))
  const { data: products } = await admin.from('shop_products').select('*').in('id', productIds)
  const pById = new Map((products ?? []).map(p => [p.id, p as ShopProductRow]))
  for (const v of (variants ?? []) as ShopVariantRow[]) {
    const product = pById.get(v.product_id)
    if (product) map.set(v.id, { product, variant: v })
  }
  return map
}

// Short in-memory cache so a customer fiddling with quantities doesn't hit
// Printify on every keystroke. Keyed by the exact line items + country.
const shippingCache = new Map<string, { at: number; costs: number }>()
const SHIPPING_CACHE_MS = 2 * 60 * 1000

async function printifyShippingMinor(lines: ValidatedCart['lines'], country: string): Promise<number> {
  const items = lines.map(l => ({ product_id: l.printifyProductId, variant_id: l.printifyVariantId, quantity: l.quantity }))
  const key = JSON.stringify([items, country])
  const hit = shippingCache.get(key)
  if (hit && Date.now() - hit.at < SHIPPING_CACHE_MS) return hit.costs
  const costs = await calculateShipping(items, country)
  if (typeof costs.standard !== 'number') throw new Error('Printify returned no standard shipping rate for this basket')
  shippingCache.set(key, { at: Date.now(), costs: costs.standard })
  if (shippingCache.size > 200) shippingCache.clear()
  return costs.standard
}

/**
 * Full server-side quote: validate lines against the DB, then ask Printify what
 * delivery really costs. If delivery can't be priced we say so — we never fall
 * back to a guessed flat rate, because the brief is that shipping reflects the
 * supplier's real charge.
 */
export async function buildQuote(input: CartInput[], country = SHIPPING_COUNTRIES[0] as string): Promise<Quote> {
  const catalogue = await loadCatalogueFor(Array.from(new Set(input.map(i => i.variantId))))
  const cart = validateCart(input, catalogue)
  const base: Quote = { ...cart, shippingPence: null, shippingMinor: null, shippingError: null, totalPence: null, country }
  if (!cart.lines.length) return base

  if (!(SHIPPING_COUNTRIES as readonly string[]).includes(country)) {
    return { ...base, shippingError: 'We do not deliver to that country yet.' }
  }
  if (!printifyConfigured()) {
    return { ...base, shippingError: 'Delivery pricing is not available yet.' }
  }

  try {
    const [minor, settings] = await Promise.all([printifyShippingMinor(cart.lines, country), getShopSettings()])
    const pence = shippingChargePence(minor, settings)
    if (pence == null) return { ...base, shippingError: 'Delivery pricing is not available yet.' }
    return { ...base, shippingMinor: minor, shippingPence: pence, totalPence: cart.subtotalPence + pence }
  } catch (err) {
    console.error('Shop shipping quote failed:', err instanceof PrintifyError ? err.message : err)
    return { ...base, shippingError: 'We could not work out delivery for this basket just now. Please try again in a moment.' }
  }
}
