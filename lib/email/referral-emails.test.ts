import { afterEach, describe, expect, it } from 'vitest'
import { buildRewardEmail } from './referral-reward'
import { referralPromoRowHtml, referralRewardSummary } from './referral-promo'
import { buildWelcomeEmailHtml } from './sendgrid'
import { buildLeadMagnetHtml } from './lead-magnet'

const original = process.env.NEXT_PUBLIC_SHOP_ENABLED
afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_SHOP_ENABLED
  else process.env.NEXT_PUBLIC_SHOP_ENABLED = original
})

const input = {
  to: 'ann@example.com', firstName: 'Ann', code: 'REF-ABCD2345', percent: 20,
  expiresAt: new Date('2027-01-01T12:00:00Z'), count: 1, next: { referrals: 3, percent: 30 }, referralCode: 'ANNREF',
}

describe('reward email', () => {
  it('thanks the referrer and states the code, %, expiry and rules', () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'
    const { subject, html, text } = buildRewardEmail(input)
    expect(subject).toContain('20% off')
    for (const body of [html, text]) {
      expect(body).toContain('REF-ABCD2345')
      expect(body).toContain('1 January 2027')
      expect(body).toContain('/subscribe?ref=ANNREF')
      expect(body).toContain('Refer 2 more friends to unlock 30% off')
    }
    expect(html).toContain('/shop/basket?code=REF-ABCD2345')
    expect(html).toMatch(/not delivery/)
  })

  it('does not link to a closed shop', () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'false'
    const { html, text } = buildRewardEmail(input)
    expect(html).not.toContain('/shop')
    expect(text).not.toContain('/shop')
    expect(html).toContain('once the shop is open')
  })

  it('at the top tier it says there is nothing more to unlock', () => {
    const { text } = buildRewardEmail({ ...input, percent: 30, count: 3, next: null })
    expect(text).toContain('unlocked every reward')
    expect(text).toContain('3 friends have')
  })

  it("escapes the subscriber's name and never mentions who they referred", () => {
    const { html } = buildRewardEmail({ ...input, firstName: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>')
    expect(html).not.toMatch(/@example\.com/)
  })
})

describe('referral block in the welcome emails', () => {
  const link = 'https://www.listentruecrime.com/subscribe?ref=ANNREF'

  it('shows the personal link once the shop is open, worded from the tier config', () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'
    expect(referralRewardSummary()).toBe('1 confirmed friend = 20% off, 3 confirmed friends = 30% off')
    for (const html of [buildWelcomeEmailHtml('Sam', link), buildLeadMagnetHtml([], link)]) {
      expect(html).toContain(link)
      expect(html).toContain('Know a true crime fan?')
    }
  })

  it('is left out while the shop is switched off, or when there is no link', () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'false'
    expect(referralPromoRowHtml(link)).toBe('')
    expect(buildWelcomeEmailHtml('Sam', link)).not.toContain('ref=ANNREF')
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'
    expect(referralPromoRowHtml(null)).toBe('')
    expect(buildWelcomeEmailHtml('Sam')).not.toContain('Know a true crime fan?')
  })
})
