import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeDb } from '@/lib/shop/test-utils/fake-supabase'

const mail = vi.hoisted(() => ({ sendRewardEmail: vi.fn(async (..._a: any[]) => {}) }))
vi.mock('@/lib/email/referral-reward', () => mail)

import { confirmedReferralCount, creditReferral, registerReferral } from './service'

let db: ReturnType<typeof createFakeDb>
const admin = () => db.client as any
const tbl = (n: string): any[] => db.tables[n] ?? []
const NOW = new Date('2026-11-02T12:00:00Z')

function sub(id: string, o: Record<string, any> = {}) {
  const row = { id, email: `${id}@example.com`, first_name: id, status: 'active', referral_code: id.toUpperCase().padEnd(6, '2').slice(0, 6).replace(/[0O1IL]/g, '2'), consent_ip_hash: `ip-${id}`, ...o }
  db.tables.newsletter_subscribers.push(row)
  return row
}

beforeEach(() => {
  db = createFakeDb()
  vi.clearAllMocks()
  delete process.env.DISCOUNT_MAX_PERCENT
  db.tables.newsletter_subscribers = []
  db.tables.referrals = []
  db.tables.discount_campaigns = [{ id: 'c_ref', prefix: 'REF-', type: 'unique', discount_percent: 20, code_valid_days: 60, expires_at: null, starts_at: null, is_active: true }]
  db.tables.discount_codes = []
})

// Sign up `n` brand-new, pending subscribers who name `referrer`'s code.
async function referNew(referrer: any, ids: string[], opts: { confirm?: boolean } = {}) {
  for (const id of ids) {
    const s = sub(id, { status: 'pending' })
    expect(await registerReferral(admin(), { referredId: s.id, referredEmail: s.email, referredIpHash: s.consent_ip_hash, refCode: referrer.referral_code })).toBe('registered')
    if (opts.confirm) {
      s.status = 'active'
      await creditReferral(admin(), s.id, NOW)
    }
  }
}

describe('registering a referral at sign-up', () => {
  it('records a pending referral for a new subscriber, but does not count it yet', async () => {
    const ann = sub('ann')
    await referNew(ann, ['bob'])
    expect(tbl('referrals')).toEqual([expect.objectContaining({ referrer_id: 'ann', referred_id: 'bob', status: 'pending' })])
    expect(await confirmedReferralCount(admin(), 'ann')).toBe(0)
    expect(tbl('discount_codes')).toHaveLength(0)
  })

  it('accepts the code typed in lower case with spaces', async () => {
    const ann = sub('ann')
    const bob = sub('bob', { status: 'pending' })
    const typed = ` ${ann.referral_code.toLowerCase()} `
    expect(await registerReferral(admin(), { referredId: bob.id, referredEmail: bob.email, referredIpHash: 'x', refCode: typed })).toBe('registered')
  })

  it('ignores unknown, malformed and empty codes without error', async () => {
    const bob = sub('bob', { status: 'pending' })
    const input = { referredId: bob.id, referredEmail: bob.email, referredIpHash: 'x' }
    expect(await registerReferral(admin(), { ...input, refCode: 'ZZZZZZ' })).toBe('unknown_code')
    expect(await registerReferral(admin(), { ...input, refCode: 'nope' })).toBe('unknown_code')
    expect(await registerReferral(admin(), { ...input, refCode: '' })).toBe('no_code')
    expect(await registerReferral(admin(), { ...input, refCode: undefined })).toBe('no_code')
    expect(tbl('referrals')).toHaveLength(0)
  })

  it('does not let a subscriber refer themselves, however the address is spelled', async () => {
    const ann = sub('ann', { email: 'ann@example.com' })
    for (const [i, email] of Array.from(['ann@example.com', 'Ann@Example.com', 'ann+me@example.com'].entries())) {
      const dup = sub(`dup${i}`, { status: 'pending', email })
      expect(await registerReferral(admin(), { referredId: dup.id, referredEmail: email, referredIpHash: 'other-ip', refCode: ann.referral_code })).toBe('self_referral')
    }
    // and the same row can't refer itself either
    expect(await registerReferral(admin(), { referredId: 'ann', referredEmail: 'x@y.com', referredIpHash: 'q', refCode: ann.referral_code })).toBe('self_referral')
    expect(tbl('referrals')).toHaveLength(0)
  })

  it('refuses a "friend" who signed up from the same connection as the referrer', async () => {
    const ann = sub('ann', { consent_ip_hash: 'shared-ip' })
    const bob = sub('bob', { status: 'pending' })
    expect(await registerReferral(admin(), { referredId: bob.id, referredEmail: bob.email, referredIpHash: 'shared-ip', refCode: ann.referral_code })).toBe('same_ip')
    expect(tbl('referrals')).toHaveLength(0)
  })

  it('only active subscribers can refer: a pending or unsubscribed code earns nothing', async () => {
    const pending = sub('pen', { status: 'pending' })
    const gone = sub('gon', { status: 'unsubscribed' })
    const bob = sub('bob', { status: 'pending' })
    for (const r of [pending, gone]) {
      expect(await registerReferral(admin(), { referredId: bob.id, referredEmail: bob.email, referredIpHash: 'x', refCode: r.referral_code })).toBe('referrer_inactive')
    }
    expect(tbl('referrals')).toHaveLength(0)
  })

  it('each new subscriber can credit only ONE referrer', async () => {
    const ann = sub('ann'), cat = sub('cat')
    const bob = sub('bob', { status: 'pending' })
    const call = (ref: string) => registerReferral(admin(), { referredId: bob.id, referredEmail: bob.email, referredIpHash: 'x', refCode: ref })
    expect(await call(ann.referral_code)).toBe('registered')
    expect(await call(cat.referral_code)).toBe('already_referred')
    expect(tbl('referrals')).toHaveLength(1)
    expect(tbl('referrals')[0].referrer_id).toBe('ann')
  })
})

