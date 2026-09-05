import { sanitizeEnv } from '@/lib/utils'
import type { Newsletter } from '@/lib/types/database'

const RESEND_BATCH_SIZE = 100 // Resend's /emails/batch cap per request

interface Recipient {
  email: string
}

/**
 * Sends an approved newsletter issue to a list of active/synced subscribers
 * via Resend's batch email API. Mirrors sendNewsletterCampaignViaSendGrid's
 * signature/return shape so callers can treat the two providers the same way.
 */
export async function sendNewsletterCampaignViaResend(
  newsletter: Pick<Newsletter, 'id' | 'title' | 'html_content' | 'plain_text_content'>,
  recipients: Recipient[]
): Promise<{ campaignId: string; sentCount: number }> {
  const apiKey = process.env.RESEND_API_KEY ? sanitizeEnv(process.env.RESEND_API_KEY) : undefined
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  if (!newsletter.html_content) throw new Error('Newsletter has no generated html_content')
  if (!recipients.length) throw new Error('No active recipients to send to')

  const fromEmail = process.env.RESEND_FROM_EMAIL ? sanitizeEnv(process.env.RESEND_FROM_EMAIL) : 'hello@listentruecrime.com'
  const fromName = process.env.RESEND_FROM_NAME ? sanitizeEnv(process.env.RESEND_FROM_NAME) : 'ListenTrueCrime'

  let lastId = ''
  let sentCount = 0

  for (let i = 0; i < recipients.length; i += RESEND_BATCH_SIZE) {
    const batch = recipients.slice(i, i + RESEND_BATCH_SIZE)

    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        batch.map(r => ({
          from: `${fromName} <${fromEmail}>`,
          to: [r.email],
          subject: newsletter.title,
          html: newsletter.html_content,
          ...(newsletter.plain_text_content ? { text: newsletter.plain_text_content } : {}),
          tags: [{ name: 'newsletter_id', value: newsletter.id }],
        }))
      ),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend batch send error ${res.status}: ${body}`)
    }

    const data = await res.json()
    lastId = data?.data?.[data.data.length - 1]?.id ?? lastId
    sentCount += batch.length
  }

  return { campaignId: lastId || `newsletter-${newsletter.id}`, sentCount }
}
