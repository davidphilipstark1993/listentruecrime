import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { computeExpiry, generateCode, normalizePrefix, normalizeSuffix } from './codes'
import { MAX_CODES_PER_BATCH, maxDiscountPercent } from './config'
import { DiscountError, type CampaignRow, type CodeRow } from './types'

// Creating campaigns and issuing codes. Used by the admin API and by the referral
// reward flow, so there is exactly one implementation of "make a code".

const isoDate = z.string().trim().min(1).refine(s => !Number.isNaN(new Date(s).getTime()), 'Not a valid date')

export const campaignInputSchema = z.object({
  prefix: z.string().trim().min(2).max(12),
  name: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(1000).optional().nullable(),
  type: z.enum(['unique', 'public']),
  discountPercent: z.number().int().min(1).max(100),
  startsAt: isoDate.optional().nullable(),
  expiresAt: isoDate.optional().nullable(),
  codeValidDays: z.number().int().min(1).max(3650).optional().nullable(),
  maxUsesPerCode: z.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
})
export type CampaignInput = z.infer<typeof campaignInputSchema>

/** Validates and inserts a campaign. Throws DiscountError with a message fit to show an admin. */
export async function createCampaign(admin: SupabaseClient, rawInput: unknown, now = new Date()): Promise<CampaignRow> {
  const parsed = campaignInputSchema.safeParse(rawInput)
  if (!parsed.success) throw new DiscountError(parsed.error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '))
  const input = parsed.data

  const prefix = normalizePrefix(input.prefix)
  if (!prefix) throw new DiscountError('Prefix must be 2-10 letters/digits starting with a letter, e.g. BF26 (a trailing "-" is added for you).')

  const max = maxDiscountPercent()
  if (input.discountPercent > max) throw new DiscountError(`Discount cannot be more than ${max}% (the system-wide maximum).`)

  if (input.expiresAt == null && input.codeValidDays == null) {
    throw new DiscountError('Every code needs an expiry: set an end date, a number of days each code stays valid, or both.')
  }
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= now.getTime()) throw new DiscountError('The end date is in the past.')
  if (input.startsAt && input.expiresAt && new Date(input.startsAt) >= new Date(input.expiresAt)) throw new DiscountError('The start date must be before the end date.')
  if (input.type === 'unique' && input.maxUsesPerCode != null && input.maxUsesPerCode !== 1) {
    throw new DiscountError('Unique codes are always single-use; leave "max uses" empty.')
  }

  const { data, error } = await admin
    .from('discount_campaigns')
    .insert({
      prefix,
      name: input.name,
      notes: input.notes || null,
      type: input.type,
      discount_percent: input.discountPercent,
      starts_at: input.startsAt ? new Date(input.startsAt).toISOString() : null,
      expires_at: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
      code_valid_days: input.codeValidDays ?? null,
      max_uses_per_code: input.type === 'public' ? input.maxUsesPerCode ?? null : null,
      is_active: input.isActive ?? true,
    })
    .select('*')
    .single()
  if (error || !data) {
    if (error?.code === '23505') throw new DiscountError(`A campaign with the prefix ${prefix} already exists.`)
    throw new DiscountError(`Could not create the campaign: ${error?.message ?? 'unknown error'}`)
  }
  return data as CampaignRow
}

export async function getCampaign(admin: SupabaseClient, id: string): Promise<CampaignRow> {
  const { data } = await admin.from('discount_campaigns').select('*').eq('id', id).maybeSingle()
  if (!data) throw new DiscountError('Campaign not found.')
  return data as CampaignRow
}

export async function getCampaignByPrefix(admin: SupabaseClient, prefix: string): Promise<CampaignRow | null> {
  const { data } = await admin.from('discount_campaigns').select('*').eq('prefix', prefix).maybeSingle()
  return (data as CampaignRow | null) ?? null
}

export interface IssueOptions {
  /** Defaults to the campaign's %. Always capped at the system-wide maximum. */
  percent?: number
  /** Referral rewards: whose code this is, and which tier it was earned at. */
  ownerSubscriberId?: string
  rewardTier?: number
  /** Override how long the code lives (days from now); never extends past the campaign end date. */
  validDays?: number
  now?: Date
}

/** The % a code is issued at: requested (or the campaign's), never above the system cap. */
export function resolveIssuePercent(campaign: Pick<CampaignRow, 'discount_percent'>, requested?: number): number {
  return Math.max(1, Math.min(requested ?? campaign.discount_percent, maxDiscountPercent()))
}

