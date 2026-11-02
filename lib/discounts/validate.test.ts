import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeDb } from '@/lib/shop/test-utils/fake-supabase'
import { evaluateCode, validateDiscountCode } from './validate'
import { MAX_DISCOUNT_PERCENT } from './config'

const NOW = new Date('2026-11-02T12:00:00Z')
const code = (o: Partial<Parameters<typeof evaluateCode>[0] & object> = {}) => ({
  is_active: true, starts_at: null, expires_at: '2026-12-01T00:00:00Z', max_uses: 1, use_count: 0, discount_percent: 20, ...o,
})
const campaign = (o = {}) => ({ is_active: true, starts_at: null, expires_at: null, ...o })

describe('evaluateCode', () => {
  it('accepts a valid code and returns its percent', () => {
    expect(evaluateCode(code(), campaign(), NOW)).toEqual({ ok: true, percent: 20 })
  })
  it('rejects unknown codes', () => {
    expect(evaluateCode(null, null, NOW)).toEqual({ ok: false, reason: 'not_found' })
    expect(evaluateCode(code(), null, NOW)).toEqual({ ok: false, reason: 'not_found' })
  })
  it('rejects expired codes, including at the exact expiry moment', () => {
    expect(evaluateCode(code({ expires_at: '2026-11-01T00:00:00Z' }), campaign(), NOW)).toEqual({ ok: false, reason: 'expired' })
    expect(evaluateCode(code({ expires_at: NOW.toISOString() }), campaign(), NOW)).toEqual({ ok: false, reason: 'expired' })
    expect(evaluateCode(code({ expires_at: '2026-11-02T12:00:01Z' }), campaign(), NOW).ok).toBe(true)
  })
  it("also honours the campaign's own end date when it is earlier than the code's", () => {
    expect(evaluateCode(code(), campaign({ expires_at: '2026-11-02T00:00:00Z' }), NOW)).toEqual({ ok: false, reason: 'expired' })
  })
  it('rejects a single-use code that has been used, but not a fresh one', () => {
    expect(evaluateCode(code({ max_uses: 1, use_count: 1 }), campaign(), NOW)).toEqual({ ok: false, reason: 'used' })
    expect(evaluateCode(code({ max_uses: 1, use_count: 0 }), campaign(), NOW).ok).toBe(true)
  })
  it('lets an unlimited public code be used any number of times', () => {
    expect(evaluateCode(code({ max_uses: null, use_count: 99999 }), campaign(), NOW).ok).toBe(true)
  })
  it('stops a capped public code at its cap', () => {
    expect(evaluateCode(code({ max_uses: 100, use_count: 99 }), campaign(), NOW).ok).toBe(true)
    expect(evaluateCode(code({ max_uses: 100, use_count: 100 }), campaign(), NOW)).toEqual({ ok: false, reason: 'used' })
  })
  it('rejects deactivated codes and campaigns', () => {
    expect(evaluateCode(code({ is_active: false }), campaign(), NOW)).toEqual({ ok: false, reason: 'inactive' })
    expect(evaluateCode(code(), campaign({ is_active: false }), NOW)).toEqual({ ok: false, reason: 'inactive' })
  })
  it('rejects codes that have not started yet', () => {
    expect(evaluateCode(code({ starts_at: '2026-11-27T00:00:00Z' }), campaign(), NOW)).toEqual({ ok: false, reason: 'not_started' })
    expect(evaluateCode(code(), campaign({ starts_at: '2026-11-27T00:00:00Z' }), NOW)).toEqual({ ok: false, reason: 'not_started' })
  })

  describe('maximum discount', () => {
    it(`the default cap is ${MAX_DISCOUNT_PERCENT}%`, () => {
      expect(MAX_DISCOUNT_PERCENT).toBe(30)
      expect(evaluateCode(code({ discount_percent: 30 }), campaign(), NOW).ok).toBe(true)
      expect(evaluateCode(code({ discount_percent: 31 }), campaign(), NOW)).toEqual({ ok: false, reason: 'over_max' })
      expect(evaluateCode(code({ discount_percent: 100 }), campaign(), NOW)).toEqual({ ok: false, reason: 'over_max' })
    })
    it('lowering the cap immediately applies to codes already issued', () => {
      expect(evaluateCode(code({ discount_percent: 30 }), campaign(), NOW, 25)).toEqual({ ok: false, reason: 'over_max' })
      expect(evaluateCode(code({ discount_percent: 20 }), campaign(), NOW, 25).ok).toBe(true)
    })
    it('DISCOUNT_MAX_PERCENT overrides the default in one place', () => {
      vi.stubEnv('DISCOUNT_MAX_PERCENT', '15')
      expect(evaluateCode(code({ discount_percent: 20 }), campaign(), NOW)).toEqual({ ok: false, reason: 'over_max' })
      vi.stubEnv('DISCOUNT_MAX_PERCENT', 'not-a-number')
      expect(evaluateCode(code({ discount_percent: 30 }), campaign(), NOW).ok).toBe(true) // falls back to 30
      vi.unstubAllEnvs()
    })
    it('refuses nonsense percentages', () => {
      expect(evaluateCode(code({ discount_percent: 0 }), campaign(), NOW)).toEqual({ ok: false, reason: 'over_max' })
      expect(evaluateCode(code({ discount_percent: 12.5 }), campaign(), NOW)).toEqual({ ok: false, reason: 'over_max' })
    })
  })
})

