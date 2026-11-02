import { createAdminClient } from '@/lib/supabase/admin'
import { DiscountsManager } from '@/components/admin/discounts-manager'
import { maxDiscountPercent } from '@/lib/discounts/config'
import { codeStatus, summariseCampaignRevenue, type ReportOrder } from '@/lib/discounts/report'
import type { CampaignRow, CodeRow } from '@/lib/discounts/types'

export const dynamic = 'force-dynamic'

export default async function DiscountsPage() {
  const admin = createAdminClient()
  const [{ data: campaigns }, { data: codes }, { data: orders }] = await Promise.all([
    admin.from('discount_campaigns').select('*').order('created_at', { ascending: true }),
    admin.from('discount_codes').select('*').order('created_at', { ascending: false }).limit(500),
    admin.from('shop_orders')
      .select('payment_status, discount_campaign_prefix, discount_pence, subtotal_pence, total_pence, refunded_pence')
      .in('payment_status', ['paid', 'partially_refunded', 'refunded'])
      .limit(10000),
  ])

  const campaignRows = (campaigns ?? []) as CampaignRow[]
  const codeRows = (codes ?? []) as CodeRow[]
  const now = new Date()
  const byCampaign = new Map(campaignRows.map(c => [c.id, c]))

  return (
    <div className="p-8">
      <h1 className="heading-display mb-1 text-2xl">Discounts</h1>
      <p className="mb-6 max-w-3xl text-sm text-stone-subtle">
        Campaigns group discount codes by prefix: <code>REF-</code> referral rewards, <code>BF26-</code> Black Friday 2026, <code>LOYAL-</code> loyalty, <code>WELCOME-</code> new subscribers.
        Customers can use one code per order, and no code may exceed the system-wide maximum of <strong className="text-stone">{maxDiscountPercent()}%</strong> (<code>MAX_DISCOUNT_PERCENT</code> in <code>lib/discounts/config.ts</code>, or the <code>DISCOUNT_MAX_PERCENT</code> environment variable).
      </p>
      <DiscountsManager
        maxPercent={maxDiscountPercent()}
        campaigns={campaignRows}
        codes={codeRows.map(c => ({
          ...c,
          status: byCampaign.get(c.campaign_id) ? codeStatus(c, byCampaign.get(c.campaign_id) as CampaignRow, now) : 'switched off',
        }))}
        revenue={summariseCampaignRevenue((orders ?? []) as ReportOrder[])}
      />
    </div>
  )
}
