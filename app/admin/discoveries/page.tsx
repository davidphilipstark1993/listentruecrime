import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { scoreColor } from '@/lib/utils'
import type { PodcastDiscoveryStatus } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<PodcastDiscoveryStatus, string> = {
  discovered: 'Discovered',
  researching: 'Researching',
  researched: 'Researched',
  shortlisted: 'Shortlisted',
  approved: 'Approved',
  rejected: 'Rejected',
  featured: 'Featured',
}

const STATUS_COLOR: Record<PodcastDiscoveryStatus, string> = {
  discovered: 'bg-white/5 text-stone-subtle',
  researching: 'bg-amber-900/40 text-amber-400',
  researched: 'bg-white/5 text-stone-muted',
  shortlisted: 'bg-gold-faint text-gold-light',
  approved: 'bg-emerald-900/40 text-emerald-400',
  rejected: 'bg-crimson-faint text-crimson',
  featured: 'bg-emerald-900/40 text-emerald-400',
}

async function getDiscoveries() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('podcast_discoveries')
    .select('id, podcast_name, score, status, discovered_at')
    .order('discovered_at', { ascending: false })
    .limit(200)
  return data ?? []
}

export default async function AdminDiscoveriesPage() {
  const discoveries = await getDiscoveries()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Discoveries</h1>
        <p className="text-stone-subtle text-sm">{discoveries.length} candidates from the weekly automation</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Podcast</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Score</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Status</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden sm:table-cell">Discovered</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {discoveries.map(d => (
              <tr key={d.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3 text-stone font-medium">{d.podcast_name}</td>
                <td className={`px-4 py-3 font-medium ${scoreColor(d.score)}`}>{d.score != null ? `${d.score}/10` : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[d.status as PodcastDiscoveryStatus]}`}>
                    {STATUS_LABEL[d.status as PodcastDiscoveryStatus]}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-subtle text-xs hidden sm:table-cell">
                  {new Date(d.discovered_at).toLocaleDateString('en-GB')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/discoveries/${d.id}`} className="text-xs text-stone-muted hover:text-stone transition-colors opacity-0 group-hover:opacity-100 transition-opacity">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {discoveries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-stone-subtle text-sm">
                  No discoveries yet — the weekly automation hasn't run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
