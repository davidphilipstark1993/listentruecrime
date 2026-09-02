import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NewsletterStatus } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

const STATUS_COLOR: Record<NewsletterStatus, string> = {
  draft: 'bg-white/5 text-stone-subtle',
  review: 'bg-amber-900/40 text-amber-400',
  approved: 'bg-gold-faint text-gold-light',
  sent: 'bg-emerald-900/40 text-emerald-400',
  archived: 'bg-white/5 text-stone-muted',
}

async function getNewsletters() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('newsletters')
    .select('id, title, issue_number, publication_date, status, sent_at')
    .order('issue_number', { ascending: false })
  return data ?? []
}

export default async function AdminNewsletterIssuesPage() {
  const newsletters = await getNewsletters()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Newsletter Issues</h1>
        <p className="text-stone-subtle text-sm">{newsletters.length} issues</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Issue</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Title</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Status</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden sm:table-cell">Publication date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {newsletters.map(n => (
              <tr key={n.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3 text-stone-subtle text-xs">#{n.issue_number}</td>
                <td className="px-4 py-3 text-stone font-medium">{n.title}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[n.status as NewsletterStatus]}`}>
                    {n.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-subtle text-xs hidden sm:table-cell">
                  {new Date(n.publication_date).toLocaleDateString('en-GB')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/newsletter-issues/${n.id}`} className="text-xs text-stone-muted hover:text-stone transition-colors opacity-0 group-hover:opacity-100 transition-opacity">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {newsletters.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-stone-subtle text-sm">
                  No newsletter issues yet — the weekly automation hasn't run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
