import { sanitizeEnv } from '@/lib/utils'

// ─── Discount system configuration ───────────────────────────────────────────
// Everything you are likely to want to change lives in this file.
// New campaigns (prefix, %, type, expiry) do NOT need a code change: create them in
// Admin > Shop > Discounts. Only the referral tier table below is code-defined.

/**
 * THE maximum discount (%) allowed anywhere in the system. One value, checked when a
 * campaign is created, when a code is issued, and again every time a customer applies a
 * code, so lowering it takes effect immediately, even for codes already issued.
 *
 * Change the number here, or set DISCOUNT_MAX_PERCENT in the environment (the env var wins).
 */
export const MAX_DISCOUNT_PERCENT = 30

export function maxDiscountPercent(): number {
  const raw = process.env.DISCOUNT_MAX_PERCENT ? Number(sanitizeEnv(process.env.DISCOUNT_MAX_PERCENT)) : NaN
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? Math.floor(raw) : MAX_DISCOUNT_PERCENT
}

// ─── Referral rewards ────────────────────────────────────────────────────────
/** Prefix of the campaign that holds referral reward codes. */
export const REFERRAL_PREFIX = 'REF-'

/**
 * Reward tiers: reaching `referrals` confirmed referrals earns one unique single-use code
 * worth `percent` off merch. Percentages above maxDiscountPercent() are clamped when issued.
 */
export const REFERRAL_TIERS: readonly { referrals: number; percent: number }[] = [
  { referrals: 1, percent: 20 },
  { referrals: 3, percent: 30 },
]

/** Reward codes expire this many days after they are issued. */
export const REFERRAL_CODE_VALID_DAYS = 60

/**
 * Block a referral when the new subscriber signed up from the same (hashed) IP as the
 * referrer: the cheapest way to stop someone referring themselves with a second address.
 * Set to false if households sharing a connection should be able to refer each other.
 */
export const REFERRAL_BLOCK_SAME_IP = true

// ─── Code format ─────────────────────────────────────────────────────────────
/** 31 symbols: no 0/O, 1/I/L, so codes survive being read out or retyped. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
/** Random part of a unique discount code, e.g. REF-7K3QX9MD (31^8 ≈ 8.5 × 10^11). */
export const DISCOUNT_CODE_LENGTH = 8
/** Subscriber referral codes, e.g. K7M2QX. */
export const REFERRAL_CODE_LENGTH = 6
/** Most codes the admin can generate in one go. */
export const MAX_CODES_PER_BATCH = 200
