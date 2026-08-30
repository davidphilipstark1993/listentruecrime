import { createAdminClient } from '@/lib/supabase/admin'
import { RetrySyncButton } from '@/components/admin/retry-sync-button'
import type { NewsletterSubscriberStatus } from '@/lib/types/database'

const STATUS_COLOR: Record<NewsletterSubscriberStatus, string> = {
  active: 'bg-emerald-900/40 text-emerald-400',
  unsubscribed: 'bg-white/5 text-stone-subtle',
  bounced: 'bg-amber-900/40 text-amber-400',
  suppressed: 'bg-crimson-faint text-crimson',
}

async function getSubscribers() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('newsletter_subscribers')
    .select('id, email, first_name, source, status, sendgrid_synced, created_at')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function AdminNewsletterPage() {
  const subscribers = await getSubscribers()
  const provider = process.env.NEWSLETTER_PROVIDER ?? 'supabase'
  const unsyncedCount = subscribers.filter(s => s.status === 'active' && !s.sendgrid_synced).length

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl mb-1">Newsletter subscribers</h1>
          <p className="text-stone-subtle text-sm">{subscribers.length} total</p>
        </div>
        {provider === 'sendgrid' && unsyncedCount > 0 && (
          <RetrySyncButton unsyncedCount={unsyncedCount} />
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Email</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Status</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Source</th>
              {provider === 'sendgrid' && (
                <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">SendGrid</th>
              )}
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Subscribed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {subscribers.map(s => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-stone text-sm">
                  {s.email}
                  {s.first_name && <span className="text-stone-subtle text-xs ml-1.5">({s.first_name})</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status as NewsletterSubscriberStatus]}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-stone-subtle">
                    {s.source ?? 'unknown'}
                  </span>
                </td>
                {provider === 'sendgrid' && (
                  <td className="px-4 py-3 text-xs">
                    {s.sendgrid_synced ? (
                      <span className="text-emerald-400">Synced</span>
                    ) : (
                      <span className="text-stone-subtle">Pending</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-stone-subtle text-xs">
                  {new Date(s.created_at).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-subtle text-sm">
                  No subscribers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
