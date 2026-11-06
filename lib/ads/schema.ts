import { z } from 'zod'
import { AD_PLACEMENT_KEYS } from './placements'

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform(v => v || null)

const optionalDate = z
  .string()
  .datetime({ offset: true, message: 'Enter a valid date and time' })
  .nullable()
  .optional()
  .transform(v => v || null)

const httpsUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(v => /^https:\/\/[^\s/]+\.[^\s/]+/i.test(v), 'Enter a full link starting https://')
  .refine(v => {
    try { return Boolean(new URL(v).hostname) } catch { return false }
  }, 'That link does not look valid')

// Uploaded by /api/admin/ads/upload as <uuid>.<ext> — nothing else is accepted,
// so a crafted request can't point an advert at an arbitrary storage object.
const imagePath = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/, 'Upload an image')

const base = z.object({
  title: z.string().trim().min(1, 'Enter a title').max(80, 'Keep the title under 80 characters'),
  description: optionalText(220),
  destination_url: httpsUrl,
  button_text: z.string().trim().min(1, 'Enter the button text').max(30, 'Keep the button text under 30 characters'),
  image_path: imagePath,
  image_alt: optionalText(200),
  image_width: z.number().int().positive(),
  image_height: z.number().int().positive(),
  placements: z
    .array(z.enum(AD_PLACEMENT_KEYS))
    .min(1, 'Choose at least one placement')
    .transform(v => Array.from(new Set(v))),
  sort_order: z.number().int().min(0).max(999).default(10),
  is_active: z.boolean().default(false),
  starts_at: optionalDate,
  ends_at: optionalDate,
  utm_campaign: z
    .string()
    .trim()
    .toLowerCase()
    .max(60)
    .regex(/^[a-z0-9_-]*$/, 'Use lowercase letters, numbers, hyphens and underscores only')
    .nullable()
    .optional()
    .transform(v => v || null),
})

function checkDates(v: { starts_at?: string | null; ends_at?: string | null }, ctx: z.RefinementCtx) {
  if (v.starts_at && v.ends_at && new Date(v.ends_at) <= new Date(v.starts_at)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ends_at'], message: 'The end date must be after the start date' })
  }
}

export const adSchema = base.superRefine(checkDates)

// Partial update (toggle live, archive, quick edits). Unspecified fields are untouched.
export const adPatchSchema = base
  .partial()
  .extend({ archived: z.boolean().optional() })
  .superRefine(checkDates)

export type AdInput = z.infer<typeof adSchema>
