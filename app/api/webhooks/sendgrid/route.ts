import { NextResponse } from 'next/server'
import { EventWebhook, EventWebhookHeader } from '@sendgrid/eventwebhook'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeEnv } from '@/lib/utils'
import type { NewsletterSubscriberStatus } from '@/lib/types/database'

interface SendGridEvent {
  email: string
  event: string
  sg_event_id?: string
  category?: string[] | string
  url?: string
}

const STATUS_BY_EVENT: Record<string, NewsletterSubscriberStatus> = {
  unsubscribe: 'unsubscribed',
  group_unsubscribe: 'unsubscribed',
  bounce: 'bounced',
  spamreport: 'suppressed',
}

// SendGrid requires the exact raw request body for signature verification,
// so this route reads text() before any JSON.parse — no other route in this
// repo needs raw-body handling, this is deliberately the one exception.
export async function POST(req: Request) {
  const publicKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY
  if (!publicKey) {
    console.error('SendGrid webhook: SENDGRID_WEBHOOK_VERIFICATION_KEY is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const payload = await req.text()
  const signature = req.headers.get(EventWebhookHeader.SIGNATURE())
  const timestamp = req.headers.get(EventWebhookHeader.TIMESTAMP())

  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
  }

  const eventWebhook = new EventWebhook()
  const ecPublicKey = eventWebhook.convertPublicKeyToECDSA(sanitizeEnv(publicKey))
  const isValid = eventWebhook.verifySignature(ecPublicKey, payload, signature, timestamp)

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const events = JSON.parse(payload) as SendGridEvent[]
  const supabase = createAdminClient()

  for (const event of events) {
    try {
      const email = event.email?.toLowerCase()
      if (!email) continue

      const mappedStatus = STATUS_BY_EVENT[event.event]
      if (mappedStatus) {
        await supabase
          .from('newsletter_subscribers')
          .update({ status: mappedStatus, unsubscribed_at: new Date().toISOString() })
          .eq('email', email)
      }

      // Basic engagement tracking for opens/clicks, keyed to a newsletter via
      // the `newsletter-<id>` category set in lib/email/sendgrid-campaign.ts.
      if (['open', 'click', 'bounce', 'unsubscribe', 'group_unsubscribe', 'spamreport'].includes(event.event)) {
        const categories = Array.isArray(event.category) ? event.category : event.category ? [event.category] : []
        const newsletterCategory = categories.find(c => c.startsWith('newsletter-'))
        const newsletterId = newsletterCategory?.replace('newsletter-', '') ?? null

        await supabase.from('newsletter_events').insert({
          newsletter_id: newsletterId,
          event_type: event.event,
          email,
          url: event.url ?? null,
        })
      }
    } catch (err) {
      // One malformed/unexpected event should never drop the rest of the batch.
      console.error('SendGrid webhook event processing error:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