describe('counting a referral: only once the new subscriber confirms', () => {
  it('counts when they confirm, once, no matter how often the confirm link is hit', async () => {
    const ann = sub('ann')
    await referNew(ann, ['bob'])
    expect(await confirmedReferralCount(admin(), 'ann')).toBe(0)

    expect(await creditReferral(admin(), 'bob', NOW)).toMatchObject({ credited: true, count: 1 })
    expect(await creditReferral(admin(), 'bob', NOW)).toMatchObject({ credited: false })
    await Promise.all([creditReferral(admin(), 'bob', NOW), creditReferral(admin(), 'bob', NOW)])
    expect(await confirmedReferralCount(admin(), 'ann')).toBe(1)
    expect(tbl('discount_codes')).toHaveLength(1)
  })

  it('a subscriber who was never referred credits nobody', async () => {
    sub('dan')
    expect(await creditReferral(admin(), 'dan', NOW)).toEqual({ credited: false, count: 0, issued: 0 })
  })

  it('tracks counts per subscriber', async () => {
    const ann = sub('ann'), cat = sub('cat')
    await referNew(ann, ['b1', 'b2'], { confirm: true })
    await referNew(cat, ['b3'], { confirm: true })
    await referNew(ann, ['b4']) // pending, not counted
    expect(await confirmedReferralCount(admin(), 'ann')).toBe(2)
    expect(await confirmedReferralCount(admin(), 'cat')).toBe(1)
  })

  it('does not count if the referrer has since unsubscribed, and emails them nothing', async () => {
    const ann = sub('ann')
    await referNew(ann, ['bob'])
    ann.status = 'unsubscribed'
    expect(await creditReferral(admin(), 'bob', NOW)).toMatchObject({ credited: true, count: 1, issued: 0 })
    expect(tbl('discount_codes')).toHaveLength(0)
    expect(mail.sendRewardEmail).not.toHaveBeenCalled()
  })
})

