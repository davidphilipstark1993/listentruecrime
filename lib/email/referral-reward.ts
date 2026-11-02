import { BASE } from '@/lib/seo/config'
import { esc, sendShopEmail } from '@/lib/shop/email'
import { shopEnabled } from '@/lib/shop/config'
import { referralLink } from '@/lib/referrals/code'
import type { Tier } from '@/lib/referrals/rewards'

// The "thank you, here is your code" email sent when a referral tier is reached.
// Sent as service mail (like order emails): a reward the subscriber earned, not a campaign.
// It deliberately never says WHO they referred: we only know that someone confirmed.

// Own wrapper rather than the shop's: that one links to /shop in the header and footer, and this
// email must be safe to send while the shop is still switched off.
function wrap(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f7;"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
<tr><td style="background:#111118;padding:28px 32px;text-align:center;"><a href="${BASE}" style="color:#ffffff;font-family:Georgia,serif;font-size:22px;font-weight:700;text-decoration:none;">Listen True Crime</a></td></tr>
<tr><td style="padding:28px 32px;color:#333;font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;"><p style="color:#999;font-size:12px;margin:0;">You're getting this because someone confirmed their subscription using your referral link. © ${new Date().getFullYear()} ListenTrueCrime</p></td></tr>
</table></td></tr></table></body></html>`
}

export interface RewardEmailInput {
  to: string
  firstName?: string | null
  code: string
  percent: number
  expiresAt: Date
  /** Confirmed referrals so far. */
  count: number
  /** The next reward still to earn, if any. */
  next: Tier | null
  referralCode: string
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })

export function buildRewardEmail(i: RewardEmailInput) {
  const subject = `Thank you! Here's ${i.percent}% off the Listen True Crime shop`
  const greeting = i.firstName ? `Hi ${esc(i.firstName)},` : 'Hi there,'
  const expiry = dateFmt.format(i.expiresAt)
  const link = referralLink(i.referralCode)
  const open = shopEnabled()
  const useLink = open ? `${BASE}/shop/basket?code=${encodeURIComponent(i.code)}` : null
  const referralWord = i.count === 1 ? 'friend has' : 'friends have'
  const nextLine = i.next
    ? `Refer ${i.next.referrals - i.count} more ${i.next.referrals - i.count === 1 ? 'friend' : 'friends'} to unlock ${i.next.percent}% off.`
    : 'You have unlocked every reward. Thank you for spreading the word.'

  const html = wrap(subject, `
<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;color:#111118;">Thank you for spreading the word</h1>
<p style="margin:0 0 12px;">${greeting}</p>
<p style="margin:0 0 16px;">${i.count} ${referralWord} now confirmed their subscription through your link. That's a real compliment to the newsletter, and we're grateful. Here's a small thank-you:</p>
<div style="margin:20px 0;padding:20px;border:2px dashed #be123c;border-radius:10px;text-align:center;background:#fdf4f6;">
<p style="margin:0 0 6px;color:#be123c;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${i.percent}% off merch</p>
<p style="margin:0;font-family:'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:2px;color:#111118;">${esc(i.code)}</p>
<p style="margin:8px 0 0;color:#666;font-size:13px;">Single use · expires ${esc(expiry)} · one code per order</p>
</div>
${useLink
    ? `<p style="margin:0 0 20px;text-align:center;"><a href="${esc(useLink)}" style="display:inline-block;background:#be123c;color:#fff;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Shop with my code</a></p>`
    : `<p style="margin:0 0 20px;text-align:center;color:#555;">Enter it in your basket at checkout once the shop is open.</p>`}
<p style="margin:0 0 8px;color:#555;font-size:14px;">The discount comes off products (not delivery) and can't be combined with another code.</p>
<p style="margin:16px 0 4px;"><strong>${esc(nextLine)}</strong></p>
<p style="margin:0;color:#555;font-size:14px;">Your link: <a href="${esc(link)}" style="color:#be123c;">${esc(link)}</a></p>`)

  const text = [
    i.firstName ? `Hi ${i.firstName},` : 'Hi there,',
    '',
    `Thank you! ${i.count} ${referralWord} now confirmed their subscription through your referral link.`,
    '',
    `Your thank-you code: ${i.code}  (${i.percent}% off merch)`,
    `Single use. Expires ${expiry}. One code per order. Applies to products, not delivery.`,
    useLink ? `Use it here: ${useLink}` : 'Enter it in your basket at checkout once the shop is open.',
    '',
    nextLine,
    `Your link: ${link}`,
  ].join('\n')

  return { subject, html, text }
}

export async function sendRewardEmail(input: RewardEmailInput): Promise<void> {
  const { subject, html, text } = buildRewardEmail(input)
  await sendShopEmail({ to: input.to, subject, html, text })
}
