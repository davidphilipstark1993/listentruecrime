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

export default async function AdminPage() {
  const subscribers = await getSubscribers()

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
          <p className="text-stone-subtle text-sm">{subscribers.length} {subscribers.length === 1 ? 'person' : 'people'} signed up</p>
        </div>
        {subscribers.length > 0 && (
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`}
            download="newsletter-waitlist.csv"
            className="btn-outline flex items-center gap-2 text-sm"
          >
            <Download size={14} /> Export CSV
          </a>
        )}
      </div>

      {subscribers.length === 0 ? (
        <div className="text-center py-32">
          <Mail size={36} className="mx-auto text-stone-subtle mb-4" />
          <p className="text-stone text-base mb-1">No signups yet</p>
          <p className="text-stone-subtle text-sm">Emails collected from the site will appear here.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3 text-stone-subtle text-xs font-medium">Email</th>
                <th className="text-left px-5 py-3 text-stone-subtle text-xs font-medium hidden sm:table-cell">Source</th>
                <th className="text-left px-5 py-3 text-stone-subtle text-xs font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {subscribers.map((s: any) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-stone">{s.email}</td>
                  <td className="px-5 py-3 text-stone-subtle text-xs hidden sm:table-cell capitalize">
                    {s.source?.replace(/_/g, ' ') ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-stone-subtle text-xs">
                    {new Date(s.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
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
