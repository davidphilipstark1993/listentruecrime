import { createAdminClient } from '@/lib/supabase/admin'
import { countActiveSubscribers } from '@/lib/newsletter/broadcast'
import { BroadcastComposer } from '@/components/admin/broadcast-composer'

export default async function BroadcastPage() {
  const admin = createAdminClient()
  const [subscriberCount, { data: history }] = await Promise.all([
    countActiveSubscribers(admin),
    admin.from('broadcasts').select('id, subject, status, recipient_count, error, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <div className="p-8 max-w-3xl">
      <BroadcastComposer subscriberCount={subscriberCount} history={history ?? []} />
    </div>
  )
}
