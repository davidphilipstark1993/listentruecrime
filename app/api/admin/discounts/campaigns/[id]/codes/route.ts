import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicCode, getCampaign, issueUniqueCodes } from '@/lib/discounts/campaigns'
import { DiscountError } from '@/lib/discounts/types'

const schema = z.object({
  /** unique campaigns: how many personal single-use codes to create */
  count: z.number().int().min(1).max(200).optional(),
  /** public campaigns: the part after the prefix (BLACKFRIDAY in BF26-BLACKFRIDAY); random if empty */
  suffix: z.string().max(40).optional(),
})

// POST: generate codes for a campaign.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { id } = await params
  const admin = createAdminClient()
  try {
    const campaign = await getCampaign(admin, id)
    const codes = campaign.type === 'public'
      ? [await createPublicCode(admin, campaign, parsed.data.suffix)]
      : await issueUniqueCodes(admin, campaign, parsed.data.count ?? 1)
    return NextResponse.json({ codes })
  } catch (err) {
    if (err instanceof DiscountError) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('Generate codes failed:', err)
    return NextResponse.json({ error: 'Could not generate codes.' }, { status: 500 })
  }
}
