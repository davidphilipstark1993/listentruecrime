import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recomputeNewsletterStatus } from '@/lib/newsletter/week'

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

const EDITABLE_FIELDS = [
  'podcast_name', 'podcast_url', 'website_url', 'rss_url', 'hosts', 'description',
  'recommendation', 'notes', 'curator_rating', 'artwork_url', 'additional_info',
  'status', 'matched_podcast_id',
] as const

export async function PATCH(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field]
  }
  if (typeof update.podcast_name === 'string') {
    update.normalized_name = update.podcast_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }
  if (update.status && !['draft', 'approved'].includes(update.status as string)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: submission, error } = await admin
    .from('newsletter_submissions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error || !submission) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  }

  // Any edit — including re-approving after a prior downgrade — recomputes
  // the parent newsletter's status. Editing a submission after the whole
  // newsletter was approved for sending always drops it back to
  // draft/review, so a last-minute change can never sneak past
  // re-confirmation of the explicit send approval.
  const { approvedCount, status } = await recomputeNewsletterStatus(admin, submission.newsletter_id)

  return NextResponse.json({ ok: true, submission, newsletterStatus: status, approvedCount })
}

export async function DELETE(_req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const admin = createAdminClient()

  const { data: submission } = await admin.from('newsletter_submissions').select('newsletter_id').eq('id', id).single()
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await admin.from('newsletter_submissions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { approvedCount, status } = await recomputeNewsletterStatus(admin, submission.newsletter_id)

  return NextResponse.json({ ok: true, newsletterStatus: status, approvedCount })
}
