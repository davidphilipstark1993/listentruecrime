import { BASE } from '@/lib/seo/config'
import { sanitizeEnv } from '@/lib/utils'

export function buildWelcomeEmailHtml(firstName?: string | null): string {
  const greeting = firstName ? `Hi ${escHtml(firstName)},` : 'Hi there,'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>Welcome to ListenTrueCrime</title>
</head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f7;">
  <tr><td align="center" style="padding:32px 16px;">

    <!-- Card -->
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">

      <!-- Header -->
      <tr>
        <td style="background:#111118;padding:32px 32px 28px;text-align:center;">
          <a href="${BASE}" style="color:#be123c;font-family:Georgia,serif;font-size:22px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
            ListenTrueCrime
          </a>
          <p style="color:#a0a0b0;font-size:13px;margin:8px 0 0;">The true crime podcast database</p>
        </td>
      </tr>

      <!-- Hero -->
      <tr>
        <td style="background:#be123c;padding:28px 32px;text-align:center;">
          <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;font-weight:700;">
            You're on the list
          </h1>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:28px 32px;">
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            ${greeting}
          </p>
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Thanks for subscribing to the ListenTrueCrime newsletter. Every week, we send you five true
            crime podcasts we've discovered and think are worth your time — from new shows and hidden
            gems to established favourites.
          </p>
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Expect your first issue this coming Monday, and every Monday after that.
          </p>
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0;">
            In the meantime, you can browse our full database of reviewed &amp; rated shows.
          </p>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:0 32px 32px;text-align:center;">
          <a href="${BASE}/browse"
             style="display:inline-block;background:#be123c;color:#ffffff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">
            Browse All Podcasts
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0 0 6px;">
            You're receiving this because you subscribed at listentruecrime.com.
          </p>
          <p style="color:#bbb;font-size:11px;margin:0;">
            © ${new Date().getFullYear()} ListenTrueCrime &nbsp;·&nbsp;
            <a href="${BASE}" style="color:#be123c;text-decoration:none;">Visit site</a>
            &nbsp;·&nbsp;
            <a href="%asm_group_unsubscribe_raw_url%" style="color:#be123c;text-decoration:none;">Unsubscribe</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function sendSendGridWelcomeEmail(email: string, firstName?: string | null): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY ? sanitizeEnv(process.env.SENDGRID_API_KEY) : undefined
  if (!apiKey) return // graceful degradation — no key, no send

  const fromEmail = process.env.SENDGRID_FROM_EMAIL ? sanitizeEnv(process.env.SENDGRID_FROM_EMAIL) : 'info@listentruecrime.com'
  const fromName = process.env.SENDGRID_FROM_NAME ? sanitizeEnv(process.env.SENDGRID_FROM_NAME) : 'Listen True Crime'
  const groupId = process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID ? Number(sanitizeEnv(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID)) : undefined

  const html = buildWelcomeEmailHtml(firstName)

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: fromEmail, name: fromName },
      subject: "You're on the list — 5 True Crime Podcasts Worth Listening To",
      content: [{ type: 'text/html', value: html }],
      ...(groupId ? { asm: { group_id: groupId } } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SendGrid mail/send error ${res.status}: ${body}`)
  }
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
