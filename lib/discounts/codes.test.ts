import { describe, expect, it } from 'vitest'
import { CODE_ALPHABET } from './config'
import { computeExpiry, discountAmountPence, generateCode, normalizePrefix, normalizeSuffix, parseCodeInput, randomCodeString } from './codes'

describe('code generation', () => {
  it('builds PREFIX-XXXXXXXX from the unambiguous alphabet', () => {
    const code = generateCode('REF-')
    expect(code).toMatch(/^REF-[A-HJKMNP-Z2-9]{8}$/)
    expect(code.slice(4)).not.toMatch(/[01OIL]/)
  })

  it('only ever uses alphabet characters, and never the look-alikes', () => {
    const s = randomCodeString(5000)
    for (const ch of s) expect(CODE_ALPHABET).toContain(ch)
    expect(CODE_ALPHABET).toHaveLength(31)
    expect(new Set(CODE_ALPHABET).size).toBe(31)
  })

  it('produces different codes each time (no collisions across 5,000 codes)', () => {
    const seen = new Set(Array.from({ length: 5000 }, () => generateCode('BF26-')))
    expect(seen.size).toBe(5000)
  })

  it('uses the injected random source, so output is controllable in tests', () => {
    expect(randomCodeString(4, () => 0)).toBe('AAAA')
    expect(randomCodeString(3, n => n - 1)).toBe('999')
  })
})

describe('prefix naming convention', () => {
  it.each([['bf26', 'BF26-'], ['BF26-', 'BF26-'], ['  ref ', 'REF-'], ['Loyal-', 'LOYAL-'], ['WELCOME', 'WELCOME-']])('%s → %s', (input, expected) => {
    expect(normalizePrefix(input)).toBe(expected)
  })
  it.each(['', 'A', '26BF', 'BF 26', 'TOOLONGPREFIX', 'B$F', '-'])('rejects %j', input => {
    expect(normalizePrefix(input)).toBeNull()
  })
})

describe('parseCodeInput (what a customer types)', () => {
  it('upper-cases and trims', () => {
    expect(parseCodeInput('  ref-abcd2345 ')).toEqual({ ok: true, code: 'REF-ABCD2345' })
  })
  it('accepts fancy dashes and spaces around the dash from copy/paste', () => {
    expect(parseCodeInput('REF–ABCD2345')).toEqual({ ok: true, code: 'REF-ABCD2345' })
    expect(parseCodeInput('ref - abcd2345')).toEqual({ ok: true, code: 'REF-ABCD2345' })
  })
  it('refuses empty input', () => {
    expect(parseCodeInput('   ')).toEqual({ ok: false, reason: 'empty' })
  })
  it('refuses two codes in one box: no stacking', () => {
    expect(parseCodeInput('REF-AAAA2222 BF26-SAVE')).toEqual({ ok: false, reason: 'multiple' })
    expect(parseCodeInput('REF-AAAA2222, BF26-SAVE')).toEqual({ ok: false, reason: 'multiple' })
    expect(parseCodeInput('REF-AAAA2222+BF26-SAVE')).toEqual({ ok: false, reason: 'multiple' })
  })
  it('refuses junk, non-strings and over-long input', () => {
    expect(parseCodeInput('<script>')).toMatchObject({ ok: false })
    expect(parseCodeInput(['REF-AAAA2222', 'BF26-SAVE'])).toEqual({ ok: false, reason: 'format' })
    expect(parseCodeInput(undefined)).toEqual({ ok: false, reason: 'format' })
    expect(parseCodeInput('A'.repeat(65))).toEqual({ ok: false, reason: 'format' })
  })
})

describe('public code suffix', () => {
  it('normalises and validates', () => {
    expect(normalizeSuffix('blackfriday')).toBe('BLACKFRIDAY')
    expect(normalizeSuffix('save-20')).toBe('SAVE-20')
    expect(normalizeSuffix('a')).toBeNull()
    expect(normalizeSuffix('has space')).toBeNull()
  })
})

describe('discountAmountPence', () => {
  it('takes the percentage off, rounding down so the cap is never exceeded', () => {
    expect(discountAmountPence(10000, 20)).toBe(2000)
    expect(discountAmountPence(2499, 20)).toBe(499) // 499.8 → 499
    expect(discountAmountPence(2499, 30)).toBe(749) // 749.7 → 749
    expect(discountAmountPence(9999, 30)).toBeLessThanOrEqual(9999 * 0.3)
  })
  it('is zero for nothing to discount or nonsense input', () => {
    expect(discountAmountPence(0, 20)).toBe(0)
    expect(discountAmountPence(-5, 20)).toBe(0)
    expect(discountAmountPence(1000, 0)).toBe(0)
    expect(discountAmountPence(NaN, 20)).toBe(0)
  })
  it('never discounts more than the subtotal', () => {
    expect(discountAmountPence(100, 500)).toBe(100)
  })
})

describe('computeExpiry', () => {
  const now = new Date('2026-11-02T12:00:00Z')
  it('uses code_valid_days from now (referral rewards: 60 days)', () => {
    expect(computeExpiry({ expires_at: null, code_valid_days: 60 }, now)?.toISOString()).toBe('2027-01-01T12:00:00.000Z')
  })
  it('uses the campaign end date when there is no rolling lifetime', () => {
    expect(computeExpiry({ expires_at: '2026-12-01T00:00:00Z', code_valid_days: null }, now)?.toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })
  it('takes whichever ends first when both are set', () => {
    expect(computeExpiry({ expires_at: '2026-11-10T00:00:00Z', code_valid_days: 60 }, now)?.toISOString()).toBe('2026-11-10T00:00:00.000Z')
    expect(computeExpiry({ expires_at: '2027-06-01T00:00:00Z', code_valid_days: 7 }, now)?.toISOString()).toBe('2026-11-09T12:00:00.000Z')
  })
  it('returns null when neither is set', () => {
    expect(computeExpiry({ expires_at: null, code_valid_days: null }, now)).toBeNull()
  })
})
