// Single source of truth for the "Promote Your Podcast" offer. Prices,
// inclusions and CTA labels are provisional — edit them here and every
// surface (landing page cards, enquiry form options, structured data,
// admin labels, confirmation emails) picks the change up.
//
// No payments are taken yet — every CTA leads to an enquiry.

export type PromotionPackageId = 'featured' | 'newsletter' | 'package'
export type PromotionInterest = PromotionPackageId | 'free_listing' | 'not_sure'

export interface PromotionPackage {
  id: PromotionPackageId
  name: string
  price: string
  /** Machine-readable price for structured data. `from: true` means "from £X". */
  schemaPrice: { amount: number; from: boolean; unit?: 'MONTH' }
  summary: string
  includes: string[]
  note?: string
  cta: string
  highlighted?: boolean
}

export const promotionPackages: PromotionPackage[] = [
  {
    id: 'featured',
    name: 'Featured Podcast',
    price: '£49 / month',
    schemaPrice: { amount: 49, from: false, unit: 'MONTH' },
    summary: 'Ongoing visibility for your show in the places listeners go looking for something new.',
    includes: [
      'Featured placement on relevant ListenTrueCrime pages',
      'Enhanced podcast profile',
      'Featured podcast badge, clearly labelled as promoted',
      'Promotional link to your podcast',
      'Inclusion in relevant discovery areas',
      'Basic performance reporting where technically available',
    ],
    cta: 'Enquire About Featured',
  },
  {
    id: 'newsletter',
    name: 'Newsletter Promotion',
    price: 'From £75',
    schemaPrice: { amount: 75, from: true },
    summary: 'A single promotional slot in the weekly ListenTrueCrime newsletter.',
    includes: [
      'Promotional placement in a ListenTrueCrime newsletter',
      'Your podcast description',
      'Artwork',
      'Direct listening link',
      'Clearly labelled as a sponsored placement',
    ],
    note: 'Newsletter placements are subject to availability and editorial suitability.',
    cta: 'Ask About Newsletter Promotion',
  },
  {
    id: 'package',
    name: 'Podcast Promotion Package',
    price: 'From £149',
    schemaPrice: { amount: 149, from: true },
    summary: 'A planned campaign combining site placement and newsletter exposure.',
    includes: [
      'Featured podcast placement',
      'Enhanced podcast profile',
      'Newsletter promotional opportunity',
      'Promotional article or content opportunity where appropriate',
      'Links to your podcast',
      'Campaign period agreed in advance',
    ],
    cta: 'Discuss a Promotion Package',
    highlighted: true,
  },
]

export const PROMOTION_INTEREST_OPTIONS: { value: PromotionInterest; label: string }[] = [
  ...promotionPackages.map(p => ({ value: p.id, label: p.name })),
  { value: 'free_listing', label: 'Free listing only' },
  { value: 'not_sure', label: "Not sure / I'd like advice" },
]

export const PROMOTION_INTEREST_VALUES = PROMOTION_INTEREST_OPTIONS.map(o => o.value) as [PromotionInterest, ...PromotionInterest[]]

export function promotionInterestLabel(value: string): string {
  return PROMOTION_INTEREST_OPTIONS.find(o => o.value === value)?.label ?? value
}

export const CAMPAIGN_TIMING_OPTIONS = [
  { value: 'asap', label: 'As soon as possible' },
  { value: 'within_month', label: 'Within the next month' },
  { value: '1_3_months', label: 'In one to three months' },
  { value: 'flexible', label: 'Later / flexible' },
  { value: 'not_sure', label: 'Not sure yet' },
] as const

export type CampaignTiming = (typeof CAMPAIGN_TIMING_OPTIONS)[number]['value']
export const CAMPAIGN_TIMING_VALUES = CAMPAIGN_TIMING_OPTIONS.map(o => o.value) as [CampaignTiming, ...CampaignTiming[]]

export function campaignTimingLabel(value: string | null): string {
  if (!value) return 'Not specified'
  return CAMPAIGN_TIMING_OPTIONS.find(o => o.value === value)?.label ?? value
}

export const PROMOTION_ENQUIRY_STATUSES = ['new', 'contacted', 'quoted', 'won', 'declined', 'completed'] as const
export type PromotionEnquiryStatus = (typeof PROMOTION_ENQUIRY_STATUSES)[number]

export const PROMOTE_PATH = '/promote-your-podcast'
export const PROMOTE_CONTACT_PATH = '/promote-your-podcast/contact'

export function enquiryHref(interest?: PromotionInterest) {
  return interest ? `${PROMOTE_CONTACT_PATH}?package=${interest}` : PROMOTE_CONTACT_PATH
}
