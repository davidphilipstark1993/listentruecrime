import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Mic2, MessageSquare, Users, Star } from 'lucide-react'

async function getStats() {
  const admin = createAdminClient()
  const [podcasts, reviews, subscribers, ratings] = await Promise.all([
    admin.from('podcasts').select('id', { count: 'exact', head: true }),
    admin.from('reviews').select('id', { count: 'exact', head: true }).eq('approved', false),
    admin.from('newsletter_subscribers').select('id', { count: 'exact', head: true }),
    admin.from('ratings').select('id', { count: 'exact', head: true }),
  ])
  return {
    podcasts: podcasts.count ?? 0,
    pendingReviews: reviews.count ?? 0,
    subscribers: subscribers.count ?? 0,
    ratings: ratings.count ?? 0,
  }
}

async function getRecentPodcasts() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('podcasts')
    .select('id, title, slug, is_published, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export default async function AdminDashboard() {
  const [stats, recentPodcasts] = await Promise.all([getStats(), getRecentPodcasts()])

  const cards = [
    { label: 'Total podcasts', value: stats.podcasts, icon: Mic2, href: '/admin/podcasts', color: 'text-crimson' },
    { label: 'Pending reviews', value: stats.pendingReviews, icon: MessageSquare, href: '/admin/reviews', color: 'text-gold-light' },
    { label: 'Newsletter subs', value: stats.subscribers, icon: Users, href: '#', color: 'text-stone' },
    { label: 'Community ratings', value: stats.ratings, icon: Star, href: '#', color: 'text-gold-light' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Dashboard</h1>
        <p className="text-stone-subtle text-sm">ListenTrueCrime admin panel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map(c => (
          <Link key={c.label} href={c.href} className="card p-5 hover:border-white/20 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <c.icon size={18} className={c.color} />
            </div>
            <p className={`text-2xl font-serif font-semibold ${c.color}`}>{c.value}</p>
            <p className="text-stone-subtle text-xs mt-1">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <Link href="/admin/podcasts/new" className="btn-primary text-center py-3">Add podcast</Link>
        <Link href="/admin/import" className="btn-outline text-center py-3">Import CSV</Link>
        <Link href="/admin/reviews" className="btn-outline text-center py-3">
          Moderate reviews {stats.pendingReviews > 0 && `(${stats.pendingReviews})`}
        </Link>
      </div>

      {/* Recent podcasts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg text-stone">Recent podcasts</h2>
          <Link href="/admin/podcasts" className="text-xs text-stone-muted hover:text-stone transition-colors">View all</Link>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Title</th>
                <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Status</th>
                <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentPodcasts.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-stone text-sm">{p.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-stone-subtle'}`}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-subtle text-xs">
                    {new Date(p.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/podcasts/${p.id}`} className="text-xs text-stone-muted hover:text-stone transition-colors">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
