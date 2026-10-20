import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, webhookSecret } from '@/lib/shop/stripe'
import { finishWebhookEvent, claimWebhookEvent } from '@/lib/shop/webhook-events'
import {
  handleAsyncPaymentFailed, handleChargeRefunded, handleCheckoutExpired, handleCheckoutPaid, handleDispute, logEvent,
} from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// Stripe → us. The signature is verified against the RAW body before anything
// else happens; an unsigned or tampered request is rejected with 400.
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, webhookSecret())
  } catch (err) {
    console.warn('Stripe webhook signature verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let claim: Awaited<ReturnType<typeof claimWebhookEvent>>
  try {
    claim = await claimWebhookEvent('stripe', event.id, event.type)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Temporary error' }, { status: 500 }) // Stripe will retry
  }
  if (claim === 'duplicate') return NextResponse.json({ received: true, duplicate: true })

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await handleCheckoutPaid(event.data.object as Stripe.Checkout.Session)
        break
      case 'checkout.session.async_payment_failed':
        await handleAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session)
        break
      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
        break
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break
      case 'charge.dispute.created':
        await handleDispute(event.data.object as Stripe.Dispute)
        break
      default:
        break // other event types are acknowledged and ignored
    }
    await finishWebhookEvent('stripe', event.id)
    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Stripe webhook ${event.type} failed:`, err)
    await logEvent(null, 'error', 'stripe.webhook_failed', message, { event: event.id, type: event.type })
    await finishWebhookEvent('stripe', event.id, message)
    // 500 makes Stripe redeliver; the handlers are idempotent so that is safe.
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
