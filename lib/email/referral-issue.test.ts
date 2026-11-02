import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderNewsletterHtml, renderNewsletterPlainText } from '@/lib/newsletter/render'
import { REFERRAL_LINK_TAG, withReferralBlock } from './referral-promo'
import { sendNewsletterCampaign } from './newsletter-campaign'

const original = { shop: process.env.NEXT_PUBLIC_SHOP_ENABLED, sg: process.env.SENDGRID_API_KEY, rs: process.env.RESEND_API_KEY }
const restore = (k: string, v?: string) => (v === undefined ? delete process.env[k] : (process.env[k] = v))
afterEach(() => { restore('NEXT_PUBLIC_SHOP_ENABLED', original.shop); restore('SENDGRID_API_KEY', original.sg); restore('RESEND_API_KEY', original.rs); vi.unstubAllGlobals() })

const input: any = { title: 'Issue 7', editorsNote: null, body: 'Hello', conclusion: null, items: [{ position: 1, title: 'Show', blurb: 'Great', slug: 'show' }], intro: null }
const issue = () => ({ id: 'n1', title: 'Issue 7', html_content: renderNewsletterHtml(input), plain_text_content: renderNewsletterPlainText(input) })

describe('referral link in the weekly issue', () => {
  it('is added before the footer when the shop is open, and the footer/unsubscribe are untouched', () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'
    const out = withReferralBlock(issue())
    const html = out.html_content as string
    expect(html).toContain(REFERRAL_LINK_TAG)
    expect(html.indexOf('Know a true crime fan?')).toBeLessThan(html.indexOf('%asm_group_unsubscribe_raw_url%'))
    expect(html).toContain('%asm_group_unsubscribe_raw_url%')
    expect(out.plain_text_content).toContain(`link: ${REFERRAL_LINK_TAG}`)
  })

  it('changes nothing while the shop is off, or if the footer layout is not recognised', () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'false'
    expect(withReferralBlock(issue())).toEqual(issue())
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'
    const odd = { id: 'x', title: 'x', html_content: '<html>no footer</html>', plain_text_content: null }
    expect(withReferralBlock(odd)).toBe(odd)
  })

  it('SendGrid: each subscriber gets their own link as a per-recipient substitution', async () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'; process.env.SENDGRID_API_KEY = 'SG.test'; delete process.env.RESEND_API_KEY
    const fetchMock = vi.fn(async () => new Response('', { status: 202, headers: { 'x-message-id': 'm1' } }))
    vi.stubGlobal('fetch', fetchMock)
    await sendNewsletterCampaign(issue() as any, [{ email: 'a@x.com', referral_code: 'AAAAAA' }, { email: 'b@x.com', referral_code: 'BBBBBB' }])
    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body)
    expect(body.personalizations.map((p: any) => p.substitutions[REFERRAL_LINK_TAG])).toEqual([
      expect.stringMatching(/\/subscribe\?ref=AAAAAA$/), expect.stringMatching(/\/subscribe\?ref=BBBBBB$/),
    ])
  })

  it('Resend: the placeholder is replaced per recipient and never reaches an inbox', async () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'; process.env.RESEND_API_KEY = 're_test'; delete process.env.SENDGRID_API_KEY
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'r1' }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await sendNewsletterCampaign(issue() as any, [{ email: 'a@x.com', referral_code: 'AAAAAA' }, { email: 'b@x.com', referral_code: 'BBBBBB' }])
    const mails = JSON.parse((fetchMock.mock.calls[0] as any)[1].body)
    expect(mails[0].html).toContain('ref=AAAAAA'); expect(mails[1].html).toContain('ref=BBBBBB')
    expect(mails[0].html).not.toContain('ref=BBBBBB')
    for (const m of mails) { expect(m.html).not.toContain(REFERRAL_LINK_TAG); expect(m.text).not.toContain(REFERRAL_LINK_TAG) }
  })

  it('with the shop off the send payload is exactly as before (no substitutions)', async () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'false'; process.env.SENDGRID_API_KEY = 'SG.test'
    const fetchMock = vi.fn(async () => new Response('', { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    await sendNewsletterCampaign(issue() as any, [{ email: 'a@x.com', referral_code: 'AAAAAA' }])
    expect(JSON.parse((fetchMock.mock.calls[0] as any)[1].body).personalizations).toEqual([{ to: [{ email: 'a@x.com' }] }])
  })
})
