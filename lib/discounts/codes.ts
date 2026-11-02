import { randomInt } from 'crypto'
import { CODE_ALPHABET, DISCOUNT_CODE_LENGTH } from './config'
import type { CampaignRow, CodeFailure } from './types'

// Pure helpers: no I/O, so every rule here is unit-tested.

type RandomInt = (maxExclusive: number) => number

/** Cryptographically random string from the unambiguous alphabet (codes are bearer tokens). */
export function randomCodeString(length: number, rand: RandomInt = n => randomInt(n), alphabet = CODE_ALPHABET): string {
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[rand(alphabet.length)]
  return out
}

/** "bf26" / "BF26-" / " bf26- " → "BF26-", or null if it doesn't fit the naming convention. */
export function normalizePrefix(input: string): string | null {
  const p = input.trim().toUpperCase().replace(/-+$/, '')
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(p)) return null
  return `${p}-`
}

/** A fresh unique code: PREFIX-XXXXXXXX. */
export function generateCode(prefix: string, rand?: RandomInt, length = DISCOUNT_CODE_LENGTH): string {
  return `${prefix}${randomCodeString(length, rand)}`
}

/**
 * Turns whatever a customer typed or pasted into one canonical code.
 * Upper-cases, unifies dash characters, removes stray spaces around the dash, and
 * refuses input that looks like several codes (one code per order, no stacking).
 */
export function parseCodeInput(raw: unknown): { ok: true; code: string } | { ok: false; reason: CodeFailure } {
  if (typeof raw !== 'string') return { ok: false, reason: 'format' }
  const text = raw
    .normalize('NFKC')
    .replace(/[‐-―−]/g, '-') // hyphen, non-breaking hyphen, en/em dashes, minus → "-"
    .trim()
    .toUpperCase()
  if (!text) return { ok: false, reason: 'empty' }
  if (text.length > 64) return { ok: false, reason: 'format' }

  // "REF - ABC123" is one code with spaces around the dash; "A B" or "A,B" is two codes.
  const squeezed = text.replace(/\s*-\s*/g, '-')
  const tokens = squeezed.split(/[\s,;&+/|]+/).filter(Boolean)
  if (tokens.length > 1) return { ok: false, reason: 'multiple' }
  const code = tokens[0]
  if (!/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(code)) return { ok: false, reason: 'format' }
  return { ok: true, code }
}

/** Public-code suffix chosen by an admin (BLACKFRIDAY in BF26-BLACKFRIDAY). */
export function normalizeSuffix(input: string): string | null {
  const s = input.trim().toUpperCase().replace(/^-+/, '')
  return /^[A-Z0-9][A-Z0-9-]{1,29}$/.test(s) ? s : null
}

/**
 * Whole pence taken off the merchandise subtotal. Rounded DOWN so the discount can never
 * exceed its stated percentage (the 30% cap is a hard limit, not an approximation).
 */
export function discountAmountPence(subtotalPence: number, percent: number): number {
  if (!Number.isFinite(subtotalPence) || subtotalPence <= 0 || !Number.isFinite(percent) || percent <= 0) return 0
  return Math.min(subtotalPence, Math.floor((subtotalPence * percent) / 100))
}

/**
 * When a newly issued code expires: the campaign's fixed end date and/or `code_valid_days`
 * from `now`, whichever is earlier. Returns null if neither is set (the DB forbids that).
 */
export function computeExpiry(
  campaign: Pick<CampaignRow, 'expires_at' | 'code_valid_days'>,
  now: Date,
  validDaysOverride?: number,
): Date | null {
  const candidates: number[] = []
  if (campaign.expires_at) candidates.push(new Date(campaign.expires_at).getTime())
  const days = validDaysOverride ?? campaign.code_valid_days
  if (days != null) candidates.push(now.getTime() + days * 24 * 60 * 60 * 1000)
  if (!candidates.length) return null
  return new Date(Math.min(...candidates))
}
