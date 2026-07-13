import { createAdminClient } from '@/lib/supabase/admin'
import { ReviewQueue } from '@/components/admin/review-queue'

async function getPendingReviews() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('reviews')
    .select(`
      *,
      profile:profiles(username),
      podcast:podcasts(title, slug)
    `)
    .eq('approved', false)
    .eq('flagged', false)
    .order('created_at', { ascending: true })
  return data ?? []
}

export default async function AdminReviewsPage() {
  const reviews = await getPendingReviews()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Review moderation</h1>
        <p className="text-stone-subtle text-sm">{reviews.length} pending</p>
      </div>
      <ReviewQueue initialReviews={reviews} />
    </div>
  )
}
