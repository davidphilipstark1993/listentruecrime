import { calculateProfit } from './pricing'
import type { ShopSettings } from './settings'
import type { ShopOrderItemRow, ShopOrderRow } from './types'

export interface ShopSummary {
  totalOrders: number
  revenuePence: number
  productsSold: number
  pending: number
  fulfilled: number
  failed: number
  /** Profit across orders where both costs and the Stripe fee are known. */
  confirmedProfitPence: number
  confirmedOrders: number
  /** Best guess across the remaining paid orders; null parts are excluded and counted. */
  estimatedProfitPence: number
  estimatedOrders: number
  /** Paid orders with no usable cost data (excluded from both profit figures). */
  unknownProfitOrders: number
}

const PENDING = new Set(['queued', 'submitting', 'created', 'in_production'])
const FULFILLED = new Set(['shipped', 'delivered'])
const FAILED = new Set(['failed', 'needs_review'])

export function summarise(orders: ShopOrderRow[], items: ShopOrderItemRow[], settings: ShopSettings): ShopSummary {
  const itemsByOrder = new Map<string, ShopOrderItemRow[]>()
  for (const i of items) itemsByOrder.set(i.order_id, [...(itemsByOrder.get(i.order_id) ?? []), i])

  const s: ShopSummary = {
    totalOrders: 0, revenuePence: 0, productsSold: 0, pending: 0, fulfilled: 0, failed: 0,
    confirmedProfitPence: 0, confirmedOrders: 0, estimatedProfitPence: 0, estimatedOrders: 0, unknownProfitOrders: 0,
  }
  for (const o of orders) {
    if (!['paid', 'partially_refunded', 'refunded'].includes(o.payment_status)) continue
    s.totalOrders++
    s.revenuePence += o.total_pence - o.refunded_pence
    const its = itemsByOrder.get(o.id) ?? []
    s.productsSold += its.reduce((n, i) => n + i.quantity, 0)
    if (PENDING.has(o.fulfilment_status)) s.pending++
    if (FULFILLED.has(o.fulfilment_status)) s.fulfilled++
    if (FAILED.has(o.fulfilment_status)) s.failed++

    const p = calculateProfit({
      totalPence: o.total_pence, refundedPence: o.refunded_pence, subtotalPence: o.subtotal_pence,
      items: its.map(i => ({ quantity: i.quantity, estCostMinor: i.est_cost_minor })),
      estShippingMinor: o.est_printify_shipping_minor,
      printifyCostMinor: o.printify_cost_minor, printifyShippingMinor: o.printify_shipping_minor, printifyTaxMinor: o.printify_tax_minor,
      stripeFeePence: o.stripe_fee_pence,
    }, settings)
    if (p.profitPence == null) s.unknownProfitOrders++
    else if (p.confirmed) { s.confirmedProfitPence += p.profitPence; s.confirmedOrders++ }
    else { s.estimatedProfitPence += p.profitPence; s.estimatedOrders++ }
  }
  return s
}