describe('tiered rewards', () => {
  it('1st confirmed referral → one unique single-use 20% code, valid 60 days, emailed to the referrer', async () => {
    const ann = sub('ann')
    await referNew(ann, ['b1'], { confirm: true })

    const codes = tbl('discount_codes')
    expect(codes).toHaveLength(1)
    expect(codes[0]).toMatchObject({ discount_percent: 20, max_uses: 1, use_count: 0, owner_subscriber_id: 'ann', reward_tier: 1, campaign_id: 'c_ref' })
    expect(codes[0].code).toMatch(/^REF-[A-HJKMNP-Z2-9]{8}$/)
    expect(codes[0].expires_at).toBe(new Date(NOW.getTime() + 60 * 86400_000).toISOString()) // 60 days

    expect(mail.sendRewardEmail).toHaveBeenCalledTimes(1)
    expect(mail.sendRewardEmail.mock.calls[0][0]).toMatchObject({ to: 'ann@example.com', code: codes[0].code, percent: 20, count: 1, next: { referrals: 3, percent: 30 } })
    expect(codes[0].email_sent_at).not.toBeNull()
  })

  it('the 2nd referral earns nothing new; the 3rd earns a second, unique 30% code', async () => {
    const ann = sub('ann')
    await referNew(ann, ['b1'], { confirm: true })
    await referNew(ann, ['b2'], { confirm: true })
    expect(tbl('discount_codes')).toHaveLength(1)
    expect(mail.sendRewardEmail).toHaveBeenCalledTimes(1)

    await referNew(ann, ['b3'], { confirm: true })
    const codes = tbl('discount_codes')
    expect(codes.map(c => [c.reward_tier, c.discount_percent]).sort()).toEqual([[1, 20], [3, 30]])
    expect(new Set(codes.map(c => c.code)).size).toBe(2)
    expect(mail.sendRewardEmail).toHaveBeenCalledTimes(2)
    expect(mail.sendRewardEmail.mock.calls[1][0]).toMatchObject({ percent: 30, count: 3, next: null })
  })

  it('further referrals past the top tier add no more codes', async () => {
    const ann = sub('ann')
    await referNew(ann, ['b1', 'b2', 'b3', 'b4', 'b5'], { confirm: true })
    expect(tbl('discount_codes')).toHaveLength(2)
    expect(await confirmedReferralCount(admin(), 'ann')).toBe(5)
  })

  it('never issues the same tier twice, even if a reward run is repeated', async () => {
    const ann = sub('ann')
    await referNew(ann, ['b1'], { confirm: true })
    const { issueRewards } = await import('./service')
    expect(await issueRewards(admin(), 'ann', 1, NOW)).toBe(0)
    expect(await issueRewards(admin(), 'ann', 1, NOW)).toBe(0)
    expect(tbl('discount_codes')).toHaveLength(1)
    expect(mail.sendRewardEmail).toHaveBeenCalledTimes(1)
  })

  it('catches up a missed tier: reaching 3 when tier 1 was never issued issues both', async () => {
    const ann = sub('ann')
    const { issueRewards } = await import('./service')
    expect(await issueRewards(admin(), 'ann', 3, NOW)).toBe(2)
    expect(tbl('discount_codes').map(c => c.discount_percent).sort()).toEqual([20, 30])
  })

  it('the thank-you code never exceeds the system maximum, even if the tier says more', async () => {
    process.env.DISCOUNT_MAX_PERCENT = '25'
    const ann = sub('ann')
    await referNew(ann, ['b1', 'b2', 'b3'], { confirm: true })
    expect(tbl('discount_codes').map(c => c.discount_percent).sort()).toEqual([20, 25])
  })

  it('a failed email is retried next time instead of being lost or double-sent', async () => {
    mail.sendRewardEmail.mockRejectedValueOnce(new Error('provider down'))
    const ann = sub('ann')
    await referNew(ann, ['b1'], { confirm: true })
    expect(tbl('discount_codes')[0].email_sent_at).toBeNull() // claim released

    const { issueRewards } = await import('./service')
    await issueRewards(admin(), 'ann', 1, NOW)
    expect(mail.sendRewardEmail).toHaveBeenCalledTimes(2)
    expect(tbl('discount_codes')[0].email_sent_at).not.toBeNull()
    await issueRewards(admin(), 'ann', 1, NOW)
    expect(mail.sendRewardEmail).toHaveBeenCalledTimes(2) // sent now; not again
  })

  it('does nothing if the REF- campaign has been switched off', async () => {
    db.tables.discount_campaigns[0].is_active = false
    const ann = sub('ann')
    await referNew(ann, ['b1'], { confirm: true })
    expect(tbl('discount_codes')).toHaveLength(0)
    expect(await confirmedReferralCount(admin(), 'ann')).toBe(1) // still counted
  })

  it('recreates the REF- campaign if it was deleted', async () => {
    db.tables.discount_campaigns = []
    const ann = sub('ann')
    await referNew(ann, ['b1'], { confirm: true })
    expect(tbl('discount_campaigns')[0]).toMatchObject({ prefix: 'REF-', type: 'unique', code_valid_days: 60 })
    expect(tbl('discount_codes')).toHaveLength(1)
  })
})
