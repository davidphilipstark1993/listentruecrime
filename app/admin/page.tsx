import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Headphones, Mail, MessageSquare, Users, Plus, ArrowRight, Upload } from 'lucide-react'

async function getStats() {
  const admin = createAdminClient()
  const [podcasts, subscribers, reviews, users] = await Promise.all([
    admin.from('podcasts').select('*', { count: 'exact', head: true }).eq('is_published', true),
    admin.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
    admin.from('reviews').select('*', { count: 'exact', head: true }).eq('approved', false).eq('flagged', false),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
  ])
  return {
    podcasts: podcasts.count ?? 0,
    subscribers: subscribers.count ?? 0,
    pendingReviews: reviews.count ?? 0,
    users: users.count ?? 0,
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  const cards = [
    { label: 'Published Podcasts', value: stats.podcasts, href: '/admin/podcasts', icon: Headphones, action: 'Manage', actionHref: '/admin/podcasts' },
    { label: 'Newsletter Subscribers', value: stats.subscribers, href: '/admin/newsletter', icon: Mail, action: 'View list', actionHref: '/admin/newsletter' },
    { label: 'Reviews Pending', value: stats.pendingReviews, href: '/admin/reviews', icon: MessageSquare, action: 'Moderate', actionHref: '/admin/reviews', highlight: stats.pendingReviews > 0 },
    { label: 'Registered Users', value: stats.users, href: '/admin/users', icon: Users, action: 'View all', actionHref: '/admin/users' },
  ]

  const quickActions = [
    { label: 'Add new podcast', href: '/admin/podcasts/new', icon: Plus },
    { label: 'Import CSV', href: '/admin/import', icon: Upload },
    { label: 'Moderate reviews', href: '/admin/reviews', icon: MessageSquare },
    { label: 'Export subscribers', href: '/admin/newsletter', icon: Mail },
  ]

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Dashboard</h1>
        <p className="text-stone-subtle text-sm">ListenTrueCrime admin overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map(card => (
          <Link key={card.label} href={card.href} className="card p-5 hover:bg-white/[0.03] transition-colors group">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${
              card.highlight ? 'bg-crimson/20 text-crimson' : 'bg-white/[0.05] text-stone-muted'
            }`}>
              <card.icon size={16} />
            </div>
            <p className={`text-2xl font-serif font-semibold mb-0.5 ${card.highlight ? 'text-crimson' : 'text-stone'}`}>
              {card.value}
            </p>
            <p className="text-xs text-stone-subtle">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-serif text-stone text-sm uppercase tracking-wide mb-4">Quick actions</h2>
          <div className="space-y-1">
            {quickActions.map(action => (
              <Link key={action.label} href={action.href} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors group">
                <div className="flex items-center gap-2.5">
                  <action.icon size={14} className="text-stone-subtle" />
                  <span className="text-sm text-stone-muted group-hover:text-stone transition-colors">{action.label}</span>
                </div>
                <ArrowRight size={12} className="text-stone-faint group-hover:text-stone-subtle transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-serif text-stone text-sm uppercase tracking-wide mb-4">Site health</h2>
          <div className="space-y-3">
            {[
              { label: 'Published podcasts', ok: stats.podcasts > 0, detail: `${stats.podcasts} live` },
              { label: 'Newsletter active', ok: true, detail: 'Collecting via Supabase' },
              { label: 'Reviews queue', ok: stats.pendingReviews === 0, detail: stats.pendingReviews > 0 ? `${stats.pendingReviews} need review` : 'Clear' },
              { label: 'Search index', ok: true, detail: 'tsvector active' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="text-xs text-stone-muted">{item.label}</span>
                </div>
                <span className={`text-xs ${item.ok ? 'text-stone-subtle' : 'text-amber-400'}`}>{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
