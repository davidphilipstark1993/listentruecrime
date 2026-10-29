import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { orderActionSchema } from '@/lib/shop/admin-schema'
import {
  linkExistingPrintifyOrder, logEvent, refundOrder, resendConfirmation, retryFulfilment, sendOrderToProduction, syncFromPrintify,
} from '@/lib/shop/orders'
import { sendToProductionEnabled } from '@/lib/shop/config'

interface Props { params: Promise<{ id: string }> }

export const maxDuration = 60

export async function POST(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const parsed = orderActionSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  const a = parsed.data

  try {
    switch (a.action) {
      case 'retry': {
        const result = await retryFulfilment(id)
        return NextResponse.json({ ok: result !== 'skipped', result, message: result === 'skipped' ? 'Nothing to retry for this order (it may already have a Printify order).' : `Fulfilment result: ${result}` })
      }
      case 'sync':
        await syncFromPrintify(id)
        return NextResponse.json({ ok: true, message: 'Refreshed from Printify' })
      case 'send_to_production': {
        if (!sendToProductionEnabled()) return NextResponse.json({ error: 'Sending to production is switched off (SHOP_PRINTIFY_SEND_TO_PRODUCTION) or Stripe is in test mode.' }, { status: 409 })
        const ok = await sendOrderToProduction(id, { manual: true })
        return NextResponse.json({ ok, message: ok ? 'Sent to production' : 'Could not send — see the order log' })
      }
      case 'resend_confirmation': {
        const admin = createAdminClient()
        await admin.from('shop_orders').update({ confirmation_email_sent_at: null }).eq('id', id)
        await resendConfirmation(id)
        return NextResponse.json({ ok: true, message: 'Confirmation email re-sent' })
      }
      case 'refund': {
        const r = await refundOrder(id, a.amountPence ?? null)
        return NextResponse.json({ ok: true, message: `Refunded. Total refunded: ${r.refundedPence}p` })
      }
      case 'link_printify':
        await linkExistingPrintifyOrder(id, a.printifyOrderId)
        return NextResponse.json({ ok: true, message: 'Linked to the existing Printify order' })
      case 'note': {
        await createAdminClient().from('shop_orders').update({ notes: a.notes || null }).eq('id', id)
        return NextResponse.json({ ok: true })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logEvent(id, 'error', 'admin.action_failed', `${a.action}: ${message}`)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
