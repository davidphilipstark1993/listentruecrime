export type CampaignType = 'unique' | 'public'

export interface CampaignRow {
  id: string
  created_at: string
  updated_at: string
  prefix: string
  name: string
  notes: string | null
  type: CampaignType
  discount_percent: number
  starts_at: string | null
  expires_at: string | null
  code_valid_days: number | null
  max_uses_per_code: number | null
  is_active: boolean
}

export interface CodeRow {
  id: string
  created_at: string
  campaign_id: string
  code: string
  discount_percent: number
  starts_at: string | null
  expires_at: string
  max_uses: number | null
  use_count: number
  is_active: boolean
  owner_subscriber_id: string | null
  reward_tier: number | null
  email_sent_at: string | null
}

export type CodeFailure =
  | 'empty' | 'multiple' | 'format' | 'not_found' | 'inactive'
  | 'not_started' | 'expired' | 'used' | 'over_max'

/** What the customer is told. Kept in one place so the wording stays consistent. */
export const FAILURE_MESSAGES: Record<CodeFailure, string> = {
  empty: 'Enter a discount code.',
  multiple: 'Only one discount code can be used per order.',
  format: "That doesn't look like a valid discount code. Check it and try again.",
  not_found: "We don't recognise that code. Check it and try again.",
  inactive: 'This code is no longer active.',
  not_started: "This code can't be used yet.",
  expired: 'This code has expired.',
  used: 'This code has already been used.',
  over_max: "This code can't be applied to your order.",
}

export class DiscountError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DiscountError'
  }
}
