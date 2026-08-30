import { sanitizeEnv } from '@/lib/utils'
import type { Newsletter } from '@/lib/types/database'

const SENDGRID_BATCH_SIZE = 900 // SendGrid personalizations cap is 1000 per request

interface Recipient {
  email: string
}

/**
 * Sends an approved newsletter issue to a list of active/synced subscribers
 * via SendGrid's Mail Send API (batched, no separate Marketing Campaigns
 * setup required). Returns the last batch's X-Message-Id as a lightweight
 * campaign reference, stored on newsletters.sendgrid_campaign_id.
 */
export async function sendNewsletterCampaign(
  newsletter: Pick<Newsletter, 'id' | 'title' | 'html_content' | 'plain_text_content'>,
  recipients: Recipient[]
): Promise<{ campaignId: string; sentCount: number }> {
  const apiKey = process.env.SENDGRID_API_KEY ? sanitizeEnv(process.env.SENDGRID_API_KEY) : undefined
  if (!apiKey) throw new Error('SENDGRID_API_KEY is not configured')
  if (!newsletter.html_content) throw new Error('Newsletter has no generated html_content')
  if (!recipients.length) throw new Error('No active recipients to send to')

  const fromEmail = process.env.SENDGRID_FROM_EMAIL ? sanitizeEnv(process.env.SENDGRID_FROM_EMAIL) : 'info@listentruecrime.com'
  const fromName = process.env.SENDGRID_FROM_NAME ? sanitizeEnv(process.env.SENDGRID_FROM_NAME) : 'Listen True Crime'
  const groupId = process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID ? Number(sanitizeEnv(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID)) : undefined

  let lastMessageId = ''
  let sentCount = 0

  for (let i = 0; i < recipients.length; i += SENDGRID_BATCH_SIZE) {
    const batch = recipients.slice(i, i + SENDGRID_BATCH_SIZE)

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: batch.map(r => ({ to: [{ email: r.email }] })),
        from: { email: fromEmail, name: fromName },
        subject: newsletter.title,
        content: [
          ...(newsletter.plain_text_content ? [{ type: 'text/plain', value: newsletter.plain_text_content }] : []),
          { type: 'text/html', value: newsletter.html_content },
        ],
        categories: [`newsletter-${newsletter.id}`],
        ...(groupId ? { asm: { group_id: groupId } } : {}),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`SendGrid mail/send error ${res.status}: ${body}`)
    }

    lastMessageId = res.headers.get('x-message-id') ?? lastMessageId
    sentCount += batch.length
  }

  return { campaignId: lastMessageId || `newsletter-${newsletter.id}`, sentCount }
}
