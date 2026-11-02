import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeDb } from '@/lib/shop/test-utils/fake-supabase'
import { hashToken } from '@/lib/newsletter/optin'

// Sign-up → confirm → reward, through the real routes. Only email delivery is mocked.

const db = vi.hoisted(() => ({ current: null as any }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => db.current.client }))

import { createHash } from 'crypto'
/** A distinct 64-hex confirmation token per subscriber, like the real random ones. */
const tokenFor = (email: string) => createHash('sha256').update(email).digest('hex')
const mail = vi.hoisted(() => ({
  issueConfirmation: vi.fn(),
  activateSubscriber: vi.fn(async (..._a: any[]) => {}),
  sendRewardEmail: vi.fn(async (..._a: any[]) => {}),
}))
vi.mock('@/lib/newsletter/confirmation', () => ({ issueConfirmation: mail.issueConfirmation }))
vi.mock('@/lib/newsletter/activate', () => ({ activateSubscriber: mail.activateSubscriber }))
vi.mock('@/lib/email/referral-reward', () => ({ sendRewardEmail: mail.sendRewardEmail }))

import { POST as signup } from './route'
import { GET as confirm } from './confirm/route'
import { GET as validate } from '../referrals/validate/route'

const tbl = (n: string): any[] => db.current.tables[n] ?? []
const subscribers = () => tbl('newsletter_subscribers')
const byEmail = (email: string) => subscribers().find(s => s.email === email)

const signUp = (email: string, ref?: string, ip = '203.0.113.7') =>
  signup(new Request('http://localhost/api/newsletter', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email, consent: true, source: 'subscribe_page', ref }),
  }))

// Confirms the pending subscriber `email` by "clicking" their emailed link.
async function clickConfirmLink(email: string) {
  const row = byEmail(email)
  row.confirm_token_hash = hashToken(tokenFor(email))
  row.confirm_sent_at = new Date().toISOString()
  return confirm(new Request(`http://localhost/api/newsletter/confirm?token=${tokenFor(email)}`))
}

let REF: string // Ann's referral code

beforeEach(() => {
  db.current = createFakeDb()
  vi.clearAllMocks()
  mail.issueConfirmation.mockImplementation(async () => true)
  db.current.tables.newsletter_subscribers = [
    { id: 'ann', email: 'ann@example.com', first_name: 'Ann', status: 'active', referral_code: 'ANNREF', consent_ip_hash: 'ann-ip' },
  ]
  REF = 'ANNREF'
  db.current.tables.referrals = []
  db.current.tables.discount_campaigns = [{ id: 'c_ref', prefix: 'REF-', type: 'unique', discount_percent: 20, code_valid_days: 60, is_active: true }]
  db.current.tables.discount_codes = []
})

