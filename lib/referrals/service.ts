import type { SupabaseClient } from '@supabase/supabase-js'
import { getCampaignByPrefix, issueUniqueCodes } from '@/lib/discounts/campaigns'
import {
  REFERRAL_BLOCK_SAME_IP, REFERRAL_CODE_VALID_DAYS, REFERRAL_PREFIX, REFERRAL_TIERS, maxDiscountPercent,
} from '@/lib/discounts/config'
import type { CampaignRow, CodeRow } from '@/lib/discounts/types'
import { sendRewardEmail } from '@/lib/email/referral-reward'
import { isSelfReferral, normalizeReferralCode } from './code'
import { nextTier, tiersReached } from './rewards'

// The referral rules, in one place:
//   • A referral is recorded at sign-up ONLY for a brand-new subscriber (the caller only reaches
//     this after inserting a new row; existing addresses never get here).
//   • It becomes a counted referral only when that subscriber confirms (double opt-in).
//   • One referrer per subscriber (UNIQUE referred_id), never yourself.
//   • Rewards are derived from the confirmed count and issued at most once per tier.
// Nothing here ever stores an email address for someone who has not signed up themselves:
// a referral link carries only the referrer's code.

interface SubscriberLite {
  id: string
  email: string
  first_name: string | null
  status: string
  referral_code: string
  consent_ip_hash: string | null
}

export type RegisterOutcome = 'registered' | 'no_code' | 'unknown_code' | 'referrer_inactive' | 'self_referral' | 'same_ip' | 'already_referred'

/** Who owns a referral code (only if they are a confirmed, active subscriber). */
export async function findReferrerByCode(admin: SupabaseClient, rawCode: unknown): Promise<{ referrer: SubscriberLite | null; reason?: RegisterOutcome }> {
  const code = normalizeReferralCode(rawCode)
  if (!code) return { referrer: null, reason: rawCode ? 'unknown_code' : 'no_code' }
  const { data } = await admin
    .from('newsletter_subscribers')
    .select('id, email, first_name, status, referral_code, consent_ip_hash')
    .eq('referral_code', code)
    .maybeSingle()
  if (!data) return { referrer: null, reason: 'unknown_code' }
  const referrer = data as SubscriberLite
  if (referrer.status !== 'active') return { referrer: null, reason: 'referrer_inactive' }
  return { referrer }
}

/**
 * Called right after a NEW subscriber row is inserted (status 'pending'). Records who referred
 * them if the code is good. Never throws and never changes the sign-up response: a bad or
 * unusable code is silently ignored so the form can't be used to probe the list.
 */
export async function registerReferral(
  admin: SupabaseClient,
  input: { referredId: string; referredEmail: string; referredIpHash: string | null; refCode: unknown },
): Promise<RegisterOutcome> {
  try {
    const { referrer, reason } = await findReferrerByCode(admin, input.refCode)
    if (!referrer) return reason ?? 'unknown_code'

    if (referrer.id === input.referredId || isSelfReferral(referrer.email, input.referredEmail)) return 'self_referral'
    if (REFERRAL_BLOCK_SAME_IP && input.referredIpHash && referrer.consent_ip_hash === input.referredIpHash) return 'same_ip'

    const { error } = await admin.from('referrals').insert({ referrer_id: referrer.id, referred_id: input.referredId })
    if (error) {
      if (error.code === '23505') return 'already_referred' // each subscriber can credit only one referrer
      console.error('Referral insert error:', error.message)
      return 'unknown_code'
    }
    return 'registered'
  } catch (err) {
    console.error('Referral registration error:', err)
    return 'unknown_code'
  }
}

/** Confirmed referrals for one subscriber. */
export async function confirmedReferralCount(admin: SupabaseClient, referrerId: string): Promise<number> {
  const { data } = await admin.from('referrals').select('id').eq('referrer_id', referrerId).eq('status', 'confirmed')
  return data?.length ?? 0
}

export interface CreditResult { credited: boolean; count: number; issued: number }

/**
 * Called when a subscriber confirms their address. Counts their referral (once, however many
 * times this runs) and issues any reward tier the referrer has now reached. Never throws:
 * the subscriber's confirmation has already been saved and must not fail because of this.
 */
