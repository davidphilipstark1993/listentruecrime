import type { SupabaseClient } from '@supabase/supabase-js'
import { sendLeadMagnetEmail } from '@/lib/email/lead-magnet'
import { sendSendGridWelcomeEmail } from '@/lib/email/sendgrid'
import { subscribeSendGrid } from '@/lib/email/sendgrid-contacts'

/**
 * Runs once a subscriber has confirmed their address: syncs them to the
 * configured provider and sends the welcome / lead-magnet email. Nothing here
 * may throw, because the subscriber's confirmed state is already saved.
 */
export async function activateSubscriber(supabase: SupabaseClient, email: string, firstName?: string | null): Promise<void> {
  const provider = process.env.NEWSLETTER_PROVIDER ?? 'supabase'

  try {
    if (provider === 'sendgrid') {
      const jobId = await subscribeSendGrid(email, firstName)
      await supabase.from('newsletter_subscribers').update({ sendgrid_synced: true, sendgrid_contact_id: jobId }).eq('email', email)
    } else if (provider === 'beehiiv') {
      await subscribeBeehiiv(email)
    } else if (provider === 'convertkit') {
      await subscribeConvertKit(email)
    } else if (provider === 'mailchimp') {
      await subscribeMailchimp(email)
    }
  } catch (err) {
    // Retryable later via the admin "Retry SendGrid sync" action.
    console.error(`Newsletter provider (${provider}) sync error:`, err)
  }

  if (provider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Awaited: on serverless the function is frozen once the response is sent.
    try {
      await sendSendGridWelcomeEmail(email, firstName)
      await supabase.from('newsletter_subscribers').update({ welcome_sent: true }).eq('email', email)
    } catch (err) {
      console.error('SendGrid welcome email error:', err)
    }
  } else if (process.env.RESEND_API_KEY) {
    const { data: podcasts } = await supabase
      .from('podcasts')
      .select('title, slug, short_description, quick_verdict, binge_factor, case_types')
      .eq('is_published', true)
      .order('binge_factor', { ascending: false })
      .limit(10)
    if (podcasts?.length) {
      try {
        await sendLeadMagnetEmail(email, podcasts)
      } catch (err) {
        console.error('Lead magnet email error:', err)
      }
    }
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
