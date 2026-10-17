import { sanitizeEnv } from '@/lib/utils'
import { BASE } from '@/lib/seo/config'

const SUBJECT = 'Confirm your ListenTrueCrime subscription'

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildConfirmationHtml(link: string, firstName?: string | null): string {
  const greeting = firstName ? `Hi ${escHtml(firstName)},` : 'Hi there,'
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f7;"><tr><td align="center" style="padding:32px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;max-width:560px;">
    <tr><td style="padding:32px;">
      <p style="color:#be123c;font-family:Georgia,serif;font-size:20px;font-weight:700;margin:0 0 20px;">ListenTrueCrime</p>
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">${greeting}</p>
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Please confirm your email address to start getting our weekly newsletter: five true crime podcasts worth your time, every Sunday.
      </p>
      <p style="margin:0 0 24px;"><a href="${link}" style="display:inline-block;background:#be123c;color:#ffffff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">Confirm my subscription</a></p>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 8px;">Or paste this link into your browser:<br /><span style="word-break:break-all;">${link}</span></p>
      <p style="color:#999;font-size:12px;line-height:1.6;margin:16px 0 0;">If you didn't ask for this, ignore this email and you won't be subscribed. The link expires in 7 days.</p>
    </td></tr>
  </table>
  <p style="color:#bbb;font-size:11px;margin:16px 0 0;">ListenTrueCrime · <a href="${BASE}" style="color:#be123c;text-decoration:none;">listentruecrime.com</a></p>
</td></tr></table>
</body></html>`
}

export function buildConfirmationText(link: string, firstName?: string | null): string {
  return `${firstName ? `Hi ${firstName},` : 'Hi there,'}

Please confirm your email address to start getting the ListenTrueCrime weekly newsletter (five true crime podcasts worth your time, every Sunday):

${link}

If you didn't ask for this, ignore this email and you won't be subscribed. The link expires in 7 days.`
}

/**
 * Sends the double opt-in confirmation. Uses SendGrid when configured,
 * otherwise Resend (production currently only has Resend credentials).
 * Deliberately no unsubscribe group: this is a one-off transactional message
 * and a suppression group could stop it being delivered.
 */
export async function sendConfirmationEmail(email: string, link: string, firstName?: string | null): Promise<void> {
  const html = buildConfirmationHtml(link, firstName)
  const text = buildConfirmationText(link, firstName)

  if (process.env.SENDGRID_API_KEY) {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL ? sanitizeEnv(process.env.SENDGRID_FROM_EMAIL) : 'info@listentruecrime.com'
    const fromName = process.env.SENDGRID_FROM_NAME ? sanitizeEnv(process.env.SENDGRID_FROM_NAME) : 'Listen True Crime'
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sanitizeEnv(process.env.SENDGRID_API_KEY)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: fromEmail, name: fromName },
        subject: SUBJECT,
        content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }],
        tracking_settings: { click_tracking: { enable: false }, open_tracking: { enable: false } },
      }),
    })
    if (!res.ok) throw new Error(`SendGrid confirmation error ${res.status}: ${await res.text()}`)
    return
  }

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sanitizeEnv(process.env.RESEND_API_KEY)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'ListenTrueCrime <hello@listentruecrime.com>', to: email, subject: SUBJECT, html, text }),
    })
    if (!res.ok) throw new Error(`Resend confirmation error ${res.status}: ${await res.text()}`)
    return
  }

  throw new Error('No email provider configured (set SENDGRID_API_KEY or RESEND_API_KEY)')
}