describe('sign-up with a referral code', () => {
  it('a brand-new subscriber gets their own referral code and a pending referral', async () => {
    const res = await signUp('bob@example.com', REF)
    expect(await res.json()).toEqual({ ok: true, confirmation_required: true })
    expect(byEmail('bob@example.com')).toMatchObject({ status: 'pending' })
    expect(byEmail('bob@example.com').referral_code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/)
    expect(tbl('referrals')).toEqual([expect.objectContaining({ referrer_id: 'ann', referred_id: byEmail('bob@example.com').id, status: 'pending' })])
  })

  it('every subscriber has a different code', async () => {
    await signUp('b@example.com', REF); await signUp('c@example.com', REF, '198.51.100.1'); await signUp('d@example.com')
    const codes = subscribers().map(s => s.referral_code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('works with the code typed in lower case', async () => {
    await signUp('bob@example.com', ' annref ')
    expect(tbl('referrals')).toHaveLength(1)
  })

  it('an address already in the database is never "referred" (active, pending or unsubscribed)', async () => {
    db.current.tables.newsletter_subscribers.push(
      { id: 'act', email: 'active@example.com', status: 'active', referral_code: 'ACTIVE', consent_ip_hash: 'x' },
      { id: 'pen', email: 'pending@example.com', status: 'pending', referral_code: 'PENDNG', consent_ip_hash: 'y', confirm_sent_at: new Date().toISOString() },
      { id: 'uns', email: 'gone@example.com', status: 'unsubscribed', referral_code: 'GONE22', consent_ip_hash: 'z' },
    )
    for (const email of ['active@example.com', 'pending@example.com', 'gone@example.com', 'ACTIVE@example.com']) {
      expect((await signUp(email, REF)).status).toBe(200)
    }
    expect(tbl('referrals')).toHaveLength(0)
    expect(subscribers()).toHaveLength(4) // nobody added
    expect(byEmail('gone@example.com').status).toBe('unsubscribed') // and nobody reactivated
  })

  it('a self-referral with a second address is ignored, but the sign-up itself still works', async () => {
    const res = await signUp('ann+second@example.com', REF)
    expect(res.status).toBe(200)
    expect(byEmail('ann+second@example.com')).toBeTruthy()
    expect(tbl('referrals')).toHaveLength(0)
  })

  it('an unknown code is ignored without changing the response (the form cannot be used to probe codes)', async () => {
    const good = await (await signUp('b1@example.com', REF)).json()
    const bad = await (await signUp('b2@example.com', 'ZZZZZZ', '198.51.100.2')).json()
    const none = await (await signUp('b3@example.com', undefined, '198.51.100.3')).json()
    expect(bad).toEqual(good)
    expect(none).toEqual(good)
    expect(tbl('referrals')).toHaveLength(1)
  })

  it('stores nothing about anyone who has not signed up themselves: only the new subscriber and code links', async () => {
    await signUp('bob@example.com', REF)
    expect(subscribers().map(s => s.email).sort()).toEqual(['ann@example.com', 'bob@example.com'])
    expect(Object.keys(tbl('referrals')[0]).sort()).toEqual(['confirmed_at', 'created_at', 'id', 'referred_id', 'referrer_id', 'status'])
  })
})

describe('confirming the subscription', () => {
  it('counts the referral only after the new subscriber confirms, and not for an expired link', async () => {
    await signUp('bob@example.com', REF)
    expect(tbl('referrals')[0].status).toBe('pending')
    expect(tbl('discount_codes')).toHaveLength(0)

    byEmail('bob@example.com').confirm_token_hash = hashToken(tokenFor('bob@example.com'))
    byEmail('bob@example.com').confirm_sent_at = new Date(Date.now() - 8 * 86400_000).toISOString() // 8 days: expired
    const expired = await confirm(new Request(`http://localhost/api/newsletter/confirm?token=${tokenFor('bob@example.com')}`))
    expect(expired.headers.get('location')).toContain('status=expired')
    expect(tbl('referrals')[0].status).toBe('pending')
    expect(tbl('discount_codes')).toHaveLength(0)

    const ok = await clickConfirmLink('bob@example.com')
    expect(ok.headers.get('location')).toContain('status=ok')
    expect(tbl('referrals')[0]).toMatchObject({ status: 'confirmed' })
  })

  it("redirects a confirmed subscriber to the page with their own share code", async () => {
    await signUp('bob@example.com', REF)
    const res = await clickConfirmLink('bob@example.com')
    expect(res.headers.get('location')).toContain(`code=${byEmail('bob@example.com').referral_code}`)
  })

  it('clicking the confirm link twice does not count twice', async () => {
    await signUp('bob@example.com', REF)
    await clickConfirmLink('bob@example.com')
    await clickConfirmLink('bob@example.com')
    expect(tbl('referrals').filter(r => r.status === 'confirmed')).toHaveLength(1)
    expect(tbl('discount_codes')).toHaveLength(1)
    expect(mail.sendRewardEmail).toHaveBeenCalledTimes(1)
  })

  it('full journey: 1 confirmed referral → 20% code; 3 → a second, 30% code', async () => {
    for (const [i, name] of Array.from(['b1', 'b2', 'b3'].entries())) {
      await signUp(`${name}@example.com`, REF, `198.51.100.${i + 10}`)
      await clickConfirmLink(`${name}@example.com`)
      if (i === 0) expect(tbl('discount_codes').map(c => c.discount_percent)).toEqual([20])
      if (i === 1) expect(tbl('discount_codes')).toHaveLength(1)
    }
    expect(tbl('discount_codes').map(c => c.discount_percent).sort()).toEqual([20, 30])
    for (const c of tbl('discount_codes')) {
      expect(c).toMatchObject({ owner_subscriber_id: 'ann', max_uses: 1 })
      expect(c.code).toMatch(/^REF-/)
    }
    expect(mail.sendRewardEmail).toHaveBeenCalledTimes(2)
    expect(mail.sendRewardEmail.mock.calls.every(c => c[0].to === 'ann@example.com')).toBe(true) // the referrer, never the friend
  })

  it('a subscriber who confirms without a referral earns the referrer nothing', async () => {
    await signUp('solo@example.com')
    await clickConfirmLink('solo@example.com')
    expect(tbl('discount_codes')).toHaveLength(0)
  })
})

describe('GET /api/referrals/validate', () => {
  const check = async (code: string) => (await validate(new Request(`http://localhost/api/referrals/validate?code=${code}`))).json()
  it('says yes for a live code and no otherwise, revealing nothing else', async () => {
    expect(await check('annref')).toEqual({ valid: true })
    expect(await check('NOPE22')).toEqual({ valid: false })
    expect(await check('x')).toEqual({ valid: false })
  })
  it('says no for the code of someone who has unsubscribed', async () => {
    byEmail('ann@example.com').status = 'unsubscribed'
    expect(await check('ANNREF')).toEqual({ valid: false })
  })
})
