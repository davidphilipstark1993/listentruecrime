import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findReferrerByCode } from '@/lib/referrals/service'
import { normalizeReferralCode } from '@/lib/referrals/code'

export const dynamic = 'force-dynamic'

// Lets the sign-up form say "code recognised" as you type. It answers yes/no only: it never
// returns a name or email, and a referral code carries no personal data on its own.
export async function GET(req: Request) {
  const code = normalizeReferralCode(new URL(req.url).searchParams.get('code'))
  if (!code) return NextResponse.json({ valid: false })
  const { referrer } = await findReferrerByCode(createAdminClient(), code)
  return NextResponse.json({ valid: Boolean(referrer) })
}
