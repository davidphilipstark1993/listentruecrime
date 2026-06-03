import { createAdminClient } from '@/lib/supabase/admin'
import { Mail, Download } from 'lucide-react'

async function getSubscribers() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function AdminNewsletterPage() {
  const subscribers = await getSubscribers()

  const bySource = subscribers.reduce((acc: Record<string, number>, s: any) => {
    acc[s.source] = (acc[s.source] ?? 0) + 1
    return acc
  }, {})

  const csvContent = [
    'email,source,joined',
    ...subscribers.map((s: any) =>
      `${s.email},${s.source},${new Date(s.created_at).toLocaleDateString('en-GB')}`
    ),
  ].join('\n')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl mb-1">Newsletter waitlist</h1>
          <p className="text-stone-subtle text-sm">{subscribers.length} subscribers</p>
        </div>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`}
          download="newsletter-subscribers.csv"
          className="btn-outline flex items-center gap-2 text-sm"
        >
          <Download size={14} /> Export CSV
        </a>
      </div>

      {/* Source breakdown */}
      {Object.keys(bySource).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {Object.entries(bySource).map(([source, count]) => (
            <div key={source} className="card p-4">
              <p className="text-lg font-serif font-semibold text-stone">{count as number}</p>
              <p className="text-xs text-stone-subtle mt-0.5 truncate">{source}</p>
            </div>
          ))}
        </div>
      )}

      {subscribers.length === 0 ? (
        <div className="text-center py-24">
          <Mail size={32} className="mx-auto text-stone-subtle mb-3" />
          <p className="text-stone-muted">No subscribers yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Email</th>
                <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden sm:table-cell">Source</th>
                <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {subscribers.map((s: any) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-stone">{s.email}</td>
                  <td className="px-4 py-3 text-stone-subtle text-xs hidden sm:table-cell">{s.source}</td>
                  <td className="px-4 py-3 text-stone-subtle text-xs">
                    {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
