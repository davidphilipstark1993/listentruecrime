import { createHash, randomBytes } from 'crypto'
import { BASE } from '@/lib/seo/config'

export const CONFIRM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const RESEND_COOLDOWN_MS = 10 * 60 * 1000
export const MAX_SIGNUPS_PER_IP_PER_HOUR = 10

/** Wording shown beside the signup forms; stored with each consent record. */
export const CONSENT_TEXT =
  'By subscribing you agree to receive the weekly ListenTrueCrime newsletter. We will email you a link to confirm. Unsubscribe anytime.'

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function newConfirmToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex')
  return { token, hash: hashToken(token) }
}

export function confirmUrl(token: string): string {
  return `${BASE}/api/newsletter/confirm?token=${token}`
}

export function isTokenExpired(sentAt: string | null, now = Date.now()): boolean {
  if (!sentAt) return true
  return now - new Date(sentAt).getTime() > CONFIRM_TOKEN_TTL_MS
}

/** A pending subscriber re-submitting the form gets a fresh link, but not more often than the cooldown. */
export function canResendConfirmation(sentAt: string | null, now = Date.now()): boolean {
  if (!sentAt) return true
  return now - new Date(sentAt).getTime() >= RESEND_COOLDOWN_MS
}

export function hashIp(ip: string): string {
  const salt = process.env.RATING_IP_SALT ?? 'ltc-newsletter'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
}
