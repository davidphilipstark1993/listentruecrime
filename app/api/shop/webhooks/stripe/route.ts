import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, stripeKeyMode, webhookSecret } from '@/lib/shop/stripe'
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
    claim = await claimWebhookEvent('stripe', event.id, event.type, event.livemode)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Temporary error' }, { status: 500 }) // Stripe will retry
  }
  if (claim === 'duplicate') return NextResponse.json({ received: true, duplicate: true })

  // A signed event whose mode disagrees with the configured secret key means test
  // and live settings are mixed up (e.g. a live webhook secret with a test key).
  // Processing it could never find the right order, so record it loudly and stop.
  const keyMode = stripeKeyMode()
  if (keyMode && event.livemode !== (keyMode === 'live')) {
    const msg = `Received a ${event.livemode ? 'LIVE' : 'TEST'} Stripe event (${event.type}) but STRIPE_SECRET_KEY is a ${keyMode.toUpperCase()} key. Check that the key and webhook secret are both test or both live.`
    await logEvent(null, 'error', 'stripe.mode_mismatch', msg, { event: event.id, vercel_env: process.env.VERCEL_ENV ?? null })
    await finishWebhookEvent('stripe', event.id, msg)
    return NextResponse.json({ received: true, ignored: 'mode_mismatch' })
  }

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
