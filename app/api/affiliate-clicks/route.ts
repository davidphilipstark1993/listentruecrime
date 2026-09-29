import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { AFFILIATE_PROVIDER_IDS } from '@/lib/affiliates/providers'

// Receives the sendBeacon() fired by <AffiliateLink> on click. Stores
// only provider / product / page / placement and the server timestamp —
// no IP address, user agent, cookies or user ID. Always answers 204 so a
// failed write never surfaces to the visitor.

const clickSchema = z.object({
  provider: z.enum(AFFILIATE_PROVIDER_IDS),
  product_slug: z.string().trim().max(120).regex(/^[a-z0-9-]+$/).optional(),
  placement: z.string().trim().max(60).optional(),
  page_path: z.string().trim().max(300).startsWith('/'),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const parsed = clickSchema.safeParse(body)
  if (!parsed.success) return new NextResponse(null, { status: 204 })

  const { provider, product_slug, placement, page_path } = parsed.data
  const supabase = createAdminClient()

  let product_id: string | null = null
  if (product_slug) {
    const { data } = await supabase.from('affiliate_products').select('id').eq('slug', product_slug).maybeSingle()
    product_id = data?.id ?? null
  }

  const { error } = await supabase.from('affiliate_clicks').insert({
    provider,
    product_id,
    product_slug: product_slug ?? null,
    placement: placement ?? null,
    // Path only — strip any query string or fragment in case one slipped through
    page_path: page_path.split(/[?#]/)[0],
  })
  if (error) console.error('Affiliate click insert error:', error.message)

  return new NextResponse(null, { status: 204 })
}
