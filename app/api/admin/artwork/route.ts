import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const LIST_COLUMNS = 'id, title, slug, host_name, image_url, artwork_status, artwork_source, artwork_confidence, artwork_score, artwork_checked_at, artwork_candidate, artwork_manual_override'

/**
 * Summary counts + a filterable podcast list for the /admin/artwork
 * dashboard. Counts are always computed across the full table regardless
 * of the list filters, so the summary cards stay stable while filtering.
 */
export async function GET(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const admin = createAdminClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const source = searchParams.get('source')
  const confidence = searchParams.get('confidence')
  const query = searchParams.get('q')?.trim()
  const limit = Math.min(Number(searchParams.get('limit') ?? 200) || 200, 500)

  const [{ count: total }, { count: withArtwork }, { count: missing }, { count: needsReview }, { count: failed }, { data: recent }] = await Promise.all([
    admin.from('podcasts').select('id', { count: 'exact', head: true }),
    admin.from('podcasts').select('id', { count: 'exact', head: true }).in('artwork_status', ['verified', 'found']),
    admin.from('podcasts').select('id', { count: 'exact', head: true }).eq('artwork_status', 'missing'),
    admin.from('podcasts').select('id', { count: 'exact', head: true }).eq('artwork_status', 'needs_review'),
    admin.from('podcasts').select('id', { count: 'exact', head: true }).eq('artwork_status', 'failed'),
    admin.from('podcasts').select('id, title, artwork_source, artwork_checked_at').not('artwork_checked_at', 'is', null)
      .order('artwork_checked_at', { ascending: false }).limit(10),
  ])

  const { data: bySourceRows } = await admin.from('podcasts').select('artwork_source').not('artwork_source', 'is', null)
  const sourceCounts: Record<string, number> = {}
  for (const row of bySourceRows ?? []) {
    const key = (row as { artwork_source: string }).artwork_source
    sourceCounts[key] = (sourceCounts[key] ?? 0) + 1
  }

  let listQuery = admin.from('podcasts').select(LIST_COLUMNS).order('artwork_checked_at', { ascending: true, nullsFirst: true }).limit(limit)
  if (status) listQuery = listQuery.eq('artwork_status', status)
  if (source) listQuery = listQuery.eq('artwork_source', source)
  if (confidence) listQuery = listQuery.eq('artwork_confidence', confidence)
  if (query) listQuery = listQuery.ilike('title', `%${query}%`)

  const { data: podcasts, error: listError } = await listQuery
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  return NextResponse.json({
    summary: {
      total: total ?? 0,
      withArtwork: withArtwork ?? 0,
      missing: missing ?? 0,
      needsReview: needsReview ?? 0,
      failed: failed ?? 0,
      bySource: sourceCounts,
      recentlyRecovered: recent ?? [],
    },
    podcasts: podcasts ?? [],
  })
}
