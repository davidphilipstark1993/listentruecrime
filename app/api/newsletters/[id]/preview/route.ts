import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { previewManualNewsletter } from '@/lib/newsletter/manualSend'

interface Props {
  params: Promise<{ id: string }>
}

// Renders the newsletter from whatever's currently approved — no DB writes,
// no send. Works with fewer than 5 approved so a curator can check
// formatting mid-week, not just once everything is finalized.
export async function GET(_req: Request, { params }: Props) {
  const { id } = await params
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  try {
    const { html } = await previewManualNewsletter(admin, id)
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Preview failed' }, { status: 404 })
  }
}
