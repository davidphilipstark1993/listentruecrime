import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resendRewardEmail } from '@/lib/referrals/service'

const schema = z.object({ isActive: z.boolean().optional(), resendEmail: z.boolean().optional() })

// PATCH: deactivate / reactivate one code, or re-send a referral reward email.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { id } = await params
  const admin = createAdminClient()

  if (parsed.data.isActive !== undefined) {
    const { error } = await admin.from('discount_codes').update({ is_active: parsed.data.isActive }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (parsed.data.resendEmail) {
    const sent = await resendRewardEmail(admin, id)
    if (!sent) return NextResponse.json({ error: 'Could not send: this code has no owner, has expired, or the email failed (check the logs).' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
