import { beforeEach, describe, expect, it } from 'vitest'
import { createFakeDb } from '@/lib/shop/test-utils/fake-supabase'
import { createCampaign, createPublicCode, issueUniqueCodes, resolveIssuePercent } from './campaigns'
import { DiscountError, type CampaignRow } from './types'

const NOW = new Date('2026-11-02T12:00:00Z')
let db: ReturnType<typeof createFakeDb>
const admin = () => db.client as any
beforeEach(() => { db = createFakeDb() })

const valid = { prefix: 'bf26', name: 'Black Friday 2026', type: 'public' as const, discountPercent: 25, expiresAt: '2026-12-01T00:00:00Z' }

describe('createCampaign: no code changes needed for a new campaign', () => {
  it('creates a campaign from prefix, %, type and expiry, normalising the prefix', async () => {
    const c = await createCampaign(admin(), valid, NOW)
    expect(c).toMatchObject({ prefix: 'BF26-', type: 'public', discount_percent: 25, is_active: true })
    expect(c.expires_at).toBe('2026-12-01T00:00:00.000Z')
  })

  it('refuses a discount above the system-wide maximum', async () => {
    await expect(createCampaign(admin(), { ...valid, discountPercent: 31 }, NOW)).rejects.toThrow(/more than 30%/)
    expect(db.tables.discount_campaigns ?? []).toHaveLength(0)
  })

  it('refuses a campaign with no expiry at all (every code must expire)', async () => {
    await expect(createCampaign(admin(), { ...valid, expiresAt: null }, NOW)).rejects.toThrow(/expiry/)
  })

  it('accepts a rolling lifetime instead of a fixed end date', async () => {
    const c = await createCampaign(admin(), { ...valid, prefix: 'LOYAL', type: 'unique', expiresAt: null, codeValidDays: 60 }, NOW)
    expect(c).toMatchObject({ prefix: 'LOYAL-', code_valid_days: 60, expires_at: null })
  })

  it('refuses bad prefixes, past end dates, duplicate prefixes and multi-use unique codes', async () => {
    await expect(createCampaign(admin(), { ...valid, prefix: '26' }, NOW)).rejects.toThrow(/Prefix/)
    await expect(createCampaign(admin(), { ...valid, expiresAt: '2026-01-01T00:00:00Z' }, NOW)).rejects.toThrow(/past/)
    await expect(createCampaign(admin(), { ...valid, type: 'unique', maxUsesPerCode: 5 }, NOW)).rejects.toThrow(/single-use/)
    await createCampaign(admin(), valid, NOW)
    await expect(createCampaign(admin(), valid, NOW)).rejects.toThrow(/already exists/)
  })

  it('honours a lowered maximum from the environment', async () => {
    process.env.DISCOUNT_MAX_PERCENT = '20'
    try {
      await expect(createCampaign(admin(), valid, NOW)).rejects.toThrow(/more than 20%/)
    } finally { delete process.env.DISCOUNT_MAX_PERCENT }
  })
})

describe('issueUniqueCodes', () => {
  const campaign = (o: Partial<CampaignRow> = {}) => ({
    id: 'c1', prefix: 'WELCOME-', type: 'unique', discount_percent: 10, starts_at: null, expires_at: null, code_valid_days: 30, max_uses_per_code: null, is_active: true, ...o,
  }) as CampaignRow

  it('issues N distinct single-use codes with the prefix and an expiry', async () => {
    const codes = await issueUniqueCodes(admin(), campaign(), 25, { now: NOW })
    expect(codes).toHaveLength(25)
    expect(new Set(codes.map(c => c.code)).size).toBe(25)
    for (const c of codes) {
      expect(c.code).toMatch(/^WELCOME-[A-Z2-9]{8}$/)
      expect(c).toMatchObject({ max_uses: 1, use_count: 0, discount_percent: 10, is_active: true })
      expect(c.expires_at).toBe('2026-12-02T12:00:00.000Z')
    }
  })

  it('caps the percentage at the system maximum even if asked for more', async () => {
    expect(resolveIssuePercent({ discount_percent: 20 }, 99)).toBe(30)
    const [c] = await issueUniqueCodes(admin(), campaign({ discount_percent: 30 }), 1, { percent: 80, now: NOW })
    expect(c.discount_percent).toBe(30)
  })

  it('is idempotent per subscriber + tier: asking twice creates one code', async () => {
    const opts = { ownerSubscriberId: 's1', rewardTier: 1, now: NOW }
    expect(await issueUniqueCodes(admin(), campaign(), 1, opts)).toHaveLength(1)
    expect(await issueUniqueCodes(admin(), campaign(), 1, opts)).toHaveLength(0)
    expect(db.tables.discount_codes).toHaveLength(1)
    // a different tier is a different reward
    expect(await issueUniqueCodes(admin(), campaign(), 1, { ...opts, rewardTier: 3 })).toHaveLength(1)
  })

  it('refuses unreasonable batch sizes, public campaigns and ended campaigns', async () => {
    await expect(issueUniqueCodes(admin(), campaign(), 0, { now: NOW })).rejects.toBeInstanceOf(DiscountError)
    await expect(issueUniqueCodes(admin(), campaign(), 201, { now: NOW })).rejects.toThrow(/between 1 and 200/)
    await expect(issueUniqueCodes(admin(), campaign({ type: 'public' }), 1, { now: NOW })).rejects.toThrow(/unique campaigns/)
    await expect(issueUniqueCodes(admin(), campaign({ code_valid_days: null, expires_at: '2026-10-01T00:00:00Z' }), 1, { now: NOW })).rejects.toThrow(/already ended/)
  })

  it("never lets a code outlive its campaign's end date", async () => {
    const [c] = await issueUniqueCodes(admin(), campaign({ expires_at: '2026-11-10T00:00:00Z', code_valid_days: 60 }), 1, { now: NOW })
    expect(c.expires_at).toBe('2026-11-10T00:00:00.000Z')
  })
})

describe('createPublicCode', () => {
  const pub = (o: Partial<CampaignRow> = {}) => ({
    id: 'c2', prefix: 'BF26-', type: 'public', discount_percent: 30, starts_at: null, expires_at: '2026-12-01T00:00:00Z', code_valid_days: null, max_uses_per_code: null, is_active: true, ...o,
  }) as CampaignRow

  it('creates one shared, unlimited-use code with the campaign expiry', async () => {
    const c = await createPublicCode(admin(), pub(), 'blackfriday', NOW)
    expect(c).toMatchObject({ code: 'BF26-BLACKFRIDAY', max_uses: null, discount_percent: 30, expires_at: '2026-12-01T00:00:00.000Z' })
  })
  it('can generate a random ending and carry a usage cap', async () => {
    const c = await createPublicCode(admin(), pub({ max_uses_per_code: 100 }), undefined, NOW)
    expect(c.code).toMatch(/^BF26-[A-Z2-9]{6}$/)
    expect(c.max_uses).toBe(100)
  })
  it('refuses duplicates, bad endings and unique campaigns', async () => {
    await createPublicCode(admin(), pub(), 'SAVE', NOW)
    await expect(createPublicCode(admin(), pub(), 'save', NOW)).rejects.toThrow(/already exists/)
    await expect(createPublicCode(admin(), pub(), 'no spaces', NOW)).rejects.toThrow(/letters, digits/)
    await expect(createPublicCode(admin(), pub({ type: 'unique' }), 'X1', NOW)).rejects.toThrow(/public campaigns/)
  })
})
