import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Discards the podcast's pending needs_review candidate.
 * - Default (REJECT): clears the candidate, status reverts to missing/failed
 *   so a future batch run tries again (possibly finding a different match).
 * - markMissing (MARK AS MISSING): status becomes 'skipped' — a terminal
 *   state batch recovery scopes never pick up, for an admin's considered
 *   "no genuine artwork exists" judgment call, not left to keep retrying.
 */
export async function POST(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { markMissing?: boolean }

  const admin = createAdminClient()
  const { data: podcast } = await admin.from('podcasts').select('id, image_url').eq('id', id).single()
  if (!podcast) return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })

  const status = body.markMissing ? 'skipped' : podcast.image_url ? 'failed' : 'missing'

  const { error } = await admin.from('podcasts').update({
    artwork_candidate: null,
    artwork_status: status,
    artwork_checked_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}
