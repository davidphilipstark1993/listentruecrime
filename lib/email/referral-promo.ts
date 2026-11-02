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
export function referralPromoRowHtml(link?: string | null): string {
  if (!link || !shopEnabled()) return ''
  return `
      <!-- Referral -->
      <tr>
        <td style="padding:0 32px 32px;">
          <div style="border:1px solid #e5e7eb;background:#fafafa;border-radius:10px;padding:22px 24px;text-align:center;">
            <p style="color:#be123c;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px;">Share &amp; save</p>
            <p style="color:#222;font-family:Georgia,serif;font-size:19px;font-weight:700;margin:0 0 8px;">Know a true crime fan?</p>
            <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 12px;">
              Send them your personal link. When they confirm their subscription you earn a shop discount: ${esc(referralRewardSummary())} merch.
            </p>
            <p style="margin:0;font-size:14px;"><a href="${esc(link)}" style="color:#be123c;word-break:break-all;">${esc(link)}</a></p>
          </div>
        </td>
      </tr>
`
}
