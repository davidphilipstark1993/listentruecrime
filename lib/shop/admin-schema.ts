import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max).nullable().optional().transform(v => v || null)

export const RESERVED_SLUGS = ['basket', 'category', 'checkout', 'shipping-policy', 'returns-and-refunds']

const imageSchema = z.object({
  url: z.string().trim().url().max(2000).refine(u => u.startsWith('https://'), 'Image URLs must start with https://'),
  alt: z.string().trim().max(300).default(''),
  placeholder: z.boolean().optional(),
})

export const productSchema = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(120).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only')
    .refine(s => !RESERVED_SLUGS.includes(s), 'That slug is reserved'),
  title: z.string().trim().min(1, 'Enter a title').max(200),
  category: z.enum(['t-shirts', 'hoodies', 'mugs', 'accessories']),
  short_description: text(300),
  description: text(4000),
  images: z.array(imageSchema).max(20).default([]),
  specs: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  size_guide: z.object({
    unit: z.string().max(10).optional(),
    columns: z.array(z.string().max(40)).min(1).max(8),
    rows: z.array(z.array(z.string().max(40)).max(8)).max(30),
  }).nullable().optional().transform(v => v ?? null),
  printify_product_id: text(100),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  is_best_seller: z.boolean().default(false),
  is_new: z.boolean().default(false),
  is_placeholder: z.boolean().default(true),
  sort_order: z.number().int().min(-1000).max(1000).default(0),
  seo_title: text(120),
  seo_description: text(320),
  admin_notes: text(2000),
})

export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  printify_variant_id: z.number().int().positive().nullable().optional().transform(v => v ?? null),
  sku: text(100),
  colour: z.string().trim().min(1).max(60),
  colour_hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #0a0a0f').nullable().optional().transform(v => v || null),
  size: z.string().trim().min(1).max(40),
  price_pence: z.number().int().min(1).max(1_000_000).nullable().optional().transform(v => v ?? null),
  cost_minor: z.number().int().min(0).max(1_000_000).nullable().optional().transform(v => v ?? null),
  is_enabled: z.boolean().default(true),
  sort_order: z.number().int().default(0),
})

export const productSaveSchema = z.object({
  product: productSchema,
  variants: z.array(variantSchema).max(100),
})

export const settingsSchema = z.object({
  printify_cost_currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code'),
  printify_to_gbp_rate: z.number().positive().max(100).nullable(),
  stripe_fee_percent: z.number().min(0).max(10),
  stripe_fee_fixed_pence: z.number().min(0).max(100),
  vat_percent: z.number().min(0).max(30),
})

export const orderActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('retry') }),
  z.object({ action: z.literal('sync') }),
  z.object({ action: z.literal('send_to_production') }),
  z.object({ action: z.literal('resend_confirmation') }),
  z.object({ action: z.literal('refund'), amountPence: z.number().int().min(1).nullable().optional() }),
  z.object({ action: z.literal('link_printify'), printifyOrderId: z.string().trim().min(5).max(100) }),
  z.object({ action: z.literal('note'), notes: z.string().max(4000) }),
])
