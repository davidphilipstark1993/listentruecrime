import { MAX_BASKET_LINES, MAX_LINE_QUANTITY } from './config'
import { printifyToPence, type ShopSettings } from './settings'
import type { PublicProduct, PublicVariant, ShopProductRow, ShopVariantRow } from './types'

// Pure functions: no I/O, so every price rule can be unit-tested.

export function isVariantPurchasable(product: Pick<ShopProductRow, 'is_published' | 'printify_product_id'>, v: ShopVariantRow): boolean {
  return Boolean(
    product.is_published &&
    product.printify_product_id &&
    v.is_enabled &&
    v.printify_variant_id != null &&
    v.price_pence != null && v.price_pence > 0
  )
}

export function toPublicProduct(p: ShopProductRow, variants: ShopVariantRow[]): PublicProduct {
  const sorted = [...variants].sort((a, b) => a.sort_order - b.sort_order)
  const pub: PublicVariant[] = sorted
    .filter(v => v.is_enabled)
    .map(v => ({
      id: v.id,
      colour: v.colour,
      colourHex: v.colour_hex,
      size: v.size,
      pricePence: v.price_pence,
      purchasable: isVariantPurchasable(p, v),
    }))
  const prices = pub.filter(v => v.purchasable && v.pricePence != null).map(v => v.pricePence as number)
  const colours: PublicProduct['colours'] = []
  for (const v of pub) if (!colours.some(c => c.name === v.colour)) colours.push({ name: v.colour, hex: v.colourHex })
  const sizes: string[] = []
  for (const v of pub) if (!sizes.includes(v.size)) sizes.push(v.size)

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    shortDescription: p.short_description,
    description: p.description,
    images: Array.isArray(p.images) ? p.images : [],
    specs: p.specs ?? [],
    sizeGuide: p.size_guide,
    isFeatured: p.is_featured,
    isBestSeller: p.is_best_seller,
    isNew: p.is_new,
    isPlaceholder: p.is_placeholder,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    variants: pub,
    fromPricePence: prices.length ? Math.min(...prices) : null,
    purchasable: prices.length > 0,
    colours,
    sizes,
  }
}

// ─── Cart validation ─────────────────────────────────────────────────────────
export interface CartInput { variantId: string; quantity: number }

export interface ValidatedLine {
  variantId: string
  productId: string
  productSlug: string
  productTitle: string
  imageUrl: string | null
  colour: string
  size: string
  quantity: number
  unitPricePence: number
  linePence: number
  printifyProductId: string
  printifyVariantId: number
  estCostMinor: number | null
}

export interface CartProblem { variantId: string; reason: string }

export interface ValidatedCart {
  lines: ValidatedLine[]
  problems: CartProblem[]
  subtotalPence: number
}

/**
 * Re-derives every line from the database rows. The browser only ever supplies
 * (variantId, quantity); title, price, and supplier ids all come from `catalogue`.
 */
export function validateCart(
  input: CartInput[],
  catalogue: Map<string, { product: ShopProductRow; variant: ShopVariantRow }>,
): ValidatedCart {
  const lines: ValidatedLine[] = []
  const problems: CartProblem[] = []

  // Merge duplicate variant lines so quantity limits can't be dodged by repeating a line.
  const merged = new Map<string, number>()
  for (const item of input.slice(0, MAX_BASKET_LINES * 2)) {
    merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + Math.trunc(item.quantity))
  }

  for (const [variantId, quantity] of Array.from(merged.entries())) {
    const entry = catalogue.get(variantId)
    if (!entry) { problems.push({ variantId, reason: 'This item is no longer available.' }); continue }
    const { product, variant } = entry
    if (!isVariantPurchasable(product, variant)) {
      problems.push({ variantId, reason: `${product.title} (${variant.colour}, ${variant.size}) is not available to buy right now.` })
      continue
    }
    if (!Number.isInteger(quantity) || quantity < 1) { problems.push({ variantId, reason: 'Invalid quantity.' }); continue }
    if (quantity > MAX_LINE_QUANTITY) {
      problems.push({ variantId, reason: `You can order up to ${MAX_LINE_QUANTITY} of each item at once.` })
      continue
    }
    const unit = variant.price_pence as number
    const images = Array.isArray(product.images) ? product.images : []
    lines.push({
      variantId,
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      imageUrl: images.find(i => !i.placeholder)?.url ?? null,
      colour: variant.colour,
      size: variant.size,
      quantity,
      unitPricePence: unit,
      linePence: unit * quantity,
      printifyProductId: product.printify_product_id as string,
      printifyVariantId: variant.printify_variant_id as number,
      estCostMinor: variant.cost_minor,
    })
  }

  if (lines.length > MAX_BASKET_LINES) {
    lines.length = MAX_BASKET_LINES
    problems.push({ variantId: '', reason: `A basket can hold up to ${MAX_BASKET_LINES} different items.` })
  }

  return { lines, problems, subtotalPence: lines.reduce((s, l) => s + l.linePence, 0) }
}

