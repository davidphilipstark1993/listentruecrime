import type { SupabaseClient } from '@supabase/supabase-js'
import { discountAmountPence, parseCodeInput } from './codes'
import { maxDiscountPercent } from './config'
import { FAILURE_MESSAGES, type CampaignRow, type CodeFailure, type CodeRow } from './types'

// The single place that decides whether a code may be used. The checkout quote,
// checkout and redemption all go through here, so the rules cannot drift apart.

export type Evaluation = { ok: true; percent: number } | { ok: false; reason: CodeFailure }

/**
 * Pure rule check for one code. Order matters only for which message the customer sees.
 * `max` is the system-wide cap: a code worth more than the cap is refused even if it was
 * issued when the cap was higher.
 */
export function evaluateCode(
  code: Pick<CodeRow, 'is_active' | 'starts_at' | 'expires_at' | 'max_uses' | 'use_count' | 'discount_percent'> | null,
  campaign: Pick<CampaignRow, 'is_active' | 'starts_at' | 'expires_at'> | null,
  now: Date,
  max = maxDiscountPercent(),
): Evaluation {
  if (!code || !campaign) return { ok: false, reason: 'not_found' }
  if (!code.is_active || !campaign.is_active) return { ok: false, reason: 'inactive' }

  const t = now.getTime()
  const startsAt = [code.starts_at, campaign.starts_at].filter(Boolean).map(d => new Date(d as string).getTime())
  if (startsAt.some(s => s > t)) return { ok: false, reason: 'not_started' }

  // Every code has its own expiry; the campaign's end date also applies if it is earlier.
  const ends = [code.expires_at, campaign.expires_at].filter(Boolean).map(d => new Date(d as string).getTime())
  if (!ends.length || ends.some(e => e <= t)) return { ok: false, reason: 'expired' }

  if (code.max_uses != null && code.use_count >= code.max_uses) return { ok: false, reason: 'used' }

  const percent = code.discount_percent
  if (!Number.isInteger(percent) || percent < 1 || percent > max) return { ok: false, reason: 'over_max' }

  return { ok: true, percent }
}

export interface ValidatedDiscount {
  ok: true
  code: CodeRow
  campaign: CampaignRow
  percent: number
  /** Pence off the merchandise subtotal passed in. */
  discountPence: number
}
export interface RejectedDiscount { ok: false; reason: CodeFailure; message: string }

export const reject = (reason: CodeFailure): RejectedDiscount => ({ ok: false, reason, message: FAILURE_MESSAGES[reason] })

export async function loadCodeWithCampaign(admin: SupabaseClient, code: string): Promise<{ code: CodeRow; campaign: CampaignRow } | null> {
  const { data: codeRow } = await admin.from('discount_codes').select('*').eq('code', code).maybeSingle()
  if (!codeRow) return null
  const { data: campaign } = await admin.from('discount_campaigns').select('*').eq('id', (codeRow as CodeRow).campaign_id).maybeSingle()
  if (!campaign) return null
  return { code: codeRow as CodeRow, campaign: campaign as CampaignRow }
}

/**
 * Looks a customer-entered code up and checks it against every rule: it exists, is
 * active, has started, hasn't expired, hasn't been used up (single-use), and is within
 * the system-wide maximum. `subtotalPence` is the merchandise subtotal the discount
 * applies to (delivery is never discounted).
 */
export async function validateDiscountCode(
  admin: SupabaseClient,
  raw: unknown,
  subtotalPence: number,
  now: Date = new Date(),
): Promise<ValidatedDiscount | RejectedDiscount> {
  const parsed = parseCodeInput(raw)
  if (!parsed.ok) return reject(parsed.reason)

  const found = await loadCodeWithCampaign(admin, parsed.code)
  const verdict = evaluateCode(found?.code ?? null, found?.campaign ?? null, now)
  if (!verdict.ok || !found) return reject(verdict.ok ? 'not_found' : verdict.reason)

  return {
    ok: true,
    code: found.code,
    campaign: found.campaign,
    percent: verdict.percent,
    discountPence: discountAmountPence(subtotalPence, verdict.percent),
  }
}
