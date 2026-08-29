import { createAdminClient } from '@/lib/supabase/admin'

async function getSubscribers() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('newsletter_subscribers')
    .select('id, email, source, created_at')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function AdminNewsletterPage() {
  const subscribers = await getSubscribers()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Newsletter subscribers</h1>
        <p className="text-stone-subtle text-sm">{subscribers.length} total</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Email</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Source</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Subscribed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {subscribers.map(s => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-stone text-sm">{s.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-stone-subtle">
                    {s.source ?? 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-subtle text-xs">
                  {new Date(s.created_at).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-stone-subtle text-sm">
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
