import { describe, expect, it } from 'vitest'
import { summariseCampaignRevenue, type ReportOrder } from './report'

const o = (x: Partial<ReportOrder>): ReportOrder => ({ payment_status: 'paid', discount_campaign_prefix: null, discount_pence: 0, subtotal_pence: 5000, total_pence: 5500, refunded_pence: 0, ...x })

describe('summariseCampaignRevenue', () => {
  it('groups paid orders by campaign, with the no-code baseline last', () => {
    const rows = summariseCampaignRevenue([
      o({}),
      o({ discount_campaign_prefix: 'REF-', discount_pence: 1000, total_pence: 4500 }),
      o({ discount_campaign_prefix: 'REF-', discount_pence: 1500, total_pence: 4000 }),
      o({ discount_campaign_prefix: 'BF26-', discount_pence: 2000, total_pence: 9000 }),
    ])
    expect(rows.map(r => r.prefix)).toEqual(['BF26-', 'REF-', null])
    expect(rows[1]).toMatchObject({ orders: 2, revenuePence: 8500, discountPence: 2500, averageOrderPence: 4250 })
    expect(rows[2]).toMatchObject({ orders: 1, revenuePence: 5500 })
  })

  it('ignores unpaid, expired and failed checkouts', () => {
    expect(summariseCampaignRevenue([
      o({ payment_status: 'pending', discount_campaign_prefix: 'REF-' }),
      o({ payment_status: 'expired', discount_campaign_prefix: 'REF-' }),
      o({ payment_status: 'failed', discount_campaign_prefix: 'REF-' }),
    ])).toEqual([])
  })

  it('nets off refunds', () => {
    const [row] = summariseCampaignRevenue([
      o({ payment_status: 'partially_refunded', discount_campaign_prefix: 'LOYAL-', total_pence: 4000, refunded_pence: 1000 }),
      o({ payment_status: 'refunded', discount_campaign_prefix: 'LOYAL-', total_pence: 4000, refunded_pence: 4000 }),
    ])
    expect(row).toMatchObject({ orders: 2, revenuePence: 3000 })
  })
})

import { codeStatus } from './report'
describe('codeStatus', () => {
  const campaign: any = { is_active: true, starts_at: null, expires_at: null }
  const code = (o = {}): any => ({ is_active: true, starts_at: null, expires_at: '2027-01-01T00:00:00Z', max_uses: 1, use_count: 0, discount_percent: 20, ...o })
  const now = new Date('2026-11-02T00:00:00Z')
  it('labels each state', () => {
    expect(codeStatus(code(), campaign, now)).toBe('live')
    expect(codeStatus(code({ use_count: 1 }), campaign, now)).toBe('used')
    expect(codeStatus(code({ expires_at: '2026-10-01T00:00:00Z' }), campaign, now)).toBe('expired')
    expect(codeStatus(code({ is_active: false }), campaign, now)).toBe('switched off')
    expect(codeStatus(code(), { ...campaign, is_active: false }, now)).toBe('switched off')
    expect(codeStatus(code({ discount_percent: 40 }), campaign, now)).toBe('over max')
  })
})
