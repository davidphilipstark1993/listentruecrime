import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendApprovedManualNewsletter } from '@/lib/newsletter/manualSend'

interface Props {
  params: Promise<{ id: string }>
}

// Extra headroom over the platform default — this does several sequential
// DB round trips plus a SendGrid call before it can return, and a
// serverless timeout here returns an empty body that the client can't
// parse as JSON, looking like a crash even when it's really just slow.
export const maxDuration = 60

// Sends immediately instead of waiting for the Sunday cron. Uses the exact
// same send logic (lib/newsletter/manualSend.ts) as
// scripts/newsletter/weekly-send.ts, so this can never produce different
// content than the scheduled send would have. Still enforces the same
// gate: exactly 5 approved podcasts AND explicit "approve for sending".
export async function POST(_req: Request, { params }: Props) {
  const { id } = await params
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Wrapped so a thrown error (e.g. email provider misconfigured, API
  // failure) still returns a JSON body — an uncaught exception here gives
  // the client an empty 500 response it can't parse as JSON.
  try {
    const result = await sendApprovedManualNewsletter(admin, id)

    if (!result.ok) {
      const message = result.reason === 'not_ready'
        ? `Not ready to send — ${result.approvedCount}/5 approved, explicitly approved for sending: ${result.explicitlyApproved ? 'yes' : 'no'}.`
        : 'No active subscribers to send to.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, sentCount: result.sentCount, campaignId: result.campaignId })
  } catch (err) {
    console.error('Newsletter send-now error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 })
  }
}
