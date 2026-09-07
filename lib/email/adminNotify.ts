import { sanitizeEnv } from '@/lib/utils'

/**
 * Best-effort admin notification, used by the weekly cron jobs. Tries
 * SendGrid then Resend — whichever is actually configured — instead of
 * hard-requiring SendGrid, which silently no-ops in this project's
 * production/CI env (see lib/email/newsletter-campaign.ts for the same
 * split on the subscriber-facing send).
 */
export async function notifyAdmin(subject: string, text: string): Promise<void> {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.length) {
    console.log(`(no ADMIN_EMAILS configured — would have notified: ${subject})`)
    return
  }

  const sendgridKey = process.env.SENDGRID_API_KEY ? sanitizeEnv(process.env.SENDGRID_API_KEY) : undefined
  const resendKey = process.env.RESEND_API_KEY ? sanitizeEnv(process.env.RESEND_API_KEY) : undefined

  if (sendgridKey) {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL ? sanitizeEnv(process.env.SENDGRID_FROM_EMAIL) : 'info@listentruecrime.com'
    const fromName = process.env.SENDGRID_FROM_NAME ? sanitizeEnv(process.env.SENDGRID_FROM_NAME) : 'Listen True Crime'

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: adminEmails.map(email => ({ email })) }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    })
    if (!res.ok) console.error(`Admin notification (SendGrid) failed: ${res.status} ${await res.text()}`)
    return
  }

  if (resendKey) {
    const fromEmail = process.env.RESEND_FROM_EMAIL ? sanitizeEnv(process.env.RESEND_FROM_EMAIL) : 'hello@listentruecrime.com'
    const fromName = process.env.RESEND_FROM_NAME ? sanitizeEnv(process.env.RESEND_FROM_NAME) : 'ListenTrueCrime'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: adminEmails, subject, text }),
    })
    if (!res.ok) console.error(`Admin notification (Resend) failed: ${res.status} ${await res.text()}`)
    return
  }

  console.log(`(no SENDGRID_API_KEY/RESEND_API_KEY configured — would have notified: ${subject})`)
}
