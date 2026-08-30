import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { subscribeSendGrid } from '@/lib/email/sendgrid-contacts'

export async function POST() {
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: unsynced } = await admin
    .from('newsletter_subscribers')
    .select('email, first_name')
    .eq('status', 'active')
    .eq('sendgrid_synced', false)

  let synced = 0
  for (const sub of unsynced ?? []) {
    try {
      const jobId = await subscribeSendGrid(sub.email, sub.first_name)
      await admin
        .from('newsletter_subscribers')
        .update({ sendgrid_synced: true, sendgrid_contact_id: jobId })
        .eq('email', sub.email)
      synced++
    } catch (err) {
      console.error(`Retry sync failed for ${sub.email}:`, err)
      // continue with remaining subscribers
    }
  }

  return NextResponse.json({ ok: true, synced, attempted: unsynced?.length ?? 0 })
}
