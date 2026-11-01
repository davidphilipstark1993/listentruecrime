import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { issueConfirmation } from '@/lib/newsletter/confirmation'
import { canResendConfirmation } from '@/lib/newsletter/optin'

interface Props {
  params: Promise<{ id: string }>
}

// POST: admin re-sends the confirmation email to one pending subscriber. Same
// 10-minute cooldown as the public form. Only emails the link; the subscriber
// stays pending until they click it.
export async function POST(_req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('newsletter_subscribers')
    .select('email, first_name, status, confirm_sent_at')
    .eq('id', id)
    .maybeSingle()

  if (!sub) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  if (sub.status !== 'pending') return NextResponse.json({ error: 'Only pending subscribers can be sent a confirmation' }, { status: 400 })
  if (!canResendConfirmation(sub.confirm_sent_at)) {
    return NextResponse.json({ error: 'A confirmation was sent less than 10 minutes ago' }, { status: 429 })
  }

  const ok = await issueConfirmation(admin, sub.email, sub.first_name)
  if (!ok) return NextResponse.json({ error: 'Could not send the confirmation email' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
