import Link from 'next/link'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getShopSettings } from '@/lib/shop/settings'
import { needsAttention, summarise } from '@/lib/shop/admin-stats'
import { checkoutEnabled, sendToProductionEnabled, shopEnabled } from '@/lib/shop/config'
import { stripeKeyMode } from '@/lib/shop/stripe'
import { formatGBP } from '@/lib/shop/money'
import { Stat, StatusBadge } from '@/components/admin/shop-ui'
import type { ShopOrderItemRow, ShopOrderRow } from '@/lib/shop/types'

export const dynamic = 'force-dynamic'

function has(name: string) { return Boolean(process.env[name]) }

function Check({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" /> : <XCircle size={15} className="mt-0.5 shrink-0 text-red-400" />}
      <span className="text-stone-muted">{label}{!ok && hint && <span className="block text-xs text-stone-subtle">{hint}</span>}</span>
    </li>
  )
}

export default async function ShopOverviewPage() {
  const admin = createAdminClient()
  const [settings, { data: orders }, { data: items }, { data: events }, { data: lastHook }] = await Promise.all([
    getShopSettings(),
    admin.from('shop_orders').select('*'),
    admin.from('shop_order_items').select('*'),
    admin.from('shop_events').select('*').in('level', ['warn', 'error']).order('created_at', { ascending: false }).limit(12),
    admin.from('shop_webhook_events').select('livemode, received_at').eq('provider', 'stripe').not('livemode', 'is', null).order('received_at', { ascending: false }).limit(1),
  ])
  const s = summarise((orders ?? []) as ShopOrderRow[], (items ?? []) as ShopOrderItemRow[], settings)
  // Same rule as the "Failed / needs attention" counter, so the two can never disagree.
  const problems = ((orders ?? []) as ShopOrderRow[])
    .filter(needsAttention)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10)
  const keyMode = stripeKeyMode()
  const hookLive = lastHook?.[0]?.livemode as boolean | undefined
  const modeMismatch = hookLive !== undefined && keyMode !== null && hookLive !== (keyMode === 'live')
  const stripeMode = keyMode ? keyMode.toUpperCase() : 'not set'
  const rateOk = settings.printifyCostCurrency === 'GBP' || settings.printifyToGbpRate != null

  return (
    <div className="p-8">
      <h1 className="heading-display mb-1 text-2xl">Shop overview</h1>
      <p className="mb-8 text-sm text-stone-subtle">Paid orders only. Unpaid checkouts are never counted.</p>

      <div className="mb-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total orders" value={s.totalOrders} />
        <Stat label="Revenue (after refunds)" value={formatGBP(s.revenuePence)} />
        <Stat label="Products sold" value={s.productsSold} />
        <Stat label="Failed / needs attention" value={s.failed} tone={s.failed ? 'bad' : undefined} />
        <Stat label="Pending (in progress)" value={s.pending} />
        <Stat label="Fulfilled (shipped or delivered)" value={s.fulfilled} />
        <Stat label="Confirmed profit" value={formatGBP(s.confirmedProfitPence)} sub={`${s.confirmedOrders} order${s.confirmedOrders === 1 ? '' : 's'} with Printify's real charges and Stripe's real fee`} tone="good" />
        <Stat label="Estimated profit" value={formatGBP(s.estimatedProfitPence)} sub={`${s.estimatedOrders} order${s.estimatedOrders === 1 ? '' : 's'} still on estimates${s.unknownProfitOrders ? ` · ${s.unknownProfitOrders} excluded (cost unknown)` : ''}`} />
      </div>
      <p className="mb-10 text-xs text-stone-subtle">
        Profit = revenue − Printify production − Printify shipping − Printify tax − Stripe fee − VAT. “Estimated” uses your recorded variant costs and the settings fee rate; it becomes “confirmed” when Printify and Stripe report the real figures. Orders missing a cost are excluded rather than counted as free.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-serif text-lg text-stone">Launch readiness</h2>
          <ul className="space-y-2.5">
            <Check ok={shopEnabled()} label={`Shop visible (NEXT_PUBLIC_SHOP_ENABLED) — ${shopEnabled() ? 'on' : 'off'}`} />
            <Check ok={checkoutEnabled()} label={`Checkout open (SHOP_CHECKOUT_ENABLED) — ${checkoutEnabled() ? 'on' : 'off'}`} />
            <Check ok={stripeMode !== 'not set'} label={`Stripe key — mode: ${stripeMode}`} hint="Set STRIPE_SECRET_KEY" />
            <Check ok={!modeMismatch} label={hookLive === undefined ? 'Stripe webhook mode — no events received yet' : `Stripe webhook mode — last event was ${hookLive ? 'LIVE' : 'TEST'}, key is ${stripeMode}`} hint="The Stripe key and the webhook signing secret must both be test or both be live. Check STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Vercel (and which environments they apply to)." />
            <Check ok={has('STRIPE_WEBHOOK_SECRET')} label="Stripe webhook secret" hint="Set STRIPE_WEBHOOK_SECRET from the webhook endpoint in Stripe" />
            <Check ok={has('PRINTIFY_API_TOKEN') && has('PRINTIFY_SHOP_ID')} label="Printify token + shop id" hint="Set PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID" />
            <Check ok={has('PRINTIFY_WEBHOOK_SECRET')} label="Printify webhook secret" hint="Set PRINTIFY_WEBHOOK_SECRET, then register the webhooks (see SHOP_SYSTEM.md)" />
            <Check ok={rateOk} label={`Printify currency → GBP (${settings.printifyCostCurrency}${settings.printifyToGbpRate ? ` @ ${settings.printifyToGbpRate}` : ''})`} hint="Set the exchange rate in Settings — delivery quotes are refused until then" />
            <Check ok={has('SENDGRID_API_KEY') || has('RESEND_API_KEY')} label="Transactional email provider" hint="SENDGRID_API_KEY or RESEND_API_KEY" />
            <Check ok={has('SHOP_CRON_SECRET')} label="Retry job secret (SHOP_CRON_SECRET)" hint="Needed for automatic retries of failed fulfilment" />
            <Check ok={sendToProductionEnabled()} label={`Auto send-to-production — ${sendToProductionEnabled() ? 'ON (live key + flag)' : 'off (orders are created in Printify but held)'}`} />
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-serif text-lg text-stone">Needs attention</h2>
          {problems.length === 0 ? <p className="text-sm text-stone-subtle">No paid orders are stuck.</p> : (
            <ul className="space-y-2">
              {problems.map(o => (
                <li key={o.id} className="flex items-start justify-between gap-3 text-sm">
                  <Link href={`/admin/shop/orders/${o.id}`} className="text-stone hover:text-crimson">{o.order_number}</Link>
                  <span className="min-w-0 flex-1 truncate text-xs text-stone-subtle">{o.last_error}</span>
                  <StatusBadge value={o.fulfilment_status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-lg text-stone"><AlertTriangle size={16} className="text-amber-400" /> Recent warnings and errors</h2>
        {(events ?? []).length === 0 ? <p className="text-sm text-stone-subtle">Nothing logged.</p> : (
          <ul className="divide-y divide-white/[0.05] text-xs">
            {(events ?? []).map((e: any) => (
              <li key={e.id} className="flex gap-3 py-2">
                <span className="w-32 shrink-0 text-stone-subtle">{new Date(e.created_at).toLocaleString('en-GB')}</span>
                <span className={e.level === 'error' ? 'w-28 shrink-0 text-red-400' : 'w-28 shrink-0 text-amber-400'}>{e.type}</span>
                <span className="min-w-0 flex-1 text-stone-muted">{e.message}</span>
                {e.order_id && <Link href={`/admin/shop/orders/${e.order_id}`} className="text-stone-subtle hover:text-stone">order</Link>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
