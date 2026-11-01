import { createAdminClient } from '@/lib/supabase/admin'
import { reconcileAwaiting } from '@/lib/email/sendgrid-sync'
import { RetrySyncButton } from '@/components/admin/retry-sync-button'
import { DeleteSubscriberButton } from '@/components/admin/delete-subscriber-button'
import type { NewsletterSubscriberStatus } from '@/lib/types/database'

const STATUS_COLOR: Record<NewsletterSubscriberStatus, string> = {
  active: 'bg-emerald-900/40 text-emerald-400',
  unsubscribed: 'bg-white/5 text-stone-subtle',
  bounced: 'bg-amber-900/40 text-amber-400',
  suppressed: 'bg-crimson-faint text-crimson',
}

interface SubscriberRow {
  id: string
  email: string
  first_name: string | null
  source: string | null
  status: NewsletterSubscriberStatus
  sendgrid_synced: boolean
  sync_error?: string | null
  last_sync_attempt?: string | null
  created_at: string
}

async function getSubscribers(): Promise<SubscriberRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('newsletter_subscribers')
    .select('id, email, first_name, source, status, sendgrid_synced, sync_error, last_sync_attempt, created_at')
    .order('created_at', { ascending: false })
  if (!error) return (data ?? []) as SubscriberRow[]

  // Migration 018 (sync_error / last_sync_attempt) not applied yet: show the
  // list without the new columns rather than an empty table.
  console.error('Newsletter subscribers query failed, retrying without sync columns:', error.message)
  const legacy = await admin
    .from('newsletter_subscribers')
    .select('id, email, first_name, source, status, sendgrid_synced, created_at')
    .order('created_at', { ascending: false })
  return (legacy.data ?? []) as SubscriberRow[]
}

function SyncCell({ s }: { s: SubscriberRow }) {
  if (s.sendgrid_synced) return <span className="text-emerald-400">Synced</span>
  if (s.sync_error) {
    return (
      <span title={s.sync_error}>
        <span className="text-amber-400">Sync failed</span>
        <span className="block text-stone-subtle max-w-[16rem] truncate">{s.sync_error}</span>
      </span>
    )
  }
  if (s.last_sync_attempt) {
    return <span className="text-stone-subtle" title="SendGrid accepted the contact; waiting for it to appear in the list">Awaiting SendGrid</span>
  }
  return <span className="text-stone-subtle">Not synced</span>
}

export default async function AdminNewsletterPage() {
  const provider = process.env.NEWSLETTER_PROVIDER ?? 'supabase'
  if (provider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Accepted-but-unseen contacts are confirmed by search, never re-submitted.
    await reconcileAwaiting(createAdminClient()).catch(err => console.error('Reconcile failed:', err))
  }
  const subscribers = await getSubscribers()
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
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
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
                    <SyncCell s={s} />
                  </td>
                )}
                <td className="px-4 py-3 text-stone-subtle text-xs">
                  {new Date(s.created_at).toLocaleDateString('en-GB')}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteSubscriberButton id={s.id} email={s.email} />
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={provider === 'sendgrid' ? 6 : 5} className="px-4 py-8 text-center text-stone-subtle text-sm">
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
