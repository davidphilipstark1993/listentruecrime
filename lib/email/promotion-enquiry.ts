import { BASE } from '@/lib/seo/config'
import { sanitizeEnv } from '@/lib/utils'
import { campaignTimingLabel, promotionInterestLabel } from '@/lib/promotion/packages'
import type { PodcastPromotionEnquiry } from '@/lib/types/database'

// Transactional emails for /promote-your-podcast enquiries. Uses the same
// SendGrid-then-Resend provider split as lib/email/adminNotify.ts — no new
// email system. Neither email uses the newsletter unsubscribe group: both
// are one-off transactional replies to a request the person just made.

type Enquiry = Pick<
  PodcastPromotionEnquiry,
  'id' | 'name' | 'email' | 'podcast_name' | 'podcast_website' | 'rss_feed' |
  'package_interest' | 'campaign_timing' | 'message' | 'newsletter_opt_in'
>

interface OutgoingEmail {
  to: string[]
  subject: string
  text: string
  html?: string
  replyTo?: string
}

/** Returns true if a provider accepted the message. Never throws. */
async function sendEmail({ to, subject, text, html, replyTo }: OutgoingEmail): Promise<boolean> {
  const sendgridKey = process.env.SENDGRID_API_KEY ? sanitizeEnv(process.env.SENDGRID_API_KEY) : undefined
  const resendKey = process.env.RESEND_API_KEY ? sanitizeEnv(process.env.RESEND_API_KEY) : undefined

  try {
    if (sendgridKey) {
      const fromEmail = process.env.SENDGRID_FROM_EMAIL ? sanitizeEnv(process.env.SENDGRID_FROM_EMAIL) : 'info@listentruecrime.com'
      const fromName = process.env.SENDGRID_FROM_NAME ? sanitizeEnv(process.env.SENDGRID_FROM_NAME) : 'Listen True Crime'
      const content = [{ type: 'text/plain', value: text }, ...(html ? [{ type: 'text/html', value: html }] : [])]

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: to.map(email => ({ email })) }],
          from: { email: fromEmail, name: fromName },
          ...(replyTo ? { reply_to: { email: replyTo } } : {}),
          subject,
          content,
        }),
      })
      if (!res.ok) console.error(`Promotion enquiry email (SendGrid) failed: ${res.status} ${await res.text()}`)
      return res.ok
    }

    if (resendKey) {
      const fromEmail = process.env.RESEND_FROM_EMAIL ? sanitizeEnv(process.env.RESEND_FROM_EMAIL) : 'hello@listentruecrime.com'
      const fromName = process.env.RESEND_FROM_NAME ? sanitizeEnv(process.env.RESEND_FROM_NAME) : 'ListenTrueCrime'

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject,
          text,
          ...(html ? { html } : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      })
      if (!res.ok) console.error(`Promotion enquiry email (Resend) failed: ${res.status} ${await res.text()}`)
      return res.ok
    }
  } catch (err) {
    console.error('Promotion enquiry email error:', err)
    return false
  }

  console.log(`(no SENDGRID_API_KEY/RESEND_API_KEY configured — would have sent: ${subject})`)
  return false
}

function adminRecipients(): string[] {
  const configured = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => sanitizeEnv(e)).filter(Boolean)
  return configured.length ? configured : ['info@listentruecrime.com']
}

export async function sendPromotionEnquiryAdminEmail(enquiry: Enquiry, stored: boolean): Promise<boolean> {
  const lines = [
    `New podcast promotion enquiry${stored ? '' : ' (NOT saved to the database — record it manually)'}`,
    '',
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Podcast: ${enquiry.podcast_name}`,
    `Website: ${enquiry.podcast_website ?? '—'}`,
    `RSS feed: ${enquiry.rss_feed ?? '—'}`,
    `Interested in: ${promotionInterestLabel(enquiry.package_interest)}`,
    `Timing: ${campaignTimingLabel(enquiry.campaign_timing)}`,
    `Newsletter opt-in: ${enquiry.newsletter_opt_in ? 'Yes' : 'No'}`,
    '',
    'Message:',
    enquiry.message || '—',
    '',
    stored ? `Manage: ${BASE}/admin/promotion-enquiries` : '',
    'Reply to this email to respond directly to the enquirer.',
  ]

  return sendEmail({
    to: adminRecipients(),
    subject: `Promotion enquiry: ${enquiry.podcast_name} (${promotionInterestLabel(enquiry.package_interest)})`,
    text: lines.join('\n'),
    replyTo: enquiry.email,
  })
}

export async function sendPromotionEnquiryConfirmationEmail(enquiry: Enquiry): Promise<boolean> {
  const isFreeListing = enquiry.package_interest === 'free_listing'
  const firstName = enquiry.name.split(/\s+/)[0]
  const intro = isFreeListing
    ? `Thanks for submitting ${enquiry.podcast_name} for consideration in the ListenTrueCrime podcast database.`
    : `Thanks for your enquiry about promoting ${enquiry.podcast_name} on ListenTrueCrime.`
  const next = isFreeListing
    ? 'We review every submission ourselves. If your podcast is a good fit for the database, we will be in touch — this can take a little while, as we listen before we list.'
    : 'We will reply personally, usually within a few working days, with availability and the options that suit your podcast.'
  const independence =
    'Paid promotion on ListenTrueCrime is always labelled as such and is kept separate from our independent editorial reviews and ratings.'

  const text = [
    `Hi ${firstName},`,
    '',
    intro,
    '',
    next,
    '',
    `You told us you're interested in: ${promotionInterestLabel(enquiry.package_interest)}`,
    '',
    independence,
    '',
    'If you need to add anything, just reply to this email.',
    '',
    'ListenTrueCrime',
    BASE,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>We've received your enquiry</title></head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f7;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
      <tr>
        <td style="background:#111118;padding:32px 32px 28px;text-align:center;">
          <a href="${BASE}" style="color:#be123c;font-family:Georgia,serif;font-size:22px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">ListenTrueCrime</a>
          <p style="color:#a0a0b0;font-size:13px;margin:8px 0 0;">The true crime podcast database</p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px;">
          <h1 style="color:#111118;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;font-weight:700;">We've received your ${isFreeListing ? 'submission' : 'enquiry'}</h1>
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${escHtml(firstName)},</p>
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">${escHtml(intro)}</p>
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">${escHtml(next)}</p>
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
            <strong>Interested in:</strong> ${escHtml(promotionInterestLabel(enquiry.package_interest))}
          </p>
          <p style="color:#666;font-size:13px;line-height:1.6;margin:0;border-top:1px solid #f0f0f0;padding-top:16px;">${escHtml(independence)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0 0 6px;">You're receiving this one-off email because you submitted an enquiry at listentruecrime.com. Reply to this email if you need to add anything.</p>
          <p style="color:#bbb;font-size:11px;margin:0;">
            © ${new Date().getFullYear()} ListenTrueCrime &nbsp;·&nbsp;
            <a href="${BASE}/privacy" style="color:#be123c;text-decoration:none;">Privacy Policy</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  return sendEmail({
    to: [enquiry.email],
    subject: isFreeListing ? `We've received ${enquiry.podcast_name}` : `Your ListenTrueCrime promotion enquiry: ${enquiry.podcast_name}`,
    text,
    html,
  })
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