// ─── Shipping ────────────────────────────────────────────────────────────────
/**
 * Delivery charge = what Printify quotes for this basket, converted to pence.
 * Returns null when it cannot be computed honestly (no exchange rate set for a
 * non-GBP Printify account) — the caller must refuse checkout instead of guessing.
 */
export function shippingChargePence(printifyShippingMinor: number, settings: Pick<ShopSettings, 'printifyCostCurrency' | 'printifyToGbpRate'>): number | null {
  if (settings.printifyCostCurrency === 'GBP') return Math.max(0, printifyShippingMinor)
  if (settings.printifyToGbpRate == null || settings.printifyToGbpRate <= 0) return null
  // Round UP to the next whole penny; never undercharge supplier shipping.
  return Math.max(0, Math.ceil(printifyShippingMinor * settings.printifyToGbpRate - 1e-9))
}

// ─── Profit ──────────────────────────────────────────────────────────────────
export interface ProfitInput {
  totalPence: number
  refundedPence: number
  subtotalPence: number
  items: { quantity: number; estCostMinor: number | null }[]
  estShippingMinor: number | null
  printifyCostMinor: number | null
  printifyShippingMinor: number | null
  printifyTaxMinor: number | null
  stripeFeePence: number | null
}

export interface ProfitResult {
  revenuePence: number
  productCostPence: number | null
  shippingCostPence: number | null
  taxCostPence: number
  vatPence: number
  stripeFeePence: number
  profitPence: number | null
  /** true only when Printify's real charges AND Stripe's real fee are both known */
  confirmed: boolean
}

export function calculateProfit(o: ProfitInput, s: ShopSettings): ProfitResult {
  const revenue = Math.max(0, o.totalPence - o.refundedPence)
  const confirmedCosts = o.printifyCostMinor != null && o.printifyShippingMinor != null
  const confirmed = confirmedCosts && o.stripeFeePence != null

  const productMinor = confirmedCosts
    ? o.printifyCostMinor
    : o.items.some(i => i.estCostMinor == null) ? null : o.items.reduce((sum, i) => sum + i.quantity * (i.estCostMinor as number), 0)
  const shippingMinor = confirmedCosts ? o.printifyShippingMinor : o.estShippingMinor

  const productCost = productMinor == null ? null : printifyToPence(productMinor, s)
  const shippingCost = shippingMinor == null ? null : printifyToPence(shippingMinor, s)
  const taxCost = o.printifyTaxMinor != null ? (printifyToPence(o.printifyTaxMinor, s) ?? 0) : 0

  // Stripe's fee is not refunded on a refund, so keep the full fee.
  const stripeFee = o.stripeFeePence ?? Math.round((o.totalPence * s.stripeFeePercent) / 100 + s.stripeFeeFixedPence)
  // Prices are VAT-inclusive; VAT due is the VAT-inclusive share of revenue.
  const vat = s.vatPercent > 0 ? Math.round(revenue - revenue / (1 + s.vatPercent / 100)) : 0

  const profit = productCost == null || shippingCost == null
    ? null
    : revenue - productCost - shippingCost - taxCost - stripeFee - vat

  return {
    revenuePence: revenue,
    productCostPence: productCost,
    shippingCostPence: shippingCost,
    taxCostPence: taxCost,
    vatPence: vat,
    stripeFeePence: stripeFee,
    profitPence: profit,
    confirmed,
  }
}
