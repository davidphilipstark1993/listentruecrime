import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { sanitizeEnv } from '@/lib/utils'
import { verifyPrintifySignature } from '@/lib/shop/signature'
import { claimWebhookEvent, finishWebhookEvent } from '@/lib/shop/webhook-events'
import { findOrderByPrintifyId, logEvent, syncFromPrintify } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// Printify → us. Used only to learn *which* order changed; we then fetch the
// authoritative order from Printify's API (see syncFromPrintify).
export async function POST(req: Request) {
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET ? sanitizeEnv(process.env.PRINTIFY_WEBHOOK_SECRET) : ''
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })

  const raw = await req.text()
  if (!verifyPrintifySignature(raw, req.headers.get('x-pfy-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { id?: string; type?: string; resource?: { id?: string } }
  try { event = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  if (!event.type?.startsWith('order:') || !event.resource?.id) return NextResponse.json({ received: true, ignored: true })

  // Printify event ids can be reused across retries; fall back to a stable composite.
  const eventId = event.id ?? `${event.type}:${event.resource.id}:${createHash('sha256').update(raw).digest('hex').slice(0, 16)}`
  let claim
  try { claim = await claimWebhookEvent('printify', eventId, event.type) } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Temporary error' }, { status: 500 })
  }
  if (claim === 'duplicate') return NextResponse.json({ received: true, duplicate: true })

  try {
    const order = await findOrderByPrintifyId(event.resource.id)
    if (order) await syncFromPrintify(order.id)
    // An unknown id usually means an order placed by hand in Printify — not ours to touch.
    await finishWebhookEvent('printify', eventId)
    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logEvent(null, 'error', 'printify.webhook_failed', message, { event: eventId, type: event.type })
    await finishWebhookEvent('printify', eventId, message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
