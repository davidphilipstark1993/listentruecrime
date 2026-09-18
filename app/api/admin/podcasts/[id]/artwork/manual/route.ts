import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateArtworkUrl } from '@/lib/artwork/validate'
import { probeImage } from '@/lib/artwork/image-probe'
import { cacheArtwork } from '@/lib/artwork/storage'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Admin-supplied artwork URL. Still goes through the full validation
 * pipeline (SSRF-safe fetch, genuine-image check, size/dimension floor) —
 * "an admin typed it" is not an exemption from those checks. Once set,
 * artwork_manual_override protects it from every future automated run
 * until an admin explicitly resets the override.
 */
export async function POST(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { url?: string }
  const url = body.url?.trim()
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const { result: validation, buffer } = await validateArtworkUrl(url)
  if (!validation.valid || !buffer) {
    return NextResponse.json({ error: `Image failed validation: ${validation.reason}` }, { status: 422 })
  }
  const format = probeImage(buffer).format
  if (!format) return NextResponse.json({ error: 'Image format could not be determined' }, { status: 422 })

  const admin = createAdminClient()
  const cached = await cacheArtwork(admin, id, buffer, format, validation.contentType)
  if ('error' in cached) return NextResponse.json({ error: `Storage upload failed: ${cached.error}` }, { status: 500 })

  const now = new Date().toISOString()
  const { error } = await admin.from('podcasts').update({
    image_url: cached.url,
    artwork_original_url: url,
    artwork_source: 'manual',
    artwork_status: 'verified',
    artwork_confidence: 'high',
    artwork_score: null,
    artwork_match_reason: 'Manually supplied by admin',
    artwork_error: null,
    artwork_manual_override: true,
    artwork_verified_at: now,
    artwork_checked_at: now,
    artwork_candidate: null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, artworkUrl: cached.url })
}
