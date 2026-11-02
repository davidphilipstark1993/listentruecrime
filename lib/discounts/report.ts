// Revenue per campaign, from the code snapshot every order stores. Pure so it can be tested.

export interface ReportOrder {
  payment_status: string
  discount_campaign_prefix: string | null
  discount_pence: number
  subtotal_pence: number
  total_pence: number
  refunded_pence: number
}

export interface CampaignRevenueRow {
  /** "REF-", "BF26-" … or null for orders placed without a code (the baseline). */
  prefix: string | null
  orders: number
  /** Money actually kept: order totals (incl. delivery) minus refunds. */
  revenuePence: number
  /** Total discount given away on these orders. */
  discountPence: number
  /** Revenue ÷ orders. */
  averageOrderPence: number
}

const COUNTED = new Set(['paid', 'partially_refunded', 'refunded'])

/** Only paid orders count; unpaid, expired and failed checkouts never show up as revenue. */
export function summariseCampaignRevenue(orders: ReportOrder[]): CampaignRevenueRow[] {
  const byPrefix = new Map<string | null, CampaignRevenueRow>()
  for (const o of orders) {
    if (!COUNTED.has(o.payment_status)) continue
    const key = o.discount_campaign_prefix ?? null
    const row = byPrefix.get(key) ?? { prefix: key, orders: 0, revenuePence: 0, discountPence: 0, averageOrderPence: 0 }
    row.orders += 1
    row.revenuePence += Math.max(0, o.total_pence - o.refunded_pence)
    row.discountPence += o.discount_pence
    byPrefix.set(key, row)
  }
  const rows = Array.from(byPrefix.values())
  for (const r of rows) r.averageOrderPence = r.orders ? Math.round(r.revenuePence / r.orders) : 0
  // Campaigns first (biggest revenue first), the no-code baseline last.
  return rows.sort((a, b) => (a.prefix === null ? 1 : b.prefix === null ? -1 : b.revenuePence - a.revenuePence))
}

// ─── Code status for the admin list ──────────────────────────────────────────
import { evaluateCode } from './validate'
import type { CampaignRow, CodeRow } from './types'

export type CodeStatus = 'live' | 'used' | 'expired' | 'switched off' | 'not started' | 'over max'

export function codeStatus(code: CodeRow, campaign: CampaignRow, now = new Date()): CodeStatus {
  const v = evaluateCode(code, campaign, now)
  if (v.ok) return 'live'
  switch (v.reason) {
    case 'used': return 'used'
    case 'expired': return 'expired'
    case 'not_started': return 'not started'
    case 'over_max': return 'over max'
    default: return 'switched off'
  }
}
