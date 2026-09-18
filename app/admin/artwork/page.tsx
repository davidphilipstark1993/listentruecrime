import { createAdminClient } from '@/lib/supabase/admin'
import { ArtworkDashboard } from '@/components/admin/artwork-dashboard'

const LIST_COLUMNS = 'id, title, slug, host_name, image_url, artwork_status, artwork_source, artwork_confidence, artwork_score, artwork_checked_at, artwork_candidate, artwork_manual_override'

export default async function AdminArtworkPage() {
  const admin = createAdminClient()

  const [{ count: total }, { count: withArtwork }, { count: missing }, { count: needsReview }, { count: failed }, { data: podcasts }] = await Promise.all([
    admin.from('podcasts').select('id', { count: 'exact', head: true }),
    admin.from('podcasts').select('id', { count: 'exact', head: true }).in('artwork_status', ['verified', 'found']),
    admin.from('podcasts').select('id', { count: 'exact', head: true }).eq('artwork_status', 'missing'),
    admin.from('podcasts').select('id', { count: 'exact', head: true }).eq('artwork_status', 'needs_review'),
    admin.from('podcasts').select('id', { count: 'exact', head: true }).eq('artwork_status', 'failed'),
    admin.from('podcasts').select(LIST_COLUMNS).order('artwork_checked_at', { ascending: true, nullsFirst: true }).limit(200),
  ])

  const { data: bySourceRows } = await admin.from('podcasts').select('artwork_source').not('artwork_source', 'is', null)
  const bySource: Record<string, number> = {}
  for (const row of bySourceRows ?? []) {
    const key = (row as { artwork_source: string }).artwork_source
    bySource[key] = (bySource[key] ?? 0) + 1
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Podcast artwork</h1>
        <p className="text-stone-subtle text-sm">
          {total ?? 0} podcasts · {withArtwork ?? 0} with artwork · {missing ?? 0} missing · {needsReview ?? 0} need review
        </p>
      </div>

      <ArtworkDashboard
        initialSummary={{ total: total ?? 0, withArtwork: withArtwork ?? 0, missing: missing ?? 0, needsReview: needsReview ?? 0, failed: failed ?? 0, bySource }}
        initialPodcasts={podcasts ?? []}
      />
    </div>
  )
}
