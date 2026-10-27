'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { ShopOrderRow } from '@/lib/shop/types'

export function ShopOrderActions({ order, canSendToProduction }: { order: ShopOrderRow; canSendToProduction: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [refund, setRefund] = useState('')
  const [linkId, setLinkId] = useState('')
  const [notes, setNotes] = useState(order.notes ?? '')

  const run = async (label: string, body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(label)
    try {
      const res = await fetch(`/api/admin/shop/orders/${order.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      toast.success(data.message ?? 'Done')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  const paid = ['paid', 'partially_refunded', 'refunded'].includes(order.payment_status)
  const stuck = paid && !order.printify_order_id && ['failed', 'needs_review'].includes(order.fulfilment_status)
  const remaining = order.total_pence - order.refunded_pence

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {stuck && (
          <button disabled={!!busy} onClick={() => run('retry', { action: 'retry' }, order.fulfilment_status === 'needs_review' ? 'This order needs review because Printify\'s response was unclear or it was rejected. Have you checked Printify and confirmed no order exists for ' + order.order_number + '? Retrying could create a duplicate supplier order.' : undefined)} className="btn-primary py-2 text-xs">{busy === 'retry' ? 'Retrying…' : 'Retry fulfilment'}</button>
        )}
        {order.printify_order_id && <button disabled={!!busy} onClick={() => run('sync', { action: 'sync' })} className="btn-outline py-2 text-xs">Refresh from Printify</button>}
        {order.printify_order_id && !order.printify_sent_to_production_at && paid && canSendToProduction && (
          <button disabled={!!busy} onClick={() => run('prod', { action: 'send_to_production' }, 'Send this order to production? Printify will charge your payment method.')} className="btn-outline py-2 text-xs">Send to production</button>
        )}
        {paid && <button disabled={!!busy} onClick={() => run('email', { action: 'resend_confirmation' }, 'Re-send the order confirmation email to the customer?')} className="btn-outline py-2 text-xs">Re-send confirmation</button>}
      </div>

      {paid && remaining > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-stone-muted">Refund (max {(remaining / 100).toFixed(2)} GBP) — leave blank for the full remaining amount</p>
          <div className="flex gap-2">
            <input value={refund} onChange={e => setRefund(e.target.value)} placeholder="£ amount" inputMode="decimal" className="input-base w-36 py-2" />
            <button disabled={!!busy} onClick={() => {
              const pence = refund.trim() ? Math.round(Number(refund.replace(/[£,\s]/g, '')) * 100) : null
              if (pence !== null && (!Number.isFinite(pence) || pence < 1)) return toast.error('Enter a valid amount')
              run('refund', { action: 'refund', amountPence: pence }, `Refund ${pence === null ? 'the full remaining amount' : '£' + (pence / 100).toFixed(2)} to the customer via Stripe? This cannot be undone. It does not stop production at Printify.`)
            }} className="btn-outline py-2 text-xs">Refund via Stripe</button>
          </div>
        </div>
      )}

      {paid && !order.printify_order_id && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-stone-muted">Already created this order in Printify yourself? Link it (stops a duplicate)</p>
          <div className="flex gap-2">
            <input value={linkId} onChange={e => setLinkId(e.target.value)} placeholder="Printify order id" className="input-base w-72 py-2" />
            <button disabled={!!busy || linkId.length < 5} onClick={() => run('link', { action: 'link_printify', printifyOrderId: linkId.trim() })} className="btn-outline py-2 text-xs">Link</button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-stone-muted">Internal notes</p>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="input-base" />
        <button disabled={!!busy} onClick={() => run('note', { action: 'note', notes })} className="btn-ghost mt-1 py-1.5 text-xs">Save note</button>
      </div>
    </div>
  )
}
