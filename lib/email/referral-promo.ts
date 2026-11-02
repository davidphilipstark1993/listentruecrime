import { shopEnabled } from '@/lib/shop/config'
import { REFERRAL_TIERS, maxDiscountPercent } from '@/lib/discounts/config'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** What the tiers are worth, worded from the config so the copy can never disagree with the rules. */
export function referralRewardSummary(): string {
  const cap = maxDiscountPercent()
  return REFERRAL_TIERS
    .map(t => `${t.referrals} confirmed ${t.referrals === 1 ? 'friend' : 'friends'} = ${Math.min(t.percent, cap)}% off`)
    .join(', ')
}

/**
 * "Share your link" block for the welcome emails (light card style). Empty without a link, and
 * empty while the shop is switched off, because the reward is a shop discount. The link carries
 * only the subscriber's own code, never an email address.
 */
export function referralPromoRowHtml(link?: string | null, opts: { dark?: boolean } = {}): string {
  if (!link || !shopEnabled()) return ''
  const c = opts.dark
    ? { pad: '24px 32px 8px', box: 'border:1px solid #2a2a35;background:#111118;', head: '#ffffff', body: '#b4b4c0' }
    : { pad: '0 32px 32px', box: 'border:1px solid #e5e7eb;background:#fafafa;', head: '#222', body: '#444' }
  return `
      <!-- Referral -->
      <tr>
        <td style="padding:${c.pad};">
          <div style="${c.box}border-radius:10px;padding:22px 24px;text-align:center;">
            <p style="color:#be123c;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px;">Share &amp; save</p>
            <p style="color:${c.head};font-family:Georgia,serif;font-size:19px;font-weight:700;margin:0 0 8px;">Know a true crime fan?</p>
            <p style="color:${c.body};font-size:14px;line-height:1.6;margin:0 0 12px;">
              Send them your personal link. When they confirm their subscription you earn a shop discount: ${esc(referralRewardSummary())} merch.
            </p>
            <p style="margin:0;font-size:14px;"><a href="${esc(link)}" style="color:#be123c;word-break:break-all;">${esc(link)}</a></p>
          </div>
        </td>
      </tr>
`
}

// ─── Weekly issue: a personal link in every copy ────────────────────────────────
/** Placeholder swapped for each recipient's own link at send time (SendGrid substitution / Resend replace). */
export const REFERRAL_LINK_TAG = '-referral_link-'

const FOOTER_ROW = `<tr>
        <td style="padding:20px 32px;text-align:center;">`

/**
 * Adds the "share your link" card to an issue just before its footer, containing REFERRAL_LINK_TAG.
 * Applied at send time only, so the stored issue (archive page, RSS) never carries a placeholder.
 * Returns the content untouched while the shop is off or if the footer can't be found, so it can
 * never break a send.
 */
export function withReferralBlock<T extends { html_content: string | null; plain_text_content: string | null }>(issue: T): T {
  if (!shopEnabled() || !issue.html_content?.includes(FOOTER_ROW)) return issue
  const html = issue.html_content.replace(FOOTER_ROW, `${referralPromoRowHtml(REFERRAL_LINK_TAG, { dark: true }).trim()}\n      ${FOOTER_ROW}`)
  const text = issue.plain_text_content
    ? `${issue.plain_text_content}\n\nKnow a true crime fan? Share your personal link: ${REFERRAL_LINK_TAG}\n(${referralRewardSummary()} merch)`
    : issue.plain_text_content
  return { ...issue, html_content: html, plain_text_content: text }
}
