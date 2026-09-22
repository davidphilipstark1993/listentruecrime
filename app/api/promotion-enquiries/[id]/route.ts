import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PROMOTION_ENQUIRY_STATUSES } from '@/lib/promotion/packages'

interface Props {
  params: Promise<{ id: string }>
}

async function requireAdmin() {
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { error: null }
}

// PATCH: admin updates an enquiry's status and/or private notes.
export async function PATCH(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if ('status' in body) {
    if (!(PROMOTION_ENQUIRY_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }
  if ('admin_notes' in body) {
    update.admin_notes = typeof body.admin_notes === 'string' && body.admin_notes.trim() ? body.admin_notes.slice(0, 5000) : null
  }
  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: enquiry, error } = await admin
    .from('podcast_promotion_enquiries')
    .update(update)
    .eq('id', id)
    .select('id, status, admin_notes')
    .single()

  if (error || !enquiry) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, enquiry })
}
