import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatGBP } from '@/lib/shop/money'
import { StatusBadge } from '@/components/admin/shop-ui'
import type { ShopOrderRow } from '@/lib/shop/types'

export const dynamic = 'force-dynamic'

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'unpaid', label: 'Unpaid' },
]

export default async function OrdersPage({ searchParams }: { searchParams: { q?: string; f?: string } }) {
  const admin = createAdminClient()
  let query = admin.from('shop_orders').select('*').order('created_at', { ascending: false }).limit(200)
  const f = searchParams.f ?? ''
  if (f === 'attention') query = query.in('fulfilment_status', ['failed', 'needs_review']).eq('payment_status', 'paid')
  else if (f === 'in_progress') query = query.in('fulfilment_status', ['queued', 'submitting', 'created', 'in_production'])
  else if (f === 'fulfilled') query = query.in('fulfilment_status', ['shipped', 'delivered'])
  else if (f === 'unpaid') query = query.in('payment_status', ['pending', 'expired', 'failed'])
  else query = query.not('payment_status', 'in', '(pending,expired,failed)') // default: real orders

  const q = (searchParams.q ?? '').trim().replace(/[%,()]/g, '')
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_email.ilike.%${q}%,customer_name.ilike.%${q}%,printify_order_id.ilike.%${q}%`)
  const { data } = await query
  const orders = (data ?? []) as ShopOrderRow[]

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="heading-display text-2xl">Orders</h1>
        <form className="flex gap-2">
          {f && <input type="hidden" name="f" value={f} />}
          <input name="q" defaultValue={searchParams.q ?? ''} placeholder="Order no., email, name, Printify id" className="input-base w-72 py-2" />
          <button className="btn-outline py-2">Search</button>
        </form>
      </div>
      <div className="mb-4 flex gap-2">
        {FILTERS.map(x => (
          <Link key={x.key} href={`/admin/shop/orders${x.key ? `?f=${x.key}` : ''}`} className={`tag px-3 py-1 ${x.key === f ? 'border-crimson/40 text-stone' : ''}`}>{x.label}</Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Order', 'Date', 'Customer', 'Total', 'Payment', 'Fulfilment', 'Printify'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-subtle">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3"><Link href={`/admin/shop/orders/${o.id}`} className="font-medium text-stone hover:text-crimson">{o.order_number}</Link></td>
                <td className="px-4 py-3 text-xs text-stone-subtle">{new Date(o.created_at).toLocaleString('en-GB')}</td>
                <td className="px-4 py-3 text-xs text-stone-muted">{o.customer_name ?? '—'}<br /><span className="text-stone-subtle">{o.customer_email}</span></td>
                <td className="px-4 py-3 tabular-nums">{formatGBP(o.total_pence)}</td>
                <td className="px-4 py-3"><StatusBadge value={o.payment_status} /></td>
                <td className="px-4 py-3"><StatusBadge value={o.fulfilment_status} /></td>
                <td className="px-4 py-3 text-xs text-stone-subtle">{o.printify_order_id ?? '—'}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-stone-subtle">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