function assertIssuable(campaign: CampaignRow, now: Date, validDays?: number): Date {
  const expiry = computeExpiry(campaign, now, validDays)
  if (!expiry) throw new DiscountError('This campaign has no expiry; set an end date or a valid-for-days value first.')
  if (expiry.getTime() <= now.getTime()) throw new DiscountError('This campaign has already ended, so no new codes can be issued.')
  return expiry
}

/**
 * Issues `count` unique single-use codes (PREFIX-XXXXXXXX). Collisions with an existing
 * code are retried with fresh random strings. When `ownerSubscriberId` + `rewardTier` are
 * given the database's unique index makes the call idempotent: if that subscriber already
 * has a code for that tier, nothing is created and `[]` is returned.
 */
export async function issueUniqueCodes(admin: SupabaseClient, campaign: CampaignRow, count: number, opts: IssueOptions = {}): Promise<CodeRow[]> {
  if (campaign.type !== 'unique') throw new DiscountError('Only unique campaigns issue personal codes. Use "create public code" for a public campaign.')
  if (!Number.isInteger(count) || count < 1 || count > MAX_CODES_PER_BATCH) throw new DiscountError(`Choose between 1 and ${MAX_CODES_PER_BATCH} codes.`)
  const now = opts.now ?? new Date()
  const expiry = assertIssuable(campaign, now, opts.validDays)
  const percent = resolveIssuePercent(campaign, opts.percent)
  const personal = opts.ownerSubscriberId != null && opts.rewardTier != null

  for (let attempt = 0; attempt < 5; attempt++) {
    const codes = new Set<string>()
    while (codes.size < count) codes.add(generateCode(campaign.prefix))
    const { data, error } = await admin
      .from('discount_codes')
      .insert(Array.from(codes).map(code => ({
        campaign_id: campaign.id,
        code,
        discount_percent: percent,
        starts_at: campaign.starts_at,
        expires_at: expiry.toISOString(),
        max_uses: 1,
        owner_subscriber_id: opts.ownerSubscriberId ?? null,
        reward_tier: opts.rewardTier ?? null,
      })))
      .select('*')
    if (!error) return (data ?? []) as CodeRow[]
    if (error.code !== '23505') throw new DiscountError(`Could not create codes: ${error.message}`)

    // Unique violation: either this subscriber already earned this tier, or a random code collided.
    if (personal) {
      const { data: existing } = await admin
        .from('discount_codes').select('id')
        .eq('owner_subscriber_id', opts.ownerSubscriberId as string).eq('campaign_id', campaign.id).eq('reward_tier', opts.rewardTier as number)
        .maybeSingle()
      if (existing) return []
    }
  }
  throw new DiscountError('Could not generate unique codes; please try again.')
}

/**
 * Creates the single shared code of a public campaign (e.g. BF26-BLACKFRIDAY). Without a
 * suffix a random one is generated. Public codes are unlimited-use unless the campaign sets a cap.
 */
export async function createPublicCode(admin: SupabaseClient, campaign: CampaignRow, suffix?: string, now = new Date()): Promise<CodeRow> {
  if (campaign.type !== 'public') throw new DiscountError('Only public campaigns have a shared code.')
  const expiry = assertIssuable(campaign, now)
  const percent = resolveIssuePercent(campaign)

  let code: string
  if (suffix?.trim()) {
    const s = normalizeSuffix(suffix)
    if (!s) throw new DiscountError('The code ending may only contain letters, digits and hyphens (2-30 characters).')
    code = `${campaign.prefix}${s}`
  } else {
    code = generateCode(campaign.prefix, undefined, 6)
  }
  if (code.length > 40) throw new DiscountError('That code is too long.')

  const { data, error } = await admin
    .from('discount_codes')
    .insert({
      campaign_id: campaign.id,
      code,
      discount_percent: percent,
      starts_at: campaign.starts_at,
      expires_at: expiry.toISOString(),
      max_uses: campaign.max_uses_per_code,
    })
    .select('*')
    .single()
  if (error || !data) {
    if (error?.code === '23505') throw new DiscountError(`The code ${code} already exists.`)
    throw new DiscountError(`Could not create the code: ${error?.message ?? 'unknown error'}`)
  }
  return data as CodeRow
}
