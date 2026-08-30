import { sanitizeEnv } from '@/lib/utils'
import { BASE } from '@/lib/seo/config'

interface RunSummary {
  discovered: number
  researched: number
  researchFailed: number
  shortlisted: number
  newsletterId: string | null
}

/** Emails the admin(s) that a new weekly editorial review is ready. Never sends the newsletter itself. */
export async function notifyReviewReady(summary: RunSummary): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY ? sanitizeEnv(process.env.SENDGRID_API_KEY) : undefined
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)

  if (!apiKey || !adminEmails.length) {
    console.log('SENDGRID_API_KEY or ADMIN_EMAILS not set — skipping review-ready notification email.')
    return
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL ? sanitizeEnv(process.env.SENDGRID_FROM_EMAIL) : 'hello@listentruecrime.com'
  const fromName = process.env.SENDGRID_FROM_NAME ? sanitizeEnv(process.env.SENDGRID_FROM_NAME) : 'Listen True Crime'
  const reviewUrl = summary.newsletterId ? `${BASE}/admin/newsletter-issues/${summary.newsletterId}` : `${BASE}/admin/discoveries`

  const text = `This week's podcast discovery run is done.

Discovered: ${summary.discovered}
Researched: ${summary.researched} (${summary.researchFailed} failed)
Shortlisted: ${summary.shortlisted}

Review and approve: ${reviewUrl}

No newsletter has been sent — this is a draft awaiting your review.`

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: adminEmails.map(email => ({ email })) }],
      from: { email: fromEmail, name: fromName },
      subject: 'Your weekly editorial review is ready',
      content: [{ type: 'text/plain', value: text }],
    }),
  })

  if (!res.ok) {
    console.error(`Review-ready notification failed: ${res.status} ${await res.text()}`)
  }
}
