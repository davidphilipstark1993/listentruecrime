import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateArtworkUrl } from '@/lib/artwork/validate'
import { probeImage } from '@/lib/artwork/image-probe'
import { cacheArtwork } from '@/lib/artwork/storage'
import type { StoredArtworkCandidate } from '@/lib/artwork/types'

interface Props {
  params: Promise<{ id: string }>
}

/** Approves the podcast's pending needs_review candidate, promoting it to the live image_url. */
export async function POST(_req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const admin = createAdminClient()

  const { data: podcast, error: loadError } = await admin
    .from('podcasts').select('id, artwork_candidate').eq('id', id).single()
  if (loadError || !podcast) return NextResponse.json({ error: loadError?.message ?? 'Podcast not found' }, { status: 404 })

  const candidate = podcast.artwork_candidate as StoredArtworkCandidate | null
  if (!candidate) return NextResponse.json({ error: 'No pending candidate to approve' }, { status: 400 })

  // Re-validate at approval time rather than trusting the stored result —
  // the remote URL may have changed or gone dead since it was found.
  const { result: validation, buffer } = await validateArtworkUrl(candidate.url)
  if (!validation.valid || !buffer) {
    return NextResponse.json({ error: `Candidate no longer validates: ${validation.reason}` }, { status: 422 })
  }
  const format = probeImage(buffer).format
  if (!format) return NextResponse.json({ error: 'Candidate image format could not be determined' }, { status: 422 })

  const cached = await cacheArtwork(admin, id, buffer, format, validation.contentType)
  if ('error' in cached) return NextResponse.json({ error: `Storage upload failed: ${cached.error}` }, { status: 500 })

  const now = new Date().toISOString()
  const { error: updateError } = await admin.from('podcasts').update({
    image_url: cached.url,
    artwork_original_url: candidate.url,
    artwork_source: candidate.source,
    artwork_status: 'verified',
    artwork_confidence: candidate.confidence,
    artwork_score: candidate.score,
    artwork_match_reason: `${candidate.reasons.join('; ')} (admin-approved)`,
    artwork_error: null,
    artwork_verified_at: now,
    artwork_checked_at: now,
    artwork_candidate: null,
  }).eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, artworkUrl: cached.url })
}
