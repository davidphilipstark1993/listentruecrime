import { z } from 'zod'
import {
  AFFILIATE_CATEGORIES,
  AFFILIATE_PAGE_TYPE_VALUES,
  AFFILIATE_PROVIDER_IDS,
  validateAffiliateUrl,
} from './providers'

// Validation for the admin affiliate API. URLs are trimmed but otherwise
// stored exactly as entered.

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform(v => v || null)

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional()
  .transform(v => v || null)
  .refine(v => !v || /^https:\/\/\S+$/i.test(v), 'Enter a full URL, starting https://')

export const affiliateProductSchema = z
  .object({
    slug: z.string().trim().toLowerCase().min(1, 'Enter a slug').max(120).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only'),
    provider: z.enum(AFFILIATE_PROVIDER_IDS),
    title: z.string().trim().min(1, 'Enter a title').max(200),
    creator: optionalText(200),
    description: optionalText(600),
    destination_url: optionalHttpsUrl,
    affiliate_url: optionalHttpsUrl,
    link_text: optionalText(80),
    image_url: optionalHttpsUrl,
    category: z.enum(AFFILIATE_CATEGORIES.map(c => c.value) as [string, ...string[]]).nullable().optional().transform(v => v ?? null),
    active: z.boolean().default(false),
    disclosure_required: z.boolean().default(true),
    admin_notes: optionalText(2000),
  })
  .superRefine((p, ctx) => {
    if (p.affiliate_url) {
      const msg = validateAffiliateUrl(p.provider, p.affiliate_url)
      if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['affiliate_url'], message: msg })
    }
    if (p.active && !p.affiliate_url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['active'], message: 'Add the affiliate URL before making a product live' })
    }
  })

export type AffiliateProductInput = z.infer<typeof affiliateProductSchema>

export const affiliatePlacementSchema = z.object({
  page_type: z.enum(AFFILIATE_PAGE_TYPE_VALUES),
  page_key: z.string().trim().toLowerCase().min(1, 'Enter the page slug').max(200).regex(/^[a-z0-9-]+$/, 'Enter just the slug, e.g. helter-skelter'),
  position: z.number().int().min(0).max(100).default(0),
  note: optionalText(300),
})
