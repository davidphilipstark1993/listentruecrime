import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const { email, source } = await req.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const provider = process.env.NEWSLETTER_PROVIDER ?? 'supabase'

  try {
    if (provider === 'beehiiv') {
      await subscribeBeehiiv(email)
    } else if (provider === 'convertkit') {
      await subscribeConvertKit(email)
    } else if (provider === 'mailchimp') {
      await subscribeMailchimp(email)
    }

    // Always log to our own DB regardless of provider
    const supabase = createAdminClient()
    await supabase
      .from('newsletter_subscribers')
      .upsert({ email, source: source ?? 'unknown' }, { onConflict: 'email' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Newsletter error:', err)
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }
}

async function subscribeBeehiiv(email: string) {
  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: true }),
    }
  )
  if (!res.ok) throw new Error('Beehiiv API error')
}

async function subscribeConvertKit(email: string) {
  const res = await fetch(
    `https://api.convertkit.com/v3/forms/${process.env.CONVERTKIT_FORM_ID}/subscribe`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.CONVERTKIT_API_KEY, email }),
    }
  )
  if (!res.ok) throw new Error('ConvertKit API error')
}

async function subscribeMailchimp(email: string) {
  const server = process.env.MAILCHIMP_SERVER_PREFIX
  const listId = process.env.MAILCHIMP_LIST_ID
  const res = await fetch(
    `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`any:${process.env.MAILCHIMP_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_address: email, status: 'subscribed' }),
    }
  )
  // 400 with "Member Exists" is not a real error
  if (!res.ok && res.status !== 400) throw new Error('Mailchimp API error')
}
