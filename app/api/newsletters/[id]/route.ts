import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recomputeNewsletterStatus } from '@/lib/newsletter/week'

interface Props {
  params: Promise<{ id: string }>
}

const SECTION_FIELDS = ['editors_note', 'body', 'conclusion'] as const
const MAX_SECTION_LENGTH = 5000

// Saves the free-text sections around the five podcasts (editor's note,
// body, conclusion/preview). Like every other edit to a manual newsletter,
// changing the text after the whole issue was approved for sending drops it
// back to draft/review, so a last-minute change can't be sent unseen.
export async function PATCH(req: Request, { params }: Props) {
  const { id } = await params
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload = await req.json()
  const update: Record<string, string | null> = {}
  for (const field of SECTION_FIELDS) {
    if (!(field in payload)) continue
    const value = payload[field]
    if (value !== null && typeof value !== 'string') {
      return NextResponse.json({ error: `${field} must be text` }, { status: 400 })
    }
    if (typeof value === 'string' && value.length > MAX_SECTION_LENGTH) {
      return NextResponse.json({ error: `${field} is too long (max ${MAX_SECTION_LENGTH} characters)` }, { status: 400 })
    }
    update[field] = value?.trim() ? value.trim() : null
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin.from('newsletters').select('status').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
  if (existing.status === 'sent' || existing.status === 'archived') {
    return NextResponse.json({ error: 'This issue has already been sent' }, { status: 409 })
  }

  const { data: newsletter, error } = await admin.from('newsletters').update(update).eq('id', id).select().single()
  if (error || !newsletter) return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })

  const { status } = await recomputeNewsletterStatus(admin, id)
  return NextResponse.json({ ok: true, newsletter: { ...newsletter, status }, newsletterStatus: status })
}
