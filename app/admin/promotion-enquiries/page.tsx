import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { PromotionEnquiryRow } from '@/components/admin/promotion-enquiry-row'
import type { PodcastPromotionEnquiry } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

async function getEnquiries() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('podcast_promotion_enquiries')
    .select('*')
    .order('created_at', { ascending: false })
  return { enquiries: (data ?? []) as PodcastPromotionEnquiry[], error: error?.message ?? null }
}

export default async function AdminPromotionEnquiriesPage() {
  const { enquiries, error } = await getEnquiries()
  const newCount = enquiries.filter(e => e.status === 'new').length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Promotion enquiries</h1>
        <p className="text-stone-subtle text-sm">
          {enquiries.length} total · {newCount} new · from <Link href="/promote-your-podcast" className="underline hover:text-stone">/promote-your-podcast</Link>
        </p>
      </div>

      {error && (
        <div className="card p-4 mb-6 border-amber-900/40 text-amber-400 text-sm">
          Could not load enquiries: {error}. If the table is missing, run
          <code className="mx-1 text-xs">supabase/migrations/012_podcast_promotion_enquiries.sql</code>
          in the Supabase SQL editor.
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Date', 'Name', 'Podcast', 'Interest', 'Status', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {enquiries.map(e => <PromotionEnquiryRow key={e.id} enquiry={e} />)}
            {enquiries.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-subtle text-sm">No enquiries yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
