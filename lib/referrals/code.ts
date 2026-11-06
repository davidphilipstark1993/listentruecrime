import { BASE } from '@/lib/seo/config'
import { CODE_ALPHABET, REFERRAL_CODE_LENGTH } from '@/lib/discounts/config'

// Pure helpers for referral codes and links.

const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`)

/** "k7m 2qx" → "K7M2QX". Returns null unless it is shaped like a real referral code. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.normalize('NFKC').toUpperCase().replace(/[\s-]/g, '')
  return CODE_RE.test(code) ? code : null
}

/** The link a subscriber shares. Only the code is in it: never an email address. */
export function referralLink(code: string): string {
  return `${BASE}/subscribe?ref=${encodeURIComponent(code)}`
}

/**
 * Collapses the many spellings of one mailbox: case, "+tag" suffixes, and for Gmail the
 * dots and googlemail.com alias. Used only to spot someone referring themselves.
 */
export function canonicalEmail(email: string): string {
  const [rawLocal = '', rawDomain = ''] = email.trim().toLowerCase().split('@')
  let domain = rawDomain
  let local = rawLocal.split('+')[0]
  if (domain === 'googlemail.com') domain = 'gmail.com'
  if (domain === 'gmail.com') local = local.replace(/\./g, '')
  return `${local}@${domain}`
}

export function isSelfReferral(referrerEmail: string, referredEmail: string): boolean {
  return canonicalEmail(referrerEmail) === canonicalEmail(referredEmail)
}
