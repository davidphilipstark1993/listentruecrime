import { describe, it, expect } from 'vitest'
import {
  CONFIRM_TOKEN_TTL_MS,
  RESEND_COOLDOWN_MS,
  canResendConfirmation,
  clientIp,
  confirmUrl,
  hashToken,
  isTokenExpired,
  newConfirmToken,
} from './optin'

describe('newConfirmToken', () => {
  it('returns a 64-char hex token whose hash matches hashToken', () => {
    const { token, hash } = newConfirmToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(hashToken(token))
    expect(hash).not.toBe(token)
  })

  it('never repeats', () => {
    expect(newConfirmToken().token).not.toBe(newConfirmToken().token)
  })
})

describe('isTokenExpired', () => {
  const now = Date.parse('2026-10-17T12:00:00Z')
  it('is fresh inside the TTL and expired after it', () => {
    expect(isTokenExpired(new Date(now - CONFIRM_TOKEN_TTL_MS + 1000).toISOString(), now)).toBe(false)
    expect(isTokenExpired(new Date(now - CONFIRM_TOKEN_TTL_MS - 1000).toISOString(), now)).toBe(true)
  })
  it('treats a missing send time as expired', () => {
    expect(isTokenExpired(null, now)).toBe(true)
  })
})

describe('canResendConfirmation', () => {
  const now = Date.parse('2026-10-17T12:00:00Z')
  it('blocks inside the cooldown and allows after it', () => {
    expect(canResendConfirmation(new Date(now - RESEND_COOLDOWN_MS + 1000).toISOString(), now)).toBe(false)
    expect(canResendConfirmation(new Date(now - RESEND_COOLDOWN_MS).toISOString(), now)).toBe(true)
  })
  it('allows when nothing was ever sent', () => {
    expect(canResendConfirmation(null, now)).toBe(true)
  })
})

describe('confirmUrl / clientIp', () => {
  it('builds an absolute confirm link carrying the token', () => {
    expect(confirmUrl('abc')).toMatch(/^https?:\/\/.+\/api\/newsletter\/confirm\?token=abc$/)
  })
  it('takes the first forwarded address', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4')
    expect(clientIp(new Headers())).toBe('unknown')
  })
})
