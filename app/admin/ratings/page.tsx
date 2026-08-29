import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

async function getRatings() {
  const admin = createAdminClient()
  const { data: ratings } = await admin
    .from('ratings')
    .select(`
      id, user_id, overall_score, storytelling_score, research_score, host_quality_score,
      production_score, binge_factor_score, factual_accuracy_score, created_at,
      podcast:podcasts(title, slug)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  if (!ratings?.length) return []

  // ratings.user_id has no FK relationship registered for PostgREST to embed
  // profiles directly, so look usernames up separately and merge in JS.
  const userIds = Array.from(new Set(ratings.map(r => r.user_id)))
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username')
    .in('id', userIds)
  const usernameById = new Map((profiles ?? []).map(p => [p.id, p.username]))

  return ratings.map(r => ({ ...r, username: usernameById.get(r.user_id) ?? null }))
}

export default async function AdminRatingsPage() {
  const ratings = await getRatings()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Community ratings</h1>
        <p className="text-stone-subtle text-sm">{ratings.length} rating{ratings.length === 1 ? '' : 's'} (most recent 500)</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Podcast</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">User</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Overall</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Rated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {ratings.map((r: any) => (
              <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-stone text-sm">
                  {r.podcast?.slug ? (
                    <Link href={`/podcasts/${r.podcast.slug}`} className="hover:text-crimson transition-colors">
                      {r.podcast?.title ?? 'Unknown podcast'}
                    </Link>
                  ) : (
                    r.podcast?.title ?? 'Unknown podcast'
                  )}
                </td>
                <td className="px-4 py-3 text-stone-subtle text-sm">{r.username ?? 'Unknown user'}</td>
                <td className="px-4 py-3 text-gold-light text-sm font-medium">{r.overall_score}/10</td>
                <td className="px-4 py-3 text-stone-subtle text-xs">
                  {new Date(r.created_at).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {ratings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-subtle text-sm">
                  No ratings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