describe('validateDiscountCode (against the database)', () => {
  let db: ReturnType<typeof createFakeDb>
  const admin = () => db.client as any

  beforeEach(() => {
    db = createFakeDb()
    db.tables.discount_campaigns = [{ id: 'c1', prefix: 'REF-', type: 'unique', is_active: true, starts_at: null, expires_at: null }]
    db.tables.discount_codes = [
      { id: 'k1', campaign_id: 'c1', code: 'REF-GOOD2345', discount_percent: 20, expires_at: '2026-12-31T00:00:00Z', max_uses: 1, use_count: 0, is_active: true, starts_at: null },
      { id: 'k2', campaign_id: 'c1', code: 'REF-USED2345', discount_percent: 20, expires_at: '2026-12-31T00:00:00Z', max_uses: 1, use_count: 1, is_active: true, starts_at: null },
      { id: 'k3', campaign_id: 'c1', code: 'REF-OLD22345', discount_percent: 20, expires_at: '2026-10-01T00:00:00Z', max_uses: 1, use_count: 0, is_active: true, starts_at: null },
      { id: 'k4', campaign_id: 'c1', code: 'REF-BIG22345', discount_percent: 50, expires_at: '2026-12-31T00:00:00Z', max_uses: 1, use_count: 0, is_active: true, starts_at: null },
    ]
  })

  it('accepts a valid code (any case, extra spaces) and prices the discount on the merch subtotal', async () => {
    const r = await validateDiscountCode(admin(), '  ref-good2345 ', 4999, NOW)
    expect(r).toMatchObject({ ok: true, percent: 20, discountPence: 999 })
  })

  it.each([
    ['REF-NOPE2345', 'not_found', "We don't recognise that code"],
    ['REF-USED2345', 'used', 'already been used'],
    ['REF-OLD22345', 'expired', 'expired'],
    ['REF-BIG22345', 'over_max', "can't be applied"],
    ['', 'empty', 'Enter a discount code'],
    ['REF-GOOD2345 REF-USED2345', 'multiple', 'Only one discount code'],
  ])('%j → %s with a clear message', async (input, reason, text) => {
    const r = await validateDiscountCode(admin(), input, 5000, NOW)
    expect(r).toMatchObject({ ok: false, reason })
    expect((r as { message: string }).message).toContain(text)
  })
})
