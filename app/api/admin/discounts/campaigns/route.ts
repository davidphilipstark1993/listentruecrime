import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCampaign } from '@/lib/discounts/campaigns'
import { DiscountError } from '@/lib/discounts/types'

// POST: create a campaign (prefix, %, type, expiry) with no code change.
export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError
  try {
    const campaign = await createCampaign(createAdminClient(), await req.json().catch(() => null))
    return NextResponse.json({ campaign })
  } catch (err) {
    if (err instanceof DiscountError) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('Create campaign failed:', err)
    return NextResponse.json({ error: 'Could not create the campaign.' }, { status: 500 })
  }
}
