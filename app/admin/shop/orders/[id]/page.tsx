import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrderWithItems } from '@/lib/shop/orders'
import { getShopSettings, printifyToPence } from '@/lib/shop/settings'
import { calculateProfit } from '@/lib/shop/pricing'
import { sendToProductionEnabled } from '@/lib/shop/config'
import { formatGBP } from '@/lib/shop/money'
import { StatusBadge } from '@/components/admin/shop-ui'
import { ShopOrderActions } from '@/components/admin/shop-order-actions'

export const dynamic = 'force-dynamic'

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm"><dt className="text-stone-subtle">{k}</dt><dd className="text-right text-stone-muted">{v}</dd></div>
)

export default async function OrderPage({ params }: { params: { id: string } }) {
  const { order, items, shipments } = await getOrderWithItems(params.id)
  if (!order) notFound()
  const settings = await getShopSettings()
  const { data: events } = await createAdminClient().from('shop_events').select('*').eq('order_id', order.id).order('created_at', { ascending: false }).limit(100)
  const profit = calculateProfit({
    totalPence: order.total_pence, refundedPence: order.refunded_pence, subtotalPence: order.subtotal_pence,
    items: items.map(i => ({ quantity: i.quantity, estCostMinor: i.est_cost_minor })),
    estShippingMinor: order.est_printify_shipping_minor,
    printifyCostMinor: order.printify_cost_minor, printifyShippingMinor: order.printify_shipping_minor, printifyTaxMinor: order.printify_tax_minor,
    stripeFeePence: order.stripe_fee_pence,
  }, settings)
  const stripeLive = (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live')
  const a = order.shipping_address
  const money = (minor: number | null) => minor == null ? '—' : (printifyToPence(minor, settings) == null ? `${minor} (no rate set)` : formatGBP(printifyToPence(minor, settings) as number))

  return (
    <div className="p-8">
      <Link href="/admin/shop/orders" className="text-xs text-stone-subtle hover:text-stone">← Orders</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="heading-display text-2xl">{order.order_number}</h1>
        <StatusBadge value={order.payment_status} /><StatusBadge value={order.fulfilment_status} />
      </div>

      {order.fulfilment_status === 'printify_canceled' && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <strong>Printify has cancelled this order.</strong> The customer has paid, but it will never be produced and nothing will be retried or recreated automatically. Decide whether to <strong>refund</strong> the customer (below) or remake the order by hand in Printify and email them.
        </div>
      )}
      {order.last_error && <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"><strong>Last error:</strong> {order.last_error}{order.next_retry_at && <span className="block text-xs text-red-300/70">Next automatic retry: {new Date(order.next_retry_at).toLocaleString('en-GB')} (attempt {order.fulfilment_attempts})</span>}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg text-stone">Items</h2>
          <ul className="divide-y divide-white/[0.05]">
            {items.map(i => (
              <li key={i.id} className="flex justify-between gap-3 py-2 text-sm">
                <span className="text-stone-muted">{i.product_title}<br /><span className="text-xs text-stone-subtle">{i.colour} / {i.size} × {i.quantity} · Printify variant {i.printify_variant_id}</span></span>
                <span className="tabular-nums">{formatGBP(i.unit_price_pence * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 border-t border-white/[0.06] pt-2">
            <Row k="Subtotal" v={formatGBP(order.subtotal_pence)} />
            <Row k="Delivery charged" v={formatGBP(order.shipping_pence)} />
            <Row k="Total" v={<strong className="text-stone">{formatGBP(order.total_pence)}</strong>} />
            {order.refunded_pence > 0 && <Row k="Refunded" v={formatGBP(order.refunded_pence)} />}
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg text-stone">Customer</h2>
          <dl>
            <Row k="Name" v={order.customer_name ?? '—'} />
            <Row k="Email" v={order.customer_email ?? '—'} />
            <Row k="Phone" v={order.customer_phone ?? '—'} />
            <Row k="Deliver to" v={a ? [a.name, a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(', ') : '—'} />
          </dl>
          <h2 className="mb-3 mt-6 font-serif text-lg text-stone">Payment</h2>
          <dl>
            <Row k="Paid at" v={order.paid_at ? new Date(order.paid_at).toLocaleString('en-GB') : '—'} />
            <Row k="Stripe" v={order.stripe_payment_intent_id ? <a className="text-crimson hover:underline" target="_blank" rel="noreferrer" href={`https://dashboard.stripe.com/${stripeLive ? '' : 'test/'}payments/${order.stripe_payment_intent_id}`}>{order.stripe_payment_intent_id}</a> : '—'} />
            <Row k="Stripe fee" v={order.stripe_fee_pence != null ? formatGBP(order.stripe_fee_pence) : 'not yet known'} />
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg text-stone">Fulfilment</h2>
          <dl>
            <Row k="Printify order" v={order.printify_order_id ?? '—'} />
            <Row k="Printify status" v={order.printify_status ?? '—'} />
            <Row k="Sent to production" v={order.printify_sent_to_production_at ? new Date(order.printify_sent_to_production_at).toLocaleString('en-GB') : 'no'} />
            <Row k="Attempts" v={order.fulfilment_attempts} />
            <Row k="Confirmation email" v={order.confirmation_email_sent_at ? 'sent' : 'not sent'} />
          </dl>
          <h3 className="mb-2 mt-5 text-sm font-medium text-stone">Tracking</h3>
          {shipments.length === 0 ? <p className="text-xs text-stone-subtle">No shipments yet.</p> : (
            <ul className="space-y-2 text-sm">
              {shipments.map(s => (
                <li key={s.id} className="text-stone-muted">
                  {s.carrier ?? 'Carrier'} · {s.tracking_url ? <a className="text-crimson hover:underline" href={s.tracking_url} target="_blank" rel="noreferrer">{s.tracking_number}</a> : s.tracking_number}
                  <span className="block text-xs text-stone-subtle">{s.delivered_at ? `Delivered ${new Date(s.delivered_at).toLocaleDateString('en-GB')}` : 'In transit'} · dispatch email {s.email_sent_at ? 'sent' : 'not sent'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-1 font-serif text-lg text-stone">Profit <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${profit.confirmed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{profit.confirmed ? 'confirmed' : 'estimated'}</span></h2>
          <dl className="mt-3">
            <Row k="Revenue (after refunds)" v={formatGBP(profit.revenuePence)} />
            <Row k="Printify production" v={profit.productCostPence == null ? 'unknown' : `− ${formatGBP(profit.productCostPence)}`} />
            <Row k="Printify shipping" v={profit.shippingCostPence == null ? 'unknown' : `− ${formatGBP(profit.shippingCostPence)}`} />
            <Row k="Printify tax" v={`− ${formatGBP(profit.taxCostPence)}`} />
            <Row k={order.stripe_fee_pence != null ? 'Stripe fee' : 'Stripe fee (estimate)'} v={`− ${formatGBP(profit.stripeFeePence)}`} />
            {settings.vatPercent > 0 && <Row k={`VAT @ ${settings.vatPercent}%`} v={`− ${formatGBP(profit.vatPence)}`} />}
            <Row k="Profit" v={<strong className="text-stone">{profit.profitPence == null ? 'cannot be worked out (cost unknown)' : formatGBP(profit.profitPence)}</strong>} />
          </dl>
          <p className="mt-2 text-2xs text-stone-subtle">Printify charged: {money(order.printify_cost_minor)} production, {money(order.printify_shipping_minor)} shipping.</p>
        </section>
      </div>

      <section className="mt-6 card p-5">
        <h2 className="mb-4 font-serif text-lg text-stone">Actions</h2>
        <ShopOrderActions order={order} canSendToProduction={sendToProductionEnabled()} />
      </section>

      <section className="mt-6 card p-5">
        <h2 className="mb-3 font-serif text-lg text-stone">Log</h2>
        <ul className="divide-y divide-white/[0.05] text-xs">
          {(events ?? []).map((e: any) => (
            <li key={e.id} className="flex gap-3 py-2">
              <span className="w-36 shrink-0 text-stone-subtle">{new Date(e.created_at).toLocaleString('en-GB')}</span>
              <span className={`w-36 shrink-0 ${e.level === 'error' ? 'text-red-400' : e.level === 'warn' ? 'text-amber-400' : 'text-stone-subtle'}`}>{e.type}</span>
              <span className="min-w-0 flex-1 text-stone-muted">{e.message}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
