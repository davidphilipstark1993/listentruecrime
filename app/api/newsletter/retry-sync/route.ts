import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskEmail, syncSubscriber } from '@/lib/email/sendgrid-sync'

export async function POST() {
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: unsynced } = await admin
    .from('newsletter_subscribers')
    .select('email, first_name, last_sync_attempt, sync_error')
    .eq('status', 'active')
    .eq('sendgrid_synced', false)

  let synced = 0
  let awaiting = 0
  const failures: { subscriber: string; error: string }[] = []

  for (const sub of unsynced ?? []) {
    // Per-subscriber failures are recorded on the row by syncSubscriber and
    // reported here; one bad address never stops the rest.
    const result = await syncSubscriber(admin, sub, { checkFirst: true })
    if (result.state === 'synced') synced++
    else if (result.state === 'awaiting') awaiting++
    else failures.push({ subscriber: maskEmail(sub.email), error: result.error ?? 'Unknown error' })
  }

  return NextResponse.json({
    ok: true,
    attempted: unsynced?.length ?? 0,
    synced,
    awaiting,
    failed: failures.length,
    failures,
  })
}
