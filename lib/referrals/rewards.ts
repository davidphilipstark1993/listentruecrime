import { REFERRAL_TIERS } from '@/lib/discounts/config'

// Pure tier arithmetic for referral rewards.

export interface Tier { referrals: number; percent: number }

/** Every tier a subscriber with `count` confirmed referrals has earned (lowest first). */
export function tiersReached(count: number, tiers: readonly Tier[] = REFERRAL_TIERS): Tier[] {
  return tiers.filter(t => count >= t.referrals).sort((a, b) => a.referrals - b.referrals)
}

/** The next tier still to earn, or null once they have them all. */
export function nextTier(count: number, tiers: readonly Tier[] = REFERRAL_TIERS): Tier | null {
  return [...tiers].sort((a, b) => a.referrals - b.referrals).find(t => t.referrals > count) ?? null
}
