import { describe, expect, it } from 'vitest'
import { canonicalEmail, isSelfReferral, normalizeReferralCode, referralLink } from './code'
import { nextTier, tiersReached } from './rewards'

describe('normalizeReferralCode', () => {
  it('accepts a 6-character code in any case, with stray spaces or dashes', () => {
    expect(normalizeReferralCode('k7m2qx')).toBe('K7M2QX')
    expect(normalizeReferralCode(' K7M-2QX ')).toBe('K7M2QX')
  })
  it('rejects anything else, including look-alike characters that never appear in codes', () => {
    for (const bad of ['', 'K7M2Q', 'K7M2QXX', 'K7M2Q0', 'K7M2QO', 'K7M2Q1', 'K7M2QL', 'K7M2QI', '<b>hi!!', null, undefined, 123, ['K7M2QX']]) {
      expect(normalizeReferralCode(bad)).toBeNull()
    }
  })
})

describe('referralLink', () => {
  it('points at /subscribe?ref=CODE and contains no email address', () => {
    const link = referralLink('K7M2QX')
    expect(link).toMatch(/\/subscribe\?ref=K7M2QX$/)
    expect(link).not.toContain('@')
  })
})

describe('self-referral detection', () => {
  it('spots the same address in different spellings', () => {
    expect(isSelfReferral('Sam@Example.com', 'sam@example.com')).toBe(true)
    expect(isSelfReferral('sam@example.com', 'sam+friend@example.com')).toBe(true)
    expect(isSelfReferral('s.a.m@gmail.com', 'sam@gmail.com')).toBe(true)
    expect(isSelfReferral('sam@gmail.com', 'sam@googlemail.com')).toBe(true)
  })
  it('does not treat different people as the same', () => {
    expect(isSelfReferral('sam@example.com', 'alex@example.com')).toBe(false)
    expect(isSelfReferral('sam@example.com', 'sam@example.org')).toBe(false)
    // dots only matter-less at Gmail
    expect(isSelfReferral('s.am@example.com', 'sam@example.com')).toBe(false)
  })
  it('canonicalEmail is stable', () => {
    expect(canonicalEmail(' A.B+x@GMAIL.com ')).toBe('ab@gmail.com')
  })
})

describe('reward tiers (1 → 20%, 3 → 30%)', () => {
  it('reaches the right tiers at each count', () => {
    expect(tiersReached(0)).toEqual([])
    expect(tiersReached(1).map(t => t.percent)).toEqual([20])
    expect(tiersReached(2).map(t => t.percent)).toEqual([20])
    expect(tiersReached(3).map(t => t.percent)).toEqual([20, 30])
    expect(tiersReached(40).map(t => t.percent)).toEqual([20, 30])
  })
  it('knows what is next', () => {
    expect(nextTier(0)).toEqual({ referrals: 1, percent: 20 })
    expect(nextTier(1)).toEqual({ referrals: 3, percent: 30 })
    expect(nextTier(2)).toEqual({ referrals: 3, percent: 30 })
    expect(nextTier(3)).toBeNull()
  })
})
