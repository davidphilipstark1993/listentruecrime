import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Props {
  params: Promise<{ id: string }>
}

// Explicit, separate action from the automated-discovery approve flow
// (app/api/newsletter-issues/[id]/approve). This is the "global newsletter
// approved for sending" gate for the manual weekly workflow — it does NOT
// generate content (the Sunday job does that), it only records that the
// curator has explicitly signed off, and only when exactly 5 submissions
// are individually approved.
export async function POST(_req: Request, { params }: Props) {
  const { id } = await params
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: newsletter } = await admin.from('newsletters').select('*').eq('id', id).single()
  if (!newsletter) return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })

  const { data: submissions } = await admin.from('newsletter_submissions').select('status').eq('newsletter_id', id)
  const approvedCount = (submissions ?? []).filter(s => s.status === 'approved').length

  if (approvedCount !== 5) {
    return NextResponse.json({ error: `Exactly 5 approved podcasts are required — currently ${approvedCount}` }, { status: 400 })
  }

  const { error } = await admin.from('newsletters').update({ status: 'approved' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: 'approved' })
}