export async function creditReferral(admin: SupabaseClient, referredId: string, now = new Date()): Promise<CreditResult> {
  const none: CreditResult = { credited: false, count: 0, issued: 0 }
  try {
    // The idempotent step: only the first caller flips pending → confirmed.
    const { data: flipped } = await admin
      .from('referrals')
      .update({ status: 'confirmed', confirmed_at: now.toISOString() })
      .eq('referred_id', referredId)
      .eq('status', 'pending')
      .select('referrer_id')
    const referrerId = (flipped?.[0] as { referrer_id: string } | undefined)?.referrer_id
    if (!referrerId) return none

    const count = await confirmedReferralCount(admin, referrerId)
    const issued = await issueRewards(admin, referrerId, count, now)
    return { credited: true, count, issued }
  } catch (err) {
    console.error('Referral credit error:', err)
    return none
  }
}

async function ensureReferralCampaign(admin: SupabaseClient): Promise<CampaignRow | null> {
  const existing = await getCampaignByPrefix(admin, REFERRAL_PREFIX)
  if (existing) return existing
  // Migration 023 seeds this; recreate it if someone deleted it.
  const { data } = await admin
    .from('discount_campaigns')
    .insert({
      prefix: REFERRAL_PREFIX, name: 'Referral rewards', type: 'unique',
      discount_percent: REFERRAL_TIERS[0]?.percent ?? 20, code_valid_days: REFERRAL_CODE_VALID_DAYS, is_active: true,
    })
    .select('*')
    .single()
  return (data as CampaignRow | null) ?? null
}

/**
 * Issues a unique single-use code for every tier `count` has reached that this subscriber
 * hasn't already earned (the database's unique index makes this safe to call repeatedly),
 * then emails any reward that hasn't been emailed yet. Returns how many new codes were created.
 */
export async function issueRewards(admin: SupabaseClient, referrerId: string, count: number, now = new Date()): Promise<number> {
  const { data: sub } = await admin
    .from('newsletter_subscribers')
    .select('id, email, first_name, status, referral_code, consent_ip_hash')
    .eq('id', referrerId)
    .maybeSingle()
  const referrer = sub as SubscriberLite | null
  // Someone who has since unsubscribed has asked us not to email them: count, don't reward.
  if (!referrer || referrer.status !== 'active') return 0

  const campaign = await ensureReferralCampaign(admin)
  if (!campaign) { console.error('Referral campaign REF- is missing and could not be created'); return 0 }
  if (!campaign.is_active) { console.warn('Referral campaign REF- is switched off: no reward issued'); return 0 }

  let issued = 0
  for (const tier of tiersReached(count)) {
    const created = await issueUniqueCodes(admin, campaign, 1, {
      ownerSubscriberId: referrer.id,
      rewardTier: tier.referrals,
      percent: Math.min(tier.percent, maxDiscountPercent()),
      validDays: REFERRAL_CODE_VALID_DAYS,
      now,
    })
    issued += created.length
  }

  await sendUnsentRewards(admin, referrer, count, campaign.id)
  return issued
}

/**
 * Emails every reward code this subscriber owns that hasn't been emailed (including ones whose
 * earlier email failed). The email is claimed atomically before sending, so concurrent runs
 * can't send it twice; a failed send releases the claim for the next attempt.
 */
export async function sendUnsentRewards(
  admin: SupabaseClient,
  referrer: Pick<SubscriberLite, 'id' | 'email' | 'first_name' | 'referral_code'>,
  count: number,
  campaignId: string,
  now = new Date(),
): Promise<number> {
  const { data: owned } = await admin
    .from('discount_codes')
    .select('*')
    .eq('owner_subscriber_id', referrer.id)
    .eq('campaign_id', campaignId)
    .is('email_sent_at', null)
  let sent = 0
  for (const code of (owned ?? []) as CodeRow[]) {
    if (new Date(code.expires_at).getTime() <= now.getTime()) continue // too late to be useful
    const { data: claimed } = await admin
      .from('discount_codes')
      .update({ email_sent_at: now.toISOString() })
      .eq('id', code.id)
      .is('email_sent_at', null)
      .select('id')
    if (!claimed?.length) continue
    try {
      await sendRewardEmail({
        to: referrer.email,
        firstName: referrer.first_name,
        code: code.code,
        percent: code.discount_percent,
        expiresAt: new Date(code.expires_at),
        count,
        next: nextTier(count),
        referralCode: referrer.referral_code,
      })
      sent++
    } catch (err) {
      await admin.from('discount_codes').update({ email_sent_at: null }).eq('id', code.id)
      console.error(`Referral reward email failed for code ${code.code}:`, err)
    }
  }
  return sent
}
