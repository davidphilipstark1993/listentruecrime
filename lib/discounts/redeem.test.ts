import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeDb } from '@/lib/shop/test-utils/fake-supabase'
import { releaseDiscountForOrder, reserveCode, reserveDiscountForOrder } from './redeem'

const NOW = new Date('2026-11-02T12:00:00Z')
let db: ReturnType<typeof createFakeDb>
const admin = () => db.client as any
const codeRow = (o = {}) => ({ id: 'k1', campaign_id: 'c1', code: 'REF-AAAA2222', discount_percent: 20, expires_at: '2026-12-31T00:00:00Z', max_uses: 1, use_count: 0, is_active: true, starts_at: null, ...o })

beforeEach(() => {
  db = createFakeDb()
  db.tables.discount_campaigns = [{ id: 'c1', prefix: 'REF-', type: 'unique', is_active: true, starts_at: null, expires_at: null }]
  db.tables.discount_codes = [codeRow()]
  db.tables.shop_orders = []
})

const order = (o = {}) => ({ id: 'o1', payment_status: 'pending', discount_code_id: 'k1', discount_released_at: null, stripe_checkout_session_id: 'cs_1', ...o })

describe('reserveCode', () => {
  it('takes the single use of a single-use code', async () => {
    expect(await reserveCode(admin(), 'REF-AAAA2222', NOW)).toMatchObject({ ok: true })
    expect(db.tables.discount_codes[0].use_count).toBe(1)
  })

  it('a second customer cannot take a single-use code that is already reserved', async () => {
    await reserveCode(admin(), 'REF-AAAA2222', NOW)
    expect(await reserveCode(admin(), 'REF-AAAA2222', NOW)).toEqual({ ok: false, reason: 'used' })
    expect(db.tables.discount_codes[0].use_count).toBe(1)
  })

  it('two simultaneous checkouts: exactly one wins the single-use code', async () => {
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => reserveCode(admin(), 'REF-AAAA2222', NOW)))
    expect(results.filter(r => r.ok)).toHaveLength(1)
    expect(db.tables.discount_codes[0].use_count).toBe(1)
  })

  it('re-checks expiry at reservation time', async () => {
    db.tables.discount_codes = [codeRow({ expires_at: '2026-11-01T00:00:00Z' })]
    expect(await reserveCode(admin(), 'REF-AAAA2222', NOW)).toEqual({ ok: false, reason: 'expired' })
  })

  it('public unlimited codes are never counted or blocked', async () => {
    db.tables.discount_codes = [codeRow({ code: 'BF26-SAVE', max_uses: null })]
    for (let i = 0; i < 20; i++) expect((await reserveCode(admin(), 'BF26-SAVE', NOW)).ok).toBe(true)
    expect(db.tables.discount_codes[0].use_count).toBe(0)
  })

  it('a capped public code stops at its cap', async () => {
    db.tables.discount_codes = [codeRow({ code: 'BF26-SAVE', max_uses: 2 })]
    const results = await Promise.all([1, 2, 3, 4].map(() => reserveCode(admin(), 'BF26-SAVE', NOW)))
    expect(results.filter(r => r.ok)).toHaveLength(2)
    expect(db.tables.discount_codes[0].use_count).toBe(2)
  })
})

describe('releaseDiscountForOrder', () => {
  it('gives the code back when an unpaid checkout lapses, exactly once', async () => {
    db.tables.discount_codes = [codeRow({ use_count: 1 })]
    db.tables.shop_orders = [order()]
    expect(await releaseDiscountForOrder(admin(), 'o1')).toBe(true)
    expect(db.tables.discount_codes[0].use_count).toBe(0)
    expect(await releaseDiscountForOrder(admin(), 'o1')).toBe(false) // replayed webhook
    expect(db.tables.discount_codes[0].use_count).toBe(0)
  })

  it('never releases the code of a paid order', async () => {
    db.tables.discount_codes = [codeRow({ use_count: 1 })]
    db.tables.shop_orders = [order({ payment_status: 'paid' })]
    expect(await releaseDiscountForOrder(admin(), 'o1')).toBe(false)
    expect(db.tables.discount_codes[0].use_count).toBe(1)
  })

  it('ignores orders that used no code', async () => {
    db.tables.shop_orders = [order({ discount_code_id: null })]
    expect(await releaseDiscountForOrder(admin(), 'o1')).toBe(false)
  })
})

describe('reserveDiscountForOrder: retrying checkout after backing out of Stripe', () => {
  const expireSession = vi.fn(async () => {})
  beforeEach(() => { expireSession.mockReset(); expireSession.mockResolvedValue(undefined) })

  it('takes the code over from an abandoned unpaid checkout, after expiring its Stripe session', async () => {
    db.tables.discount_codes = [codeRow({ use_count: 1 })]
    db.tables.shop_orders = [order({ id: 'old', stripe_checkout_session_id: 'cs_old' }), order({ id: 'new', discount_code_id: 'k1', stripe_checkout_session_id: null })]
    const r = await reserveDiscountForOrder(admin(), { orderId: 'new', code: 'REF-AAAA2222' }, { expireSession, now: NOW })
    expect(r.ok).toBe(true)
    expect(expireSession).toHaveBeenCalledWith('cs_old')
    expect(db.tables.discount_codes[0].use_count).toBe(1)
    expect(db.tables.shop_orders.find(o => o.id === 'old')).toMatchObject({ payment_status: 'expired', fulfilment_status: 'cancelled' })
    expect(db.tables.shop_orders.find(o => o.id === 'old')!.discount_released_at).not.toBeNull()
  })

  it("does NOT take it over if the other checkout can't be expired (it may be paying right now)", async () => {
    expireSession.mockRejectedValue(new Error('Session is already complete'))
    db.tables.discount_codes = [codeRow({ use_count: 1 })]
    db.tables.shop_orders = [order({ id: 'old' }), order({ id: 'new', stripe_checkout_session_id: null })]
    const r = await reserveDiscountForOrder(admin(), { orderId: 'new', code: 'REF-AAAA2222' }, { expireSession, now: NOW })
    expect(r).toEqual({ ok: false, reason: 'used' })
    expect(db.tables.shop_orders.find(o => o.id === 'old')!.payment_status).toBe('pending')
  })

  it('never takes a code from a PAID order', async () => {
    db.tables.discount_codes = [codeRow({ use_count: 1 })]
    db.tables.shop_orders = [order({ id: 'old', payment_status: 'paid' }), order({ id: 'new', stripe_checkout_session_id: null })]
    const r = await reserveDiscountForOrder(admin(), { orderId: 'new', code: 'REF-AAAA2222' }, { expireSession, now: NOW })
    expect(r).toEqual({ ok: false, reason: 'used' })
    expect(expireSession).not.toHaveBeenCalled()
  })
})
